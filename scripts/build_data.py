#!/usr/bin/env python3
"""
Build step for the AUS-VN data analysis project.

Reads the canonical, fully-cited dataset in data/dataset.json, checks it for
internal consistency, derives every headline statistic the website quotes, and
writes assets/data.js so the page runs from file:// without a server.

Nothing on the website is hand-typed: if a number appears in the page, it either
came out of dataset.json or was computed here, and the derivation is visible.

Usage:
    python3 scripts/build_data.py            # build
    python3 scripts/build_data.py --check    # verify only, no write
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "data" / "dataset.json"
OUT_JS = ROOT / "assets" / "data.js"

# Tolerance for float comparisons on A$ million values.
EPS = 0.05


class CheckFailure(Exception):
    pass


def load() -> dict:
    with DATASET.open(encoding="utf-8") as fh:
        return json.load(fh)


# --------------------------------------------------------------------------
# Consistency checks — these are the guardrails that keep the page honest.
# --------------------------------------------------------------------------

def check(data: dict) -> list[str]:
    notes: list[str] = []
    trade = data["trade_2025_abs"]
    head = data["headline"]

    two_way = trade["exports_total"] + trade["imports_total"]
    if abs(two_way - head["two_way_trade_aud_m"]) > EPS:
        raise CheckFailure(
            f"headline two-way trade {head['two_way_trade_aud_m']} != "
            f"exports+imports {two_way}"
        )
    notes.append(f"two-way trade reconciles: {two_way:,.1f} A$m")

    # DFAT's country brief rounds the same total to A$30.0b.
    if abs(round(two_way / 1000, 1) - head["two_way_trade_aud_b_rounded"]) > 0.05:
        raise CheckFailure("rounded two-way trade disagrees with DFAT country brief")
    notes.append("rounds to A$30.0b, matching the DFAT country brief")

    # Top-N line items must never exceed their own total.
    for side in ("exports", "imports"):
        top = sum(r["value"] for r in trade[f"{side}_top"])
        total = trade[f"{side}_total"]
        if top > total + EPS:
            raise CheckFailure(f"{side}: top items {top} exceed total {total}")
        notes.append(f"{side} top-6 = {top:,.1f} of {total:,.1f} A$m ({top/total:.1%})")

    # The 2025 investment stocks must add to the headline two-way figure.
    inv = {row["year"]: row for row in data["investment_stocks"]["series"]}
    latest = inv[max(inv)]
    stock_sum = latest["aus_in_vnm_total"] + latest["vnm_in_aus_total"]
    if abs(stock_sum - head["two_way_investment_aud_m"]) > EPS:
        raise CheckFailure(
            f"two-way investment {head['two_way_investment_aud_m']} != {stock_sum}"
        )
    notes.append(f"two-way investment stock reconciles: {stock_sum:,.0f} A$m")

    # Partner shares must be ordered by rank and bounded.
    for key in ("export_destinations", "import_sources"):
        rows = data["vietnam_partners_2025"][key]
        ranked = [r for r in rows if r["rank"] <= 5]
        if [r["rank"] for r in ranked] != sorted(r["rank"] for r in ranked):
            raise CheckFailure(f"{key}: top-5 ranks out of order")
        if sum(r["share"] for r in rows) > 100:
            raise CheckFailure(f"{key}: shares exceed 100%")
    notes.append("Vietnam partner shares ordered and within bounds")

    # Every source id referenced anywhere must exist in meta.sources.
    known = set(data["meta"]["sources"])
    missing: set[str] = set()

    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if k in ("source", "sources") and isinstance(v, list):
                    missing.update(s for s in v if s not in known)
                else:
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk({k: v for k, v in data.items() if k != "meta"})
    if missing:
        raise CheckFailure(f"unknown source ids referenced: {sorted(missing)}")
    notes.append(f"all source references resolve ({len(known)} sources)")

    return notes


# --------------------------------------------------------------------------
# Derived metrics — every computed number the page displays.
# --------------------------------------------------------------------------

def derive(data: dict) -> dict:
    trade = data["trade_2025_abs"]
    head = data["headline"]
    inv = {row["year"]: row for row in data["investment_stocks"]["series"]}

    exports, imports = trade["exports_total"], trade["imports_total"]
    two_way_trade = exports + imports
    two_way_inv = head["two_way_investment_aud_m"]

    def pick(rows, name):
        return next(r["value"] for r in rows if r["item"] == name)

    coal = pick(trade["exports_top"], "Coal")
    iron = pick(trade["exports_top"], "Iron ores & concentrates")
    alum = pick(trade["exports_top"], "Aluminium")
    wheat = pick(trade["exports_top"], "Wheat")
    cotton = pick(trade["exports_top"], "Cotton")
    edu = pick(trade["exports_top"], "Education-related travel")
    rec = pick(trade["imports_top"], "Recreational travel")

    resources = coal + iron + alum
    agriculture = wheat + cotton
    manufactures = sum(
        r["value"] for r in trade["imports_top"] if r["stage"] == "downstream"
    )

    exports_top6 = sum(r["value"] for r in trade["exports_top"])
    imports_top6 = sum(r["value"] for r in trade["imports_top"])

    a19, a25 = inv[2019]["aus_in_vnm_total"], inv[2025]["aus_in_vnm_total"]
    v19, v25 = inv[2019]["vnm_in_aus_total"], inv[2025]["vnm_in_aus_total"]
    a22, v22 = inv[2022]["aus_in_vnm_total"], inv[2022]["vnm_in_aus_total"]

    eees_baseline = a22 + v22          # A$2.2b, the EEES-era starting point
    eees_target = eees_baseline * 2    # "double two-way investment"

    return {
        # The central finding.
        "trade_to_investment_ratio": round(two_way_trade / two_way_inv, 1),
        "investment_per_dollar_of_trade": round(two_way_inv / two_way_trade, 4),

        # Trade shape.
        "two_way_trade": round(two_way_trade, 1),
        "trade_balance_aus": round(exports - imports, 1),
        "trade_balance_share": round((imports - exports) / two_way_trade * 100, 1),
        "exports_cr6": round(exports_top6 / exports * 100, 1),
        "imports_cr6": round(imports_top6 / imports * 100, 1),
        "resources_share": round(resources / exports * 100, 1),
        "resources_value": round(resources, 1),
        "agriculture_share": round(agriculture / exports * 100, 1),
        "coal_share": round(coal / exports * 100, 1),
        "education_share": round(edu / exports * 100, 1),
        "recreation_share": round(rec / imports * 100, 1),
        "manufactures_share": round(manufactures / imports * 100, 1),
        "manufactures_value": round(manufactures, 1),
        "services_share_of_two_way": round((edu + rec) / two_way_trade * 100, 1),

        # The investment reversal.
        "aus_stock_change_2019_2025": round((a25 / a19 - 1) * 100, 1),
        "vnm_stock_change_2019_2025": round((v25 / v19 - 1) * 100, 1),
        "aus_stock_change_2022_2025": round((a25 / a22 - 1) * 100, 1),
        "vnm_stock_change_2022_2025": round((v25 / v22 - 1) * 100, 1),
        "crossover": v25 > a25,
        "crossover_gap": round(v25 - a25, 1),
        "aus_peak_year": max(inv, key=lambda y: inv[y]["aus_in_vnm_total"]),
        "aus_peak_value": max(r["aus_in_vnm_total"] for r in inv.values()),

        # EEES scorecard.
        "eees_baseline": eees_baseline,
        "eees_target": eees_target,
        "eees_progress_pct": round(two_way_inv / eees_target * 100, 1),
        "eees_shortfall": round(eees_target - two_way_inv, 1),

        # Ledger gap: ABS stock vs Vietnamese registered capital.
        "ledger_ratio": round(
            data["investment_vietnamese_ledger"]["aus_in_vnm_usd_m"] / a25, 2
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify only, do not write")
    args = ap.parse_args()

    data = load()

    try:
        notes = check(data)
    except CheckFailure as exc:
        print(f"FAIL  {exc}", file=sys.stderr)
        return 1

    for note in notes:
        print(f"  ok  {note}")

    derived = derive(data)
    print("\nDerived headline metrics")
    for key in (
        "trade_to_investment_ratio",
        "exports_cr6",
        "imports_cr6",
        "resources_share",
        "aus_stock_change_2019_2025",
        "vnm_stock_change_2022_2025",
        "eees_progress_pct",
        "ledger_ratio",
    ):
        print(f"  {key:<32} {derived[key]}")

    if args.check:
        print("\ncheck only — nothing written")
        return 0

    payload = dict(data)
    payload["derived"] = derived

    # Image attribution, if scripts/fetch_media.py has been run. Generated from
    # the Commons licence metadata, so on-page credits can never drift from it.
    credits_path = ROOT / "assets" / "img" / "credits.json"
    if credits_path.exists():
        with credits_path.open(encoding="utf-8") as fh:
            payload["credits"] = json.load(fh)
        print(f"  ok  bundled {len(payload['credits'])} image credits")
    else:
        payload["credits"] = []
        print("  --  no image credits found (run scripts/fetch_media.py)")

    OUT_JS.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JS.open("w", encoding="utf-8") as fh:
        fh.write("// GENERATED FILE — do not edit.\n")
        fh.write("// Source of truth: data/dataset.json\n")
        fh.write("// Rebuild with: python3 scripts/build_data.py\n")
        fh.write("window.AVDATA = ")
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write(";\n")

    print(f"\nwrote {OUT_JS.relative_to(ROOT)}")

    for line in stamp_assets():
        print(f"  {line}")

    return 0


def stamp_assets() -> list[str]:
    """Append a content hash to the stylesheet and script URLs in index.html.

    GitHub Pages serves assets with a long cache lifetime, so a browser that has
    already loaded styles.css will keep using its copy after a deploy — the new
    markup arrives styled by the old stylesheet, which looks like the change
    simply did not happen. Hashing the URL means a changed file is a new URL and
    the browser has no stale copy to reuse.
    """
    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    notes = []

    for rel in ("assets/styles.css", "assets/app.js", "assets/data.js"):
        path = ROOT / rel
        if not path.exists():
            continue
        digest = hashlib.md5(path.read_bytes()).hexdigest()[:8]
        # Match the path with or without an existing ?v= stamp.
        pattern = re.compile(re.escape(rel) + r'(?:\?v=[0-9a-f]+)?')
        new_html, count = pattern.subn(f"{rel}?v={digest}", html)
        if count:
            html = new_html
            notes.append(f"ok  stamped {rel} ?v={digest} ({count}×)")

    index.write_text(html, encoding="utf-8")
    return notes


if __name__ == "__main__":
    raise SystemExit(main())
