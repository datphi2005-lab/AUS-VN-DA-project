#!/usr/bin/env python3
"""
Bundle the multi-file site into single self-contained HTML files.

The published page has to work with no network at all: a strict content-security
policy blocks external stylesheets, fonts and images, and a file emailed to
someone has no sibling assets/ directory to read from. So everything gets pulled
inline — CSS, JavaScript, the generated data, the Poppins webfont and every
image as a data: URI.

Two outputs, from exactly the same content:

    dist/vietnam-australia-economic-ties.html
        A complete, valid HTML document. Open it directly, email it, put it on
        any static host.

    dist/artifact.html
        The same page with the <!doctype>/<html>/<head>/<body> wrapper removed,
        because the artifact host supplies its own skeleton.

Usage:
    python3 scripts/build_standalone.py
"""

from __future__ import annotations

import base64
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# Google serves these as variable fonts, so one file covers the whole weight
# axis — declaring a range rather than a fixed weight avoids shipping the same
# bytes three times.
FONTS = [
    ("playfair-var.woff2",        "Playfair Display", "normal", "400 900"),
    ("playfair-var-italic.woff2", "Playfair Display", "italic", "400 900"),
    ("sourcesans-var.woff2",      "Source Sans 3",    "normal", "200 900"),
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def data_uri(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    if path.suffix.lower() == ".svg":
        mime = "image/svg+xml"
    mime = mime or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def font_face_css() -> str:
    """Inline the two typefaces — the CSP blocks font CDNs, and a linked
    webfont would silently fall back to a system serif."""
    blocks = []
    for filename, family, style, weight in FONTS:
        f = ROOT / "assets" / "fonts" / filename
        if not f.exists():
            print(f"  !!  missing {f.name} — run the font download step first", file=sys.stderr)
            return ""
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        blocks.append(
            f"@font-face{{font-family:'{family}';font-style:{style};"
            f"font-weight:{weight};font-display:swap;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
        )
    return "\n".join(blocks)


def build() -> tuple[str, str]:
    html = read(ROOT / "index.html")
    css = read(ROOT / "assets" / "styles.css")
    data_js = read(ROOT / "assets" / "data.js")
    app_js = read(ROOT / "assets" / "app.js")

    # 1. Drop the external font + stylesheet links; inline both instead.
    html = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", html)
    html = re.sub(r'\s*<link href="https://fonts\.googleapis\.com[^>]*>', "", html)
    html = re.sub(r'\s*<link rel="stylesheet" href="assets/styles\.css">', "", html)

    inline_style = "<style>\n" + font_face_css() + "\n" + css + "\n</style>"
    html = html.replace("</head>", inline_style + "\n</head>")

    # 2. Inline every image referenced from assets/img/.
    used, missing = set(), []

    def swap(match: re.Match) -> str:
        rel = match.group(1)
        path = ROOT / rel
        if not path.exists():
            missing.append(rel)
            return match.group(0)
        used.add(rel)
        return f'src="{data_uri(path)}"'

    html = re.sub(r'src="(assets/img/[^"]+)"', swap, html)
    if missing:
        for m in missing:
            print(f"  !!  missing image {m}", file=sys.stderr)
        raise SystemExit(1)

    # 3. Inline the scripts. Escape any literal </script> inside the JSON blob so
    #    it cannot terminate the tag early.
    scripts = (data_js + "\n" + app_js).replace("</script>", "<\\/script>")
    html = re.sub(
        r'<script src="assets/data\.js"></script>\s*<script src="assets/app\.js"></script>',
        "<script>\n" + scripts + "\n</script>",
        html,
    )

    if "assets/" in re.sub(r'href="https?://[^"]*"', "", html):
        leftovers = set(re.findall(r'(?:src|href)="(assets/[^"]+)"', html))
        if leftovers:
            print(f"  !!  un-inlined references remain: {sorted(leftovers)}", file=sys.stderr)
            raise SystemExit(1)

    # 4. Artifact variant: the host supplies doctype/html/head/body itself.
    body = html
    body = re.sub(r"^.*?<head>", "", body, flags=re.S)
    body = body.replace("</head>", "").replace("<body>", "").replace("</body>", "")
    body = re.sub(r"</html>\s*$", "", body)
    # The icon href is an inline SVG data URI containing '>' characters, so match
    # the quoted attribute rather than "everything up to the next '>'".
    body = re.sub(r'\s*<link rel="icon" href="[^"]*"\s*/?>', "", body)
    body = re.sub(r'\s*<meta (?:charset|name="viewport")[^>]*>', "", body)

    print(f"  ok  inlined {len(used)} images, {len(FONTS)} font files")
    return html, body.strip()


def main() -> int:
    DIST.mkdir(exist_ok=True)
    full, body = build()

    a = DIST / "vietnam-australia-economic-ties.html"
    b = DIST / "artifact.html"
    a.write_text(full, encoding="utf-8")
    b.write_text(body, encoding="utf-8")

    for p in (a, b):
        mb = p.stat().st_size / 1_048_576
        flag = "  (over the 16MB artifact limit!)" if mb > 16 else ""
        print(f"  ok  {p.relative_to(ROOT)}  {mb:.2f} MB{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
