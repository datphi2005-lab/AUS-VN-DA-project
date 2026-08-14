#!/usr/bin/env python3
"""
Fetch the site's flags and photographs from Wikimedia Commons, and record their
licence and attribution.

Everything downloaded here is either public domain or carries a Creative Commons
licence that permits reuse with attribution. Nothing is hotlinked: files are
copied into assets/img/ so the site works offline, and assets/img/CREDITS.md is
regenerated from the Commons API response rather than typed by hand.

Flags come from Commons' canonical SVGs rather than being redrawn, because a
hand-built Union Jack is easy to get subtly wrong.

Usage:
    python3 scripts/fetch_media.py            # download anything missing
    python3 scripts/fetch_media.py --force    # re-download everything
    python3 scripts/fetch_media.py --check    # verify licences, download nothing
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
UA = "AUS-VN-DA-project/1.0 (student educational project; contact via GitHub)"

# Commons only serves a fixed set of thumbnail widths; anything else 400s.
ALLOWED_WIDTHS = (320, 640, 800, 1024, 1280, 1920, 2560)

# Licences we will accept. Anything else aborts the build rather than shipping
# a file we cannot attribute properly.
ALLOWED = {"cc-by-4.0", "cc-by-sa-4.0", "cc-by-sa-3.0", "cc-by-3.0", "cc-by-2.0", "pd", "cc0"}

MEDIA = [
    # slug, Commons title, target width (None = native SVG), role on the page,
    # and a short subject used in the footer credit line
    ("flag-vietnam",  "File:Flag of Vietnam.svg",   None, "Masthead", "Flag of Vietnam"),
    ("flag-australia", "File:Flag of Australia.svg", None, "Masthead", "Flag of Australia"),
    ("meeting-fm-2024-b",
     "File:Australia-Vietnam Foreign Minister's Meeting - 2024 - 000172786.jpg",
     1280, "Landscape section", "Australia–Vietnam Foreign Ministers' Meeting, 2024"),
    ("asean-summit-2024", "File:ASEAN-Australia Summit 2024.jpg",
     1280, "Hero", "ASEAN–Australia Special Summit, Melbourne, 2024"),
    ("port-haiphong",
     "File:Container Ship at the Hai Phong International Container Terminal 01.jpg",
     1280, "Trade section", "Hai Phong International Container Terminal"),
    ("rmit-vietnam", "File:RMIT University Vietnam - Campus.JPG",
     1280, "People section", "RMIT University Vietnam"),
]


def strip_html(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", str(s or ""))).strip()


def commons_info(titles: list[str]) -> dict:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "titles": "|".join(titles),
        "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": "1600",
    })
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as fh:
        data = json.load(fh)
    out = {}
    for page in data["query"]["pages"].values():
        if "imageinfo" in page:
            out[page["title"]] = page["imageinfo"][0]
    return out


def download(url: str, dest: Path, attempts: int = 5) -> int:
    """Fetch with backoff — Commons rate-limits bursts with HTTP 429."""
    delay = 2.0
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=180) as fh:
                blob = fh.read()
            dest.write_bytes(blob)
            return len(blob)
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 503) or attempt == attempts:
                raise
            print(f"      HTTP {exc.code}, retrying in {delay:.0f}s "
                  f"(attempt {attempt}/{attempts})")
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("unreachable")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    IMG.mkdir(parents=True, exist_ok=True)
    info = commons_info([t for _, t, _, _, _ in MEDIA])

    credits, failures = [], []

    for slug, title, width, role, subject in MEDIA:
        ii = info.get(title)
        if not ii:
            failures.append(f"{title}: not found on Commons")
            continue

        meta = ii.get("extmetadata", {})
        get = lambda k: (meta.get(k, {}) or {}).get("value", "")
        licence_code = str(get("License")).lower().strip()
        licence_name = strip_html(get("LicenseShortName"))
        author = strip_html(get("Artist"))
        desc = strip_html(get("ImageDescription"))

        if licence_code not in ALLOWED:
            failures.append(f"{title}: licence '{licence_code}' not in the allow-list")
            continue

        is_svg = ii.get("mime") == "image/svg+xml"
        ext = ".svg" if is_svg else ".jpg"
        dest = IMG / f"{slug}{ext}"

        if is_svg or width is None:
            src = ii["url"]
        else:
            width = min(ALLOWED_WIDTHS, key=lambda w: abs(w - width))
            src = (ii.get("thumburl") or ii["url"]).split("?")[0]
            if "/thumb/" in src:
                src = re.sub(r"/\d+px-", f"/{width}px-", src)

        if args.check:
            print(f"  ok  {slug:20s} {licence_name:14s} {author[:40]}")
        elif dest.exists() and not args.force:
            print(f"  --  {slug:20s} already present ({dest.stat().st_size:,} bytes)")
        else:
            size = download(src, dest)
            print(f"  ok  {slug:20s} {licence_name:14s} {size:>9,} bytes")
            time.sleep(1.5)   # be a polite Commons client

        credits.append({
            "slug": slug, "file": dest.name, "role": role, "subject": subject, "title": title,
            "licence": licence_name, "licence_code": licence_code,
            "author": author, "description": desc,
            "page": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
        })

    if failures:
        for f in failures:
            print(f"FAIL  {f}", file=sys.stderr)
        return 1

    if not args.check:
        lines = [
            "# Image credits",
            "",
            "Generated by `scripts/fetch_media.py` from the Wikimedia Commons API — not typed by hand.",
            "",
            "Every file below is public domain or Creative Commons licensed for reuse with",
            "attribution. The site carries the same credit in its footer.",
            "",
        ]
        for c in credits:
            lines += [
                f"## {c['file']}",
                "",
                f"- **Used for:** {c['role']}",
                f"- **Licence:** {c['licence']}",
                f"- **Author / credit:** {c['author'] or 'not stated'}",
                f"- **Source:** [{c['title']}]({c['page']})",
            ]
            if c["description"]:
                lines.append(f"- **Description:** {c['description'][:400]}")
            lines.append("")
        (IMG / "CREDITS.md").write_text("\n".join(lines), encoding="utf-8")

        (IMG / "credits.json").write_text(
            json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nwrote {(IMG / 'CREDITS.md').relative_to(ROOT)} and credits.json "
              f"({len(credits)} items)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
