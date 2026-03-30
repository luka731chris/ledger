# ⚡ Forge — Family Finance Intelligence Platform

> *Pittsburgh · Black & Gold · Built to last.*

A personal finance platform for families who want real clarity — not another subscription, not another bank login, not another app that knows more about your money than you do. Forge reads directly from Quicken exports, unmasks lump-sum charges into line-item detail, identifies individual family members behind shared accounts, and puts two Pittsburgh aces to work on your data.

**Live app:** [luka731chris.github.io/Forge](https://luka731chris.github.io/Forge/)

---

## The Pittsburgh Platform

| | File | Personality |
|-|------|-------------|
| ⚾ | `index.html` — **Forge Desktop** | **$kenes · #30** · reads the scouting report |
| 🏒 | `forge-pulse.html` — **Forge Pulse** (mobile PWA) | **$id · #87** · reads the play |
| ⚙️ | `forge_worker.js` — Cloudflare Worker | Secure API proxy for $id |
| ⚙️ | `wrangler.jsonc` — Worker config | |

---

## The Core Problem Forge Solves

Your Quicken register shows **"Amazon.com — $147.32"**. That tells you nothing. Was it Chris buying electronics? Kira buying skincare? Sam buying a game? You genuinely don't know, and Quicken doesn't either.

Forge solves this in two ways:

**1. Detail Lens — Line-Item Enrichment**
Drop a detail file (Amazon order history, Apple Card statement, or any itemized CSV) onto The Pour alongside your Quicken export. Forge automatically detects the format, parses it into individual line items, and builds a parallel intelligence layer — impulse scoring, category trends, repeat purchase detection, and per-person spending profiles.

**2. Purchaser Attribution — Who Bought What**
Tag a file with a family member's name (`amazon_chris.csv`, `applecard_kira.csv`) and Forge attributes every item in that file to that person. Map Quicken accounts to family members in Settings and Forge does the same for transaction-level data. The result: individual spending profiles, per-person alerts, predictive monthly projections, and Confluence conversations that name the actual person.

---

## Features

### Forge Desktop — $kenes

**Analytics Studio — Self-Service BI** *(v3.2)*
- 8 chart types: Bar, Horizontal Bar, Line, Area, Donut, Scatter, Waterfall, Heatmap
- 8 dimensions × 6 metrics — slice any way, update instantly
- 4 secondary mini-charts always visible; data table; PNG export
- Pulse: 5 mobile chart cards with range chips

**The Pour — Import Pipeline**
- **Single unified drop zone** — accepts any file type in one place; Forge auto-detects each file's format from its column headers
- Quicken: `.csv`, `.qif`, `.qfx`, `.ofx` — routed to the ledger parser
- Amazon order history, Apple Card statement, or any itemized CSV — auto-detected and routed to the Detail Lens parser
- Drop multiple files at once (Quicken + Amazon + Apple Card all together) — processed in one pass
- **Purchaser inference:** include a family member's first name in any filename (e.g. `amazon_chris.csv`, `applecard_kira.csv`) — Forge attributes every item to that person regardless of file type
- Rich file cards show detected type (Quicken · Amazon · Apple Card · Detail) per file
- Automatic deduplication across all types and sources
- Per-file progress bar, clear controls, inline result panel with plain-English feedback

**The Gauge — Dashboard**
- KPI cards: total expenses, income, net savings, savings rate
- Monthly cash flow chart, category donut, top merchants, top categories
- 3M / 6M / 1Y / All time range controls

**The Bullpen — Intelligence Engine**
- Five detection algorithms, now with per-person awareness:
  - **Trend Alerts** — 3M vs. prior 3M acceleration; per-person Quicken account trends; per-person detail file trends — each alert names the individual
  - **Budget Drift** — current month projected to end-of-month vs. 12-month average
  - **Anomaly Detection** — statistical outliers >2σ with histogram
  - **Seasonal Patterns** — multi-year monthly heatmap
  - **Recommended Actions** — per-person predictive recommendations: "Chris is on pace for record detail spend this month," "Kira's impulse rate is 44% — worth discussing"
- Ghosted mound silhouette watermark: 6'6" pitcher, #30, mustache

**Detail Lens — Line-Item Intelligence** 
- Five tabs: Overview, By Category, All Items, **By Purchaser**, vs. Total Spend
- **By Purchaser tab** — individual spending cards for every attributed family member:
  - Total spend, items, impulse rate, average order, monthly average
  - Projected end-of-month spend vs. historical average
  - Per-person acceleration warnings ("Kira's Beauty spending up 82% vs prior quarter")
  - Top category breakdown per person
- All Items tab — purchaser badge and source badge on every row; filter by person, source, category, or flag
- Overview, Category, and Compare tabs unchanged (source-agnostic aggregates)
- No-data state explains the filename tagging convention

**The Confluence — Monthly Family Review**
- 6-step agenda, now surfacing per-person insights
- $id context includes purchaser breakdown for targeted discussion
- Close-out: *"⚾ #30 reads the scouting report · 🏒 #87 reads the play"*

**Settings — Account Owners**
- New section: map each Quicken account to a family member
- Once mapped, Forge attributes transactions to individuals for per-person Quicken analytics
- Works in combination with detail file purchaser tagging for full coverage

### Forge Pulse — $id

Four tabs: **The Gauge**, **Furnace**, **Detail Lens**, **Ask $id**

- **Detail Lens tab** — per-purchaser chips show each person's detail spend and this-month total above the item list
- **Furnace alerts** — per-person impulse warnings ("Chris: 3 impulse purchases this month — $94 total") and predictive spend projections
- **$id context** includes purchaser breakdown, Quicken account owners, and source breakdown so Ask $id can answer "How much is Kira spending on Beauty?" accurately

### $id — AI Financial Intelligence

- Full per-person context per query: purchaser breakdown from detail files + Quicken account owners
- Three communication modes: data-first, story-first (partner detected), Confluence (meeting context)
- Knows who bought what and can surface individual patterns when asked
- Tagline: *"Precise. Decisive. Always sees the play first. #87"*

---

## Getting Started

### First import — one drop zone, every file type

Drop everything into the single import zone on The Pour. Forge reads the first line of each file and routes it automatically — Quicken transactions to the ledger, Amazon/Apple Card/any itemized CSV to the Detail Lens.

**Quicken export (Mac):** Click **All Transactions** in the sidebar → **File → Export → Register Transactions to CSV File** → All visible transactions → Save

**Quicken export (Windows):** **Reports → Banking → Transaction** → All Accounts → full date range → **Export icon** → **Export to CSV File**

**Amazon order history:** Request at amazon.com → Account & Lists → Account → Manage your data → Request your data → Your Orders. Wait for the download email, unzip, find `Retail.OrderHistory.1.csv`.

**Apple Card:** Wallet app → Apple Card → scroll to the month → tap Export → saves as CSV.

**Purchaser tagging:** Name the file with the person's first name before dropping it: `amazon_chris.csv`, `applecard_kira.csv`. Forge detects the name and attributes all items.

> ⚠️ Do not use *File → Export → Quicken Transfer Format (.qxf)* — that file moves Quicken between computers and cannot be imported.

---

## Setting Up Account Owners

1. Import your Quicken data first (accounts are created automatically)
2. Go to **Settings → Account Owners**
3. Assign each account to the family member who primarily uses it
4. Click **Save Changes**

From that point, The Bullpen will surface per-person Quicken trends and $id will know which person is responsible for which accounts.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  GitHub Pages                                            │
│                                                          │
│  index.html                  forge-pulse.html            │
│  Forge Desktop               Forge Pulse PWA             │
│  $kenes · #30                $id · #87                   │
│       │                           │                      │
│       └────── localStorage ───────┘                      │
│    ledger_v3 · forge_settings_v1 · ledger_fbr_v2        │
│    (txns with account owners · amzItems with purchaser)  │
└───────────────────────────┬──────────────────────────────┘
                            │ Ask $id only
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Cloudflare Worker — forge-sid.*.workers.dev             │
│  CORS proxy · model locked · per-person context injected │
└──────────────────────────────────────────────────────────┘
```

---

## File Reference

| File | Size | Description |
|------|------|-------------|
| `index.html` | 286 KB | Forge Desktop — complete single-file app |
| `forge-pulse.html` | 61 KB | Forge Pulse — mobile PWA |
| `forge_worker.js` | 2.2 KB | Cloudflare Worker — $id proxy |
| `wrangler.jsonc` | — | Worker configuration |
| `README.md` | — | This file |
| `IMPORT-GUIDE.md` | — | Quicken + Detail file import, purchaser tagging |
| `SID-SETUP.md` | — | Cloudflare Worker and API key setup |
| `TESTING.md` | — | Test suite documentation, bug fix log, suite index |
| `TECHNICAL.md` | — | Architecture, data model, parser reference |
| `CONTRIBUTING.md` | — | Dev setup, testing, deployment |
| `CHANGELOG.md` | — | Version history |

---

## localStorage Schema

| Key | Contents |
|-----|---------|
| `ledger_v3` | Transactions, accounts, amzItems (with `purchaser` and `source` fields), demo flag |
| `forge_settings_v1` | Family profile, targets, $id prefs, **accountOwners map**, detailSensitivity |
| `ledger_fbr_v2` | Confluence state: goals, notes, decisions |

---

## Tech Stack

Vanilla JS · Chart.js 4.4.1 · Cormorant Garamond / DM Sans / Fira Code (Google Fonts) · GitHub Pages · Cloudflare Workers · Claude claude-sonnet-4-20250514 · Browser `localStorage`

No npm. No build step. No framework. No server. Open `index.html` and it works.

---

## Testing

```bash
node forge_tests.js       # 434 tests across 39 suites — parsers, formatters, dedup
node forge_tests_v2.js    # 434 tests (285 new + 149 original) — Apple Card, analytics, purchaser, edge cases
node forge_sid_tests.js   # 96 tests  — $id AI layer
# 530 total · 100% pass rate
```

All three suites must pass before pushing any update. The test harness extracts functions from `forge.html` into `forge_module.js` — run any extraction script after changing `forge.html`.

---

## Privacy

No data leaves your device except $id chat queries. No analytics. No tracking. No accounts. No cookies. The Cloudflare Worker receives only the conversation context per query — nothing is stored server-side.

---

## License

Private — all rights reserved. **Chris Luka** · Pittsburgh, PA · [@luka731chris](https://github.com/luka731chris)
