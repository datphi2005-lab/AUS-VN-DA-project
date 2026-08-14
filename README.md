# Vietnam – Australia Economic Ties: Facts and Opportunities

Evidence base and interactive site for the Diplomatic Academy of Vietnam × Macquarie University
presentation.

**Le Van Ly · Nguyen Phuong Anh · Nguyen Hoang Dat Phi** — compiled 11 August 2026, statistical base
year 2025.

> **The headline finding.** In 2025 Australia and Vietnam traded **A$30.0bn** of goods and
> services. In the same year Vietnam attracted **US$27.62bn** of realised foreign direct investment
> — its strongest in five years — and **Australia was not among the leading sources**. Singapore,
> China, Hong Kong and Japan took more than two-thirds of newly registered capital between them.
> Australia's entire cumulative registered capital in Vietnam since 1988 is US$1.9bn across 712
> projects, less than Singapore committed in 2025 alone.

---

## What's here

| Path | What it is |
|---|---|
| `index.html` | The interactive site. Open it directly — no build step, no server needed. |
| `data/dataset.json` | **Single source of truth.** Every figure, with a source id attached. |
| `assets/data.js` | Generated from `dataset.json`. Do not edit by hand. |
| `assets/app.js` | Hand-built SVG charts and page logic. No external libraries. |
| `assets/styles.css` | Design system — see *Design* below. |
| `scripts/build_data.py` | Validates the dataset, derives every computed statistic, writes `data.js`. |
| `scripts/make_slide_charts.py` | Renders deck-coloured chart PNGs into `docs/slide-charts/`. |
| `scripts/fetch_media.py` | Downloads the flags and photographs, and generates their credits. |
| `assets/img/` | Flags and photographs, plus `CREDITS.md` — see *Images* below. |
| `docs/slide-charts/` | Slide-ready chart images for the presentation deck. |
| `scripts/build_standalone.py` | Bundles everything into one self-contained HTML file. |
| `dist/` | The self-contained single-file builds. |
| `notebook/` | The earlier exploratory notebook — see the warning below. |

## Running it

```bash
python3 scripts/fetch_media.py && python3 scripts/build_data.py && python3 scripts/make_slide_charts.py
```

Then open `index.html` in a browser. To serve it locally instead:

```bash
python3 -m http.server 8129
```

## How the numbers stay honest

`data/dataset.json` is the only place a figure is written down. `scripts/build_data.py` refuses to
build if any of these fail:

- two-way trade must equal exports plus imports, and must round to the A$30.0bn DFAT publishes;
- the published top-six line items must not exceed their own direction total;
- the 2025 investment stocks must sum to the headline two-way figure;
- Vietnam's partner shares must be rank-ordered and sum to under 100%;
- every `source` id referenced anywhere must resolve to an entry in `meta.sources`.

Derived statistics (concentration ratios, commodity shares, the scorecard) are computed once in
`build_data.py` and reused by both the website and the slide charts, so a figure can never disagree
between the two.

## Design

An editorial data-journalism treatment: **Playfair Display** for display type and **Source Sans 3**
for body, UI and chart labels, set on a 660px reading column with figures breaking out to 900 and
1100px. Ground is white, ink `#171717`, hairlines `#E2E2E2`.

Data colours are `#004F9F` (Australia) and `#DA251D` (Vietnam) against `#C9CDD2` for context.
Checked against the white ground rather than eyeballed: normal-vision ΔE 35.9, worst colour-blind ΔE
21.4, contrast 8.02:1 and 4.93:1. Every chart also carries direct labels, so colour is never the only
channel carrying meaning.

## Images, flags and insignia

**Flags.** The Vietnamese and Australian flags are the canonical public-domain SVGs from Wikimedia
Commons, not redrawn. That matters for the Australian flag in particular: the Union Jack's
counterchanged St Patrick saltire, the seven-pointed Commonwealth Star and the five stars of the
Southern Cross are all geometrically correct rather than approximated.

**Photographs.** All are official or Creative Commons licensed, downloaded and credited by
`scripts/fetch_media.py`, which refuses any file whose licence is not on its allow-list:

| Photo | Author | Licence |
|---|---|---|
| Australia–Vietnam Foreign Ministers' Meeting, 2024 | Sarah Hodges / DFAT | CC BY 4.0 |
| ASEAN–Australia Special Summit, Melbourne 2024 | Government of Indonesia | Public domain |
| Hai Phong International Container Terminal | Nathan.cima | CC BY-SA 4.0 |
| RMIT University Vietnam campus | Prenn | CC BY-SA 3.0 |

