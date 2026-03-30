## [3.4] — 2026-03-29

### Fixed — CSV Import: Blank Columns and All Edge Cases

Complete rewrite of `parseCSV()` to handle every structural variation any CSV-producing application generates.

**Blank column handling (new):**
- Blank header columns (leading, middle, trailing) are now ignored — only named columns are mapped
- Blank payee cell → `Unknown`; blank category cell → `Uncategorized`; blank account cell → filename fallback
- Blank amount cell → row skipped cleanly
- Blank date cell → row skipped cleanly
- Both debit AND credit cells blank → row skipped (was: included as $0 row)
- Quoted blank cells (`""`) → treated as empty
- Whitespace-only cells → treated as empty
- Comma-only rows (`,,,`) → skipped entirely
- Out-of-bounds column access on short rows → safe `get()` helper returns `''` instead of crashing

**Format handling (new):**
- `sep=,` (Excel CSV hint line) now stripped before header detection
- `# comment` and `// comment` lines before the header now stripped
- UTF-8 BOM (`﻿`) stripped from file start AND from first column name
- Semicolon (`;`) and pipe (`|`) delimiters now detected and parsed
- Mixed CRLF + LF line endings now handled
- European decimal format (`1.234,56`) detected and converted
- Amount `N/A`, `--`, word strings → row skipped (was: NaN propagation)
- Repeated header rows mid-file → skipped (date parses as null)
- Extra columns beyond header → safe (extra data ignored)
- Truncated rows (fewer cols than header) → safe (missing cols treated as blank)

**`sniffFile()` improvements:**
- Now skips `sep=`, `#` comments, and BOM before reading the first line for format detection
- Prevents mis-detection when Excel hint lines or metadata precede the actual header

**Test coverage:**
- Suite 26 added: 39 tests covering every blank column and edge case scenario
- Total: 324 tests / 26 suites in `forge_tests_v2.js` (was 285/25)
- Combined suite total: 473 tests across all three test files

---

# Changelog

---

## [3.2] — 2026-03-28

### Added — Analytics Studio

A new **Analytics** page (desktop) and **Analytics** tab (Pulse) add self-service BI reporting.

