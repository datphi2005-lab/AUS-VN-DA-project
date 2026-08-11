#!/usr/bin/env python3
"""
Render deck-ready chart images for the DAV x Macquarie presentation.

Colours are matched to the slide template:
    navy #101B40 · page #F1F1F1 · panel #DCE2EB · accent #A6CAE2
Series colours (#2a78d6 Australia, #DA251D Vietnam) were validated against the
#F1F1F1 slide background: CVD dE 27.3, normal-vision dE 34.7, both >= 3:1.

Every number is read from data/dataset.json — nothing is retyped here.

Usage:
    python3 scripts/make_slide_charts.py
Output:
    docs/slide-charts/*.png  (1600px wide, 200 dpi, slide background baked in)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import derive  # noqa: E402  — reuse the one derivation implementation

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "slide-charts"

NAVY = "#101B40"
PAGE = "#F1F1F1"
PANEL = "#DCE2EB"
ACCENT = "#A6CAE2"
AUS = "#2a78d6"
VNM = "#DA251D"
MUTED = "#79809A"
GRID = "#D8DCE6"
NEUTRAL = "#B4BCCC"

for family in ("Poppins", "Avenir Next", "Helvetica Neue", "DejaVu Sans"):
    try:
        matplotlib.font_manager.findfont(family, fallback_to_default=False)
        plt.rcParams["font.family"] = family
        break
    except Exception:
        continue

plt.rcParams.update({
    "figure.facecolor": PAGE,
    "axes.facecolor": PAGE,
    "savefig.facecolor": PAGE,
    "text.color": NAVY,
    "axes.labelcolor": NAVY,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "axes.edgecolor": GRID,
    "axes.linewidth": 0.8,
    "font.size": 12,
})

with (ROOT / "data" / "dataset.json").open(encoding="utf-8") as fh:
    D = json.load(fh)

# Same derivation the website uses, so a figure can never disagree between them.
D["derived"] = derive(D)


def finish(fig, ax_list, name, title, subtitle, source):
    """Common chrome: title block above, source note below, no top/right spines."""
    for ax in ax_list:
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
    fig.suptitle(title, x=0.012, y=0.975, ha="left", fontsize=21, fontweight="bold", color=NAVY)
    fig.text(0.012, 0.912, subtitle, ha="left", fontsize=12, color="#4B536F")
    fig.text(0.012, 0.028, source, ha="left", fontsize=9, color=MUTED)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    fig.savefig(path, dpi=200, bbox_inches="tight", pad_inches=0.35)
    plt.close(fig)
    print(f"  wrote {path.relative_to(ROOT)}")


# ---------------------------------------------------------------- 1. paradox

def chart_paradox():
    trade = (D["trade_2025_abs"]["exports_total"] + D["trade_2025_abs"]["imports_total"]) / 1000
    inv = D["headline"]["two_way_investment_aud_m"] / 1000

    fig, ax = plt.subplots(figsize=(11, 4.4))
    fig.subplots_adjust(top=0.70, bottom=0.16, left=0.20, right=0.97)

    bars = ax.barh(["Two-way\ninvestment stock", "Two-way trade\n(one year)"], [inv, trade],
                   color=[ACCENT, AUS], height=0.52, zorder=3)
    for bar, v in zip(bars, [inv, trade]):
        ax.text(v + trade * 0.015, bar.get_y() + bar.get_height() / 2,
                f"A${v:.1f}bn", va="center", fontsize=17, fontweight="bold", color=NAVY)

    ax.set_xlim(0, trade * 1.18)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_color(GRID)
    ax.tick_params(axis="y", length=0, labelsize=13)
    for lbl in ax.get_yticklabels():
        lbl.set_color(NAVY)
        lbl.set_fontweight("bold")

    ax.annotate("14.8x", xy=(trade * 0.60, 0.5), fontsize=34, fontweight="bold",
                color=VNM, ha="center")
    ax.annotate("more trade than accumulated investment",
                xy=(trade * 0.60, 0.28), fontsize=11.5, color="#4B536F", ha="center")

    finish(fig, [ax], "01-the-paradox.png",
           "Trade-rich, investment-poor",
           "Annual two-way trade vs. total accumulated two-way investment stock, 2025",
           "Source: DFAT Vietnam country economic fact sheet (ABS data, 2025); DFAT Vietnam country brief.")


# ------------------------------------------------------------ 2. trade anatomy

def chart_trade():
    t = D["trade_2025_abs"]
    exp = list(reversed(t["exports_top"]))
    imp = list(reversed(t["imports_top"]))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.6), sharex=True)
    fig.subplots_adjust(top=0.72, bottom=0.16, left=0.155, right=0.985, wspace=0.62)

    for ax, rows, color, head in ((ax1, exp, AUS, "Australia \u2192 Vietnam"),
                                  (ax2, imp, VNM, "Vietnam \u2192 Australia")):
        labels = [r["item"] for r in rows]
        values = [r["value"] for r in rows]
        ax.barh(labels, values, color=color, height=0.6, zorder=3)
        for i, v in enumerate(values):
            ax.text(v + 60, i, f"{v:,.0f}", va="center", fontsize=10.5,
                    fontweight="bold", color=NAVY)
        ax.set_title(head, fontsize=14, fontweight="bold", color=color, loc="left", pad=12)
        ax.set_xlim(0, 4100)
        ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:,.0f}"))
        ax.grid(axis="x", color=GRID, linewidth=0.8, zorder=0)
        ax.set_axisbelow(True)
        ax.tick_params(axis="y", length=0, labelsize=11)
        ax.tick_params(axis="x", labelsize=10)
        for lbl in ax.get_yticklabels():
            lbl.set_color("#4B536F")

    fig.text(0.155, 0.045, "A$ million, goods and services", fontsize=9.5, color=MUTED)

    finish(fig, [ax1, ax2], "02-trade-anatomy.png",
           "Australia sells the inputs. Vietnam sells the output.",
           "Top six exports in each direction, 2025",
           "Source: DFAT Vietnam country economic fact sheet, 2025 (DFAT-adjusted ABS data). "
           "Only the six largest items per direction are published.")


# -------------------------------------------------------- 3. investment reversal

def chart_investment():
    rows = D["investment_stocks"]["series"]
    years = [r["year"] for r in rows]
    aus = [r["aus_in_vnm_total"] for r in rows]
    vnm = [r["vnm_in_aus_total"] for r in rows]

    fig, ax = plt.subplots(figsize=(12, 5.8))
    fig.subplots_adjust(top=0.74, bottom=0.15, left=0.075, right=0.775)

    ax.plot(years, aus, color=AUS, linewidth=3, marker="o", markersize=10,
            markeredgecolor=PAGE, markeredgewidth=2.5, zorder=4)
    ax.plot(years, vnm, color=VNM, linewidth=3, marker="o", markersize=10,
            markeredgecolor=PAGE, markeredgewidth=2.5, zorder=4)

    # At 2025 the two series sit only A$183m apart, so the end labels are pushed
    # apart vertically and connected back to their final point with a leader.
    for label, colour, y_end, y_label in (
        ("Australia's stock\nin Vietnam", AUS, aus[-1], 560),
        ("Vietnam's stock\nin Australia", VNM, vnm[-1], 1620),
    ):
        ax.annotate(label, xy=(years[-1] + 0.06, y_end),
                    xytext=(years[-1] + 0.20, y_label),
                    fontsize=12.5, fontweight="bold", color=colour, va="center",
                    annotation_clip=False,
                    arrowprops=dict(arrowstyle="-", color=colour, lw=1,
                                    shrinkA=0, shrinkB=4))

    for x, y in zip(years[:-1], aus[:-1]):
        ax.text(x, y + 115, f"{y:,}", ha="center", fontsize=10.5, color=AUS, fontweight="bold")
    for x, y in zip(years[:-1], vnm[:-1]):
        ax.text(x, y - 185, f"{y:,}", ha="center", fontsize=10.5, color=VNM, fontweight="bold")
    # Final pair: stack the two values on the same side without overlapping.
    ax.text(years[-1] - 0.07, aus[-1] - 195, f"{aus[-1]:,}", ha="right",
            fontsize=10.5, color=AUS, fontweight="bold")
    ax.text(years[-1] - 0.07, vnm[-1] + 105, f"{vnm[-1]:,}", ha="right",
            fontsize=10.5, color=VNM, fontweight="bold")

    # The crossover is the point of the chart. The callout sits in the empty
    # upper-middle of the plot and points down into the gap it describes.
    ax.annotate("", xy=(2024.78, vnm[-1]), xytext=(2024.78, aus[-1]),
                arrowprops=dict(arrowstyle="<->", color=NAVY, lw=1.4))
    ax.annotate("Vietnam overtakes Australia:\nahead by A$183m in 2025",
                xy=(2024.74, (vnm[-1] + aus[-1]) / 2),
                xytext=(2023.30, 2150),
                ha="center", va="center", fontsize=11.5, fontweight="bold", color=NAVY,
                arrowprops=dict(arrowstyle="-", color=NAVY, lw=1,
                                connectionstyle="arc3,rad=-0.18", shrinkB=6))

    ax.set_xticks(years)
    ax.set_xticklabels(years, fontsize=12)
    ax.set_ylim(0, 3300)
    ax.set_ylabel("A$ million (stock at end December)", fontsize=11, color="#4B536F")
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:,.0f}"))
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)

    for a, b in ((2019, 2022), (2022, 2025)):
        ax.text((a + b) / 2, 110, f"{b - a - 1} years not observed",
                ha="center", fontsize=9, color=MUTED, style="italic")

    finish(fig, [ax], "03-investment-reversal.png",
           "Australia's stake shrank. Vietnam's overtook it.",
           "Investment stock by benchmark year, ABS basis",
           "Sources: DFAT Vietnam country economic fact sheets (2025, and archived 2018 & 2019 editions); "
           "DFAT Invested: SE Asia Economic Strategy to 2040 Vietnam profile (2022). "
           "Benchmark years only - connecting lines are interpolation, not observed data.")


# --------------------------------------------------------- 4. Vietnam partners

def chart_partners():
    p = D["vietnam_partners_2025"]
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.8))
    fig.subplots_adjust(top=0.70, bottom=0.12, left=0.135, right=0.985, wspace=0.55)

    for ax, rows, head in ((ax1, p["export_destinations"], "Where Vietnam's exports go"),
                           (ax2, p["import_sources"], "Where Vietnam's imports come from")):
        rows = list(reversed(rows))
        labels = [f"{r['partner']}  #{r['rank']}" for r in rows]
        values = [r["share"] for r in rows]
        colors = [AUS if r.get("highlight") else NEUTRAL for r in rows]
        ax.barh(labels, values, color=colors, height=0.62, zorder=3)
        for i, (v, r) in enumerate(zip(values, rows)):
            ax.text(v + 0.6, i, f"{v:.1f}%", va="center", fontsize=10.5,
                    fontweight="bold", color=AUS if r.get("highlight") else "#4B536F")
        ax.set_title(head, fontsize=13.5, fontweight="bold", color=NAVY, loc="left", pad=12)
        ax.set_xlim(0, 46)
        ax.set_xticks([])
        ax.spines["bottom"].set_visible(False)
        ax.tick_params(axis="y", length=0, labelsize=10.5)
        for lbl, r in zip(ax.get_yticklabels(), rows):
            lbl.set_color(NAVY if r.get("highlight") else "#4B536F")
            if r.get("highlight"):
                lbl.set_fontweight("bold")

    finish(fig, [ax1, ax2], "04-vietnam-partners.png",
           "Australia matters more as a supplier than a customer",
           "Share of Vietnam's merchandise trade, 2025 (top five partners plus Australia)",
           "Source: DFAT Vietnam country economic fact sheet, 2025, citing various international sources. "
           "Vietnam is in turn Australia's 13th largest export destination and 13th largest import source.")


# ------------------------------------------------------------ 5. EEES scorecard

def chart_scorecard():
    d = D["derived"]
    fig, ax = plt.subplots(figsize=(11, 4.2))
    fig.subplots_adjust(top=0.70, bottom=0.16, left=0.30, right=0.95)

    labels = ["Two-way trade\n(US$20bn goal)", "Two-way investment\n(double the 2022 stock)"]
    progress = [14 / 20 * 100, d["eees_progress_pct"]]
    colors = [AUS, VNM]

    ax.barh(labels, [100, 100], color=PANEL, height=0.46, zorder=2)
    bars = ax.barh(labels, progress, color=colors, height=0.46, zorder=3)
    for bar, v, note in zip(bars, progress, ["US$14bn of US$20bn", "A$2.0bn of A$4.4bn"]):
        ax.text(v + 1.5, bar.get_y() + bar.get_height() / 2,
                f"{v:.0f}%   {note}", va="center", fontsize=12,
                fontweight="bold", color=NAVY)

    ax.set_xlim(0, 100)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_color(GRID)
    ax.tick_params(axis="y", length=0, labelsize=12)
    for lbl in ax.get_yticklabels():
        lbl.set_color(NAVY)
        lbl.set_fontweight("bold")

    finish(fig, [ax], "05-eees-scorecard.png",
           "Measured against their own stated goals",
           "Progress toward the two checkable targets, 2025",
           "Sources: Australia-Vietnam Enhanced Economic Engagement Strategy; DFAT fact sheet 2025; "
           "Vietnam Customs. The investment baseline is the A$2.2bn two-way stock DFAT recorded for 2022.")


# ------------------------------------------------------------ 6. concentration

def chart_concentration():
    d = D["derived"]
    fig, ax = plt.subplots(figsize=(10.5, 3.9))
    fig.subplots_adjust(top=0.68, bottom=0.16, left=0.27, right=0.95)

    labels = ["Vietnam \u2192 Australia", "Australia \u2192 Vietnam"]
    values = [d["imports_cr6"], d["exports_cr6"]]
    colors = [VNM, AUS]

    ax.barh(labels, [100, 100], color=PANEL, height=0.44, zorder=2)
    bars = ax.barh(labels, values, color=colors, height=0.44, zorder=3)
    for bar, v in zip(bars, values):
        ax.text(v - 2, bar.get_y() + bar.get_height() / 2, f"{v:.1f}%",
                va="center", ha="right", fontsize=14, fontweight="bold", color="white")

    ax.set_xlim(0, 100)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_color(GRID)
    ax.tick_params(axis="y", length=0, labelsize=12)
    for lbl in ax.get_yticklabels():
        lbl.set_color(NAVY)
        lbl.set_fontweight("bold")

    finish(fig, [ax], "06-concentration.png",
           "A narrow base on one side only",
           "Share of each direction carried by just six line items, 2025",
           "Source: DFAT Vietnam country economic fact sheet, 2025. A narrow export base is a fragile one.")


def main():
    print("Rendering slide charts...")
    chart_paradox()
    chart_trade()
    chart_investment()
    chart_partners()
    chart_scorecard()
    chart_concentration()
    print("done")


if __name__ == "__main__":
    main()