Attribution appears as a single credit line in the site footer and in `assets/img/CREDITS.md`, both
generated from the licence metadata rather than typed by hand. The CC BY and CC BY-SA images are
licensed on condition of attribution, so that footer line is a requirement — do not remove it.

**On national emblems.** The site deliberately does *not* display the Commonwealth Coat of Arms or
the National Emblem of Viet Nam. These are protected state insignia, not ordinary logos — the
Australian Government's published guidelines restrict the Coat of Arms to Commonwealth entities and
prohibit uses implying official endorsement, and Viet Nam's emblem is regulated in the same spirit.
Since this page analyses and criticises both governments' economic policy, carrying their insignia
would imply an endorsement that does not exist. National flags carry no such restriction, which is
why they are used instead. The institutional marks appropriate to this work are the Diplomatic
Academy of Vietnam and Macquarie University logos already on the presentation deck.

## Reading the data critically

- **Investment is measured as flows, not stocks.** The analysis uses FDI flows and registered
  capital, which is how both governments discuss investment. A separate ABS balance-of-payments
  series measures the bilateral investment *stock*; it remains in `data/dataset.json` under
  `investment_stocks` and tells a compatible story, but it answers a different question and nothing
  on the site is argued from it.
- **Registered is not realised.** Registered capital is a commitment, not money deployed. Vietnam's
  US$38.42bn registered against US$27.62bn realised shows the gap, and cumulative registration
  totals never net out abandoned projects.
- **Two ledgers disagree, for good reasons.** DFAT/ABS reports A$30.0bn of goods *and services*;
  Vietnam Customs reports about US$14bn of *merchandise*. Services — education and recreational
  travel — are nearly A$5.7bn of the difference, and they flip the sign of the trade balance. On
  investment, ABS measures a net balance-of-payments **stock** (A$921m) while Vietnam's ministry
  counts cumulative **registered capital** since 1988 (US$1.9bn, 712 projects), about 2.06× higher.
- **ABS suppresses some components** for confidentiality, marked `np` in the tables. Where that
  applies the site shows total investment rather than inventing an FDI split.
- **2026 items are contemporaneous reporting**, not audited statistics, and are kept separate from
  the 2025 statistical base.

## ⚠️ About `notebook/`

`notebook/australia_vietnam_trade_analysis.ipynb` is kept for reference only. Its RCA / EXPY /
complementarity analysis runs on **hand-entered, rounded placeholder values**, not sourced data —
`AUS_exports`, `WORLD_exports` and `PRODY` are all illustrative. **Do not cite any number from it.**
The equivalent grounded analysis lives on the website: concentration ratios (CR6) and the
upstream/downstream value-chain split replace the synthetic RCA, and both are computed from the
published DFAT line items.

## Sources

Sources are cited inline beneath every figure on the page, and the full list with URLs lives in
`data/dataset.json` under `meta.sources`. The primary ones:

- DFAT, [Vietnam country economic fact sheet](https://www.dfat.gov.au/sites/default/files/viet-cef.pdf) (ABS/IMF data, 2025) — the core dataset
- DFAT, [Vietnam country brief](https://www.dfat.gov.au/geo/vietnam/vietnam-country-brief)
- DFAT, [Invested: Southeast Asia Economic Strategy to 2040 — Vietnam profile](https://www.dfat.gov.au/sites/default/files/saes-2040-country-profile-action-plan-vietnam.pdf)
- Reserve Bank of Australia, [Monetary Policy Decision, 11 August 2026](https://www.rba.gov.au/media-releases/2026/mr-26-19.html)
- ASEMCONNECT / Vietnam Customs, [Vietnam–Australia trade, 9 months of 2025](https://asemconnectvietnam.gov.vn/default.aspx?ZID1=8&ID8=145164&ID1=2)
- Australian Government, [Vietnam Labour Mobility Arrangement](https://www.palmscheme.gov.au/vietnam-labour-mobility-arrangement)

Statistics are reproduced from Australian and Vietnamese government publications for educational
analysis; all rights in the underlying data remain with their publishers. Analysis and interpretation
are the authors' own and are not endorsed by any government agency.