**Desktop Analytics Studio ($kenes · #30)**

- New nav item between Detail Lens and All Transactions
- Control bar: View By (8 dimensions), Measure (6 metrics), Date Range, Category filter, Account filter
- **8 chart types**, switchable instantly: Bar, Horizontal Bar, Line, Area, Donut, Scatter, Waterfall, Heatmap
- Heatmap renders a month × day-of-week spending grid in pure HTML (no canvas)
- Waterfall chart builds cumulative running totals with floating bars, green/red per direction
- Three auto-computed KPI insight cards (Total, Average, Highest) update with every control change
- **4 always-on secondary charts**: Spending vs Income (12M stacked bar), Top 8 Categories (donut), Avg Spending by Day of Week, Spending by Person (Quicken accounts + detail files combined)
- Collapsible data table with inline proportion bars and share percentages; PNG export
- Dimensions: Month, Category, Account, Purchaser, Source, Day of Week, Quarter, Year
- Metrics: Total Spending, Total Income, Net Savings, Transaction Count, Avg Transaction, Savings Rate %

**Pulse Analytics Tab ($id · #87)**

- New tab between Detail Lens and Ask $id
- 5 mobile-optimized chart cards: Category donut (range chips 3M/6M/1Y/All), Monthly Cash Flow, Spending by Person, Avg by Day of Week, Savings Rate with target reference line
- Purchaser card auto-hides when no attribution is configured
- Lazy-renders on first tab open

### Added — Enhanced Demo Data

The Pittsburgh demo now has 13 accounts and three detail file sources with purchaser attribution:

**New accounts:** `Apple Card - Chris (CC)`, `Apple Card - Kira (CC)`, `Nordstrom Credit Card`

**Detail Lens sources (new):**
- Apple Card - Chris: Starbucks Reserve, Chipotle, Apple One, App Store, Uber, Nike, Shake Shack
- Apple Card - Kira: Peloton, lululemon, Sephora, Disney+, TJ Maxx, Whole Foods (Apple Pay), Athleta, Pilates Studio PGH, Barnes & Noble, Ulta Beauty
- Nordstrom Card (Kira): Eileen Fisher, Free People, Nike shoes, handbags, Clarins, Nordstrom Rack, Sandals, Sephora at Nordstrom, Nordstrom Cafe, Loft — with 2.2× Anniversary Sale spike in July/August

`loadDemo()` now auto-configures `settings.accountOwners` for all 9 attributable accounts.

### Fixed — Bugs identified through exhaustive testing (v3.2 test suite, 285 tests)

**`scoreImpulse`** — Items with `total=0` (empty/malformed objects) were receiving 25 impulse points due to `0 < 15` evaluating true. Fixed by requiring `total > 0` before applying the low-price bonus. This prevented false-positive "High Impulse" badges on structurally empty items.

**`guessType`** — Accounts containing `brokerage` or `roth` were classified as `other` instead of `investment`. Fixed by adding both keywords to the investment detection branch. This affected account type display and investment filtering throughout the app.

**`parseCSV`** — Standalone `debit` and `credit` column headers were not recognized as amount columns. Only `debit/credit` (combined) was handled. Fixed by adding individual `debit` and `credit` to the column detector. This caused Apple Card-style bank exports with separate debit/credit columns to import with $0 amounts.

**`parseAppleCard`** — When `purchaser=null` was passed explicitly, the function fell back to deriving a purchaser name from the filename instead of preserving `null`. Fixed by checking `purchaser !== undefined && purchaser !== null` before applying the filename fallback. This caused all null-attributed Apple Card items to receive a filename-derived owner, breaking the "shared/unattributed" use case.

**`parseGenericDetail`** — Same null-purchaser issue as `parseAppleCard`. Fixed with the same guard.

### Changed

- `showImportResults()`: "Amazon Watchlist" reference updated to "Detail Lens"
- Settings page: remaining "Sid" text references updated to "$id" in HTML
- `showPage('analytics')`: calls `loadSettings()` before `renderAnalytics()` to ensure account owner config is current

---

## [3.1] — 2026-03-28

### Changed — Unified Import Zone

Single drop zone replaces the previous two-zone layout (Quicken left, Amazon right). `sniffFile()` auto-detects format from column headers. All file types drop into one zone.

### Added

- `sniffFile(text, fname)` — content-based format detector; returns `'amazon' | 'applecard' | 'detail' | 'quicken'`
- `fileTypeLabel(type)` — maps detected type to display label and CSS badge class
- File queue cards show detected type badge per file

### Removed

- `dz2` (Amazon-specific drop zone), `fi2` (Amazon file input)
- Two-zone HTML layout and associated Amazon-only instruction card

---

## [3.0] — 2026-03-27

### Added — Purchaser Attribution System

- Filename tagging: include a family member's first name in any detail filename → items attributed to that person
- `settings.accountOwners` map: Quicken account → family member (for render-time Quicken attribution)
- By Purchaser tab in Detail Lens: individual spending cards per person with impulse rate, avg order, projected spend, acceleration warnings, top categories
- Per-person alerts in The Bullpen (`type:'purchaser'`, `👤` icon)
- `personSummary()`, `detectPersonTrends()`, `predictMonthlyDetail()`, `inferTxnOwner()`

### Added — Detail Lens (formerly Amazon Watchlist)

- Multi-format detail file support: `parseAppleCard()`, `parseGenericDetail()`, `parseDetailFile()` router
- `source` and `purchaser` fields on every detail item
- 5 tabs: Overview, By Category, All Items, By Purchaser, vs. Total Spend
- Person + Source filter dropdowns on All Items tab

---

## [2.x] — 2026-01-15 to 2026-03-26

Initial releases, Forge Pulse mobile launch, Confluence family meeting tool, Analytics Studio foundation, 12-week UM Bootcamp tooling. See git history.
