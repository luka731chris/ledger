# Forge — Technical Reference

Architecture, data model, parser documentation, purchaser attribution system, and design reference.

---

## Architecture

Forge is a zero-dependency static web application. All logic lives in two HTML files. No build step, no package manager, no transpilation.

```
index.html (286 KB)
├── Embedded CSS (~1,900 lines) — design system, layout, components
└── Embedded JavaScript (~175,000 chars, 130+ functions)
    ├── Constants & state
    ├── Persistence (saveData, loadData, saveSettings, loadSettings)
    ├── File handling (handleFiles, renderFileList, processAll)
    ├── Quicken parsers (parseCSV, parseQIF, parseOFX, parseDate, splitCSV)
    ├── Detail parsers (parseAmazon, parseAppleCard, parseGenericDetail, parseDetailFile)
    ├── Purchaser intelligence (personSummary, detectPersonTrends, predictMonthlyDetail)
    ├── Intelligence engine (runIntelligence, detectTrendAlerts, detectBudgetDrift,
    │                        detectAnomalies, detectSeasonal, buildLifeStageRecommendations)
    ├── Renderers (renderDashboard, renderCF, renderCats, renderMch, renderAmazon,
    │             renderPurchaserTab, renderAmzItems, renderTxns, renderFamily)
    └── Settings (renderSettingsPage, saveSettings, renderAccountOwnerSection)
```

---

## Data Model

### localStorage Keys

| Key | Schema |
|-----|--------|
| `ledger_v3` | `{ txns[], accounts[], amzItems[], isDemoMode, savedAt }` |
| `forge_settings_v1` | `{ familyName, user1, user1Dob, user2, user2Dob, kids[], savingsTarget, emergencyTarget, largePurchaseThreshold, amzSensitivity, detailSensitivity, accountOwners{}, confluenceMode, kidsInAlerts, confluenceAnim, meetingDay, meetingDuration, reportHeader, reportSubtitle, pdfCollege, pdfSavings, categoryBudgets{}, agendaSteps{} }` |
| `ledger_fbr_v2` | `{ goals[], notes{1..6}, stepsDone[], decisions[], plannedPurchases[] }` |

### Transaction Object (Quicken)

```javascript
{
  date:     "2024-03-15",           // ISO 8601
  payee:    "Giant Eagle",           // from Quicken
  amount:   -127.43,                // negative = expense, positive = income
  category: "Groceries",            // from Quicken or "Uncategorized"
  account:  "Chase Sapphire (CC)",  // account name from Quicken file
  memo:     "",                     // optional
  type:     "debit"                 // "debit" | "credit"
}
```

Purchaser attribution for transactions uses `settings.accountOwners` at render time — it's not stored on the transaction itself. This means account ownership can be changed retroactively in Settings without re-importing.

### amzItem Object (Detail Files)

```javascript
{
  date:      "2024-02-10",         // ISO 8601
  title:     "Instant Pot Duo",    // product/merchant name
  category:  "Kitchen",            // department or category
  price:     89.99,                // unit price
  qty:        1,                   // quantity
  total:     89.99,                // price × qty
  orderId:   "D01-XXXXXXXX",       // order ID or synthetic key
  asin:      "B00FLYWNYQ",         // ASIN if Amazon; empty string otherwise
  source:    "Amazon",             // "Amazon" | "Apple Card" | filename-derived
  purchaser: "Kira",               // family member name, or null if unattributed
}
```

The `purchaser` and `source` fields are the key additions enabling per-person analytics. They are populated at import time and persisted in `ledger_v3`.

### accountOwners Map (Settings)

```javascript
settings.accountOwners = {
  "Chase Sapphire (CC)": "Chris",
  "Apple Card (CC)":     "Kira",
  "PNC Business Checking": "Chris",
  // Accounts not listed are treated as shared/unassigned
}
```

---

## Demo Data

`generateDemoData()` generates 4 years of synthetic Pittsburgh-family financial data:

**Quicken Accounts (13):**
- Chase Checking, Chase Savings, Marcus Savings (HYSA) — banking
- Chase Sapphire (CC), Amex Blue Cash (CC), Citi Double Cash (CC) — credit
- Apple Card - Chris (CC), Apple Card - Kira (CC) — individual Apple Cards
- Nordstrom Credit Card — Kira's clothing/beauty card
- Fidelity 401k, Fidelity Brokerage — investments
- PNC Business Checking, PayPal — business/other

**Detail File Sources (3):**
- `Apple Card` (purchaser: Chris) — mobile pay, dining, streaming, app purchases
- `Apple Card` (purchaser: Kira) — fitness, clothing, beauty, grocery Apple Pay
- `Nordstrom Card` (purchaser: Kira) — clothing, footwear, beauty, dining; July/August Anniversary Sale spike

**Account Owners auto-configured on loadDemo():**

```javascript
settings.accountOwners = {
  'Chase Sapphire (CC)':     'Chris',
  'Apple Card - Chris (CC)': 'Chris',
  'Citi Double Cash (CC)':   'Chris',
  'PNC Business Checking':   'Chris',
  'Amex Blue Cash (CC)':     'Kira',
  'Apple Card - Kira (CC)':  'Kira',
  'Nordstrom Credit Card':   'Kira',
  'Fidelity 401k':           'Chris',
  'Fidelity Brokerage':      'Chris',
};
```

---

## Known Fixes Applied in v3.3

| Function | Bug | Fix |
|----------|-----|-----|
| `scoreImpulse` | `total=0` was triggering low-price bonus (+25 pts) | Added `total > 0` guard before price tier check |
| `guessType` | `'brokerage'` and `'roth'` returned `'other'` | Added to investment detection pattern |
| `parseCSV` | Standalone `Debit` column not recognized | Added `'debit'` and `'credit'` to amount column detector |
| `parseAppleCard` | `null` purchaser overwritten by filename fallback | Explicit `null` now preserved; fallback only for `undefined` |
| `parseGenericDetail` | Same null-purchaser issue | Same fix applied |

---

## v3.3 Bug Fixes

The following bugs were identified by the exhaustive test suite (forge_tests_v2.js) and fixed:

### `scoreImpulse(item)`
**Before:** `if (total < 15) s += 25` — items with `total=0` (empty objects, malformed rows) received a 25-point low-price bonus.
**After:** `if (total > 0 && total < 15) s += 25` — requires a positive total.

### `guessType(name)`
**Before:** Only recognized `invest`, `401`, `ira` as investment signals.
**After:** Also recognizes `brokerage` and `roth`.

```javascript
// Before
if (n.includes('invest') || n.includes('401') || n.includes('ira')) return 'investment';
// After
if (n.includes('invest') || n.includes('401') || n.includes('ira') || n.includes('brokerage') || n.includes('roth')) return 'investment';
```

### `parseCSV(text, fname)`
**Before:** Amount column detection did not include standalone `debit` or `credit` columns.
**After:** Both added to the `col()` call for amount detection, enabling Apple Card bank-format CSVs to import correctly.

### `parseAppleCard(text, fname, purchaser)` and `parseGenericDetail(text, fname, purchaser)`
**Before:** `const owner = purchaser || fname.replace(...)` — when `purchaser=null` was passed explicitly, the `||` short-circuit replaced it with the filename-derived label.
**After:** `const owner = (purchaser !== undefined && purchaser !== null) ? purchaser : fname.replace(...)` — explicit `null` is now preserved, preventing false attribution.

---

## Bug Fix History (v3.2)

Five defects were found by the v3.2 test suite and corrected in the production code:

| Function | Issue | Fix |
|----------|-------|-----|
| `scoreImpulse` | `total=0` triggered low-price bonus (25 pts), so empty objects scored Medium Impulse | Added `total > 0` guard before the `< 15` branch |
| `guessType` | `brokerage` and `roth` matched `other` instead of `investment` | Added both keywords to the investment detection condition |
| `parseCSV` | Standalone `debit`/`credit` column headers not recognized as amount columns | Added `'debit'` and `'credit'` to `col()` lookup list |
| `parseAppleCard` | `null` purchaser was replaced by filename-derived label via JS `||` operator | Changed to explicit `!== null && !== undefined` guard |
| `parseGenericDetail` | Same null-purchaser issue as `parseAppleCard` | Same fix applied |

---

## Parser Reference

### `parseAmazon(text)`

Supports both Amazon Privacy Central format (2023+) and legacy Order History Reports format (pre-2023). Auto-detects by checking column headers.

**New format columns:** `Order ID`, `Order Date`, `Product Name`, `Quantity`, `Purchase Price Per Unit`, `Grand Total`, `ASIN/ISBN`, `Department`

**Legacy format columns:** `Order Date`, `Order ID`, `Title`, `Category`, `ASIN`, `Quantity`, `Item Total`

Returns `amzItem[]`. Note: `source` and `purchaser` are NOT set by `parseAmazon` directly — they are added by `parseDetailFile` which wraps it.

### `parseAppleCard(text, fname, purchaser)`

Parses Apple Card monthly statement CSV exported from the Wallet app.

**Detected by:** `clearing date` column, `amount (usd)` column, or `apple`/`applecard` in filename.

**Column detection:**
- Date: `transaction date`, `clearing date`, `date`
- Payee: `merchant`, `description`, `payee`
- Amount: `amount (usd)`, `amount`
- Category: `category`, `type`

Automatically skips payments, autopay, credits, and refund rows. Returns `amzItem[]` with `source: 'Apple Card'` and `purchaser` set from the argument.

### `parseGenericDetail(text, fname, purchaser)`

Catches any enrichment CSV not matched by the other parsers. Looks for standard financial column names.

**Date:** `date`, `transaction date`, `order date`, `purchase date`, `posted date`

**Description:** `description`, `merchant`, `name`, `payee`, `title`, `item`, `memo`

**Amount:** `amount`, `total`, `price`, `charge`, `debit`, `cost`, `amount usd`

Sets `source` from the filename (stripped of extension and underscores). Returns `amzItem[]`.

### `parseDetailFile(text, fname, purchaser)`

**The router.** Takes any enrichment CSV and sends it to the right parser:

1. Check for Amazon signals → `parseAmazon()` + stamp `source: 'Amazon'` + `purchaser`
2. Check for Apple Card signals → `parseAppleCard()`
3. Fall back → `parseGenericDetail()`

This is what `processAll()` calls for all files dropped on the right (detail) zone.

### `parseCSV(text, fname)`

Multi-format Quicken CSV parser. Handles comma and tab delimiters, quoted fields, and all common Quicken column naming variants.

**Flexible column matching** — accepted column names:

| Field | Accepted names |
|-------|---------------|
| Date | `date`, `transaction date`, `trans date`, `posted date`, `post date`, `value date` |
| Payee | `payee`, `description`, `merchant`, `name`, `memo`, `narrative`, `details` |
| Amount | `amount`, `transaction amount`, `value`, `debit/credit`, `net amount`, `withdrawal`, `deposit` |
| Category | `category`, `type`, `transaction type`, `class` |
| Account | `account`, `account name`, `account number` |

---

## Purchaser Attribution System

### At Import Time (Detail Files)

`processAll()` infers the purchaser from the filename before calling `parseDetailFile()`:

```javascript
const allPeople = [settings.user1, settings.user2, ...settings.kids.map(k=>k.name)];
allPeople.forEach(p => {
  if (fname.toLowerCase().includes(p.toLowerCase())) purchaser = p;
});
```

The purchaser is passed into `parseDetailFile()` and stamped on every item in the file.

**Deduplication key includes purchaser:** `date|title|orderId|purchaser` — so the same item can exist for different purchasers (e.g. if Chris and Kira both bought the same item on the same day from separate accounts).

### At Render Time (Quicken Transactions)

Quicken transactions are attributed using the `accountOwners` map at render time:

```javascript
function inferTxnOwner(txn) {
  if (!settings.accountOwners) return null;
  return settings.accountOwners[txn.account] || null;
}
```

This is intentionally kept at render time (not stored on the transaction) so ownership can be updated retroactively without re-importing.

### Per-Person Analytics Functions

**`personSummary(personName, dateFrom)`**
Returns `{ name, total, items, topCat, impulseRate, avgOrder, monthlyAvg, categories[] }` for a given person's detail purchases.

**`detectPersonTrends()`**
Compares last 3 months vs. prior 3 months per person, at both total and category level. Returns `{ person, cat, pct, cur, prv, sev }[]`.

**`predictMonthlyDetail(personName)`**
Projects current month's detail spend to end-of-month for a given person. Returns `{ projected, histAvg, mtdTotal, daysLeft }`.

**`inferTxnOwner(txn)`**
Returns the owner of a Quicken transaction based on the accountOwners map, or null if unassigned.

---

## Intelligence Engine

### detectTrendAlerts() — Enhanced

Now runs three passes:

1. **Shared account trends** — 3M vs. prior 3M by category across all transactions (original behavior)
2. **Per-person Quicken trends** — for each person in `accountOwners`, computes their account-level trend and alerts if >35%
3. **Per-person detail trends** — calls `detectPersonTrends()` and pushes per-person + per-category alerts with the person named in the title

All purchaser alerts have `type: 'purchaser'` and `icon: '👤'` for visual distinction in the Bullpen.

### buildLifeStageRecommendations() — Enhanced

In addition to age-based recommendations, now includes:

- Per-person predictive warning if anyone is on pace for their highest detail spend month (>130% of historical average)
- Per-person impulse rate warning if any attributed purchaser is above 40% impulse rate
- Platform-level warning if detail imports represent >15% of monthly spending

---

## Detail Lens Page (renderAmazon)

The Detail Lens page now has five tabs:

| Tab | What it shows |
|-----|--------------|
| Overview | Monthly detail spend bar chart + category donut (all sources combined) |
| By Category | Spend bar + impulse score bar (horizontal) + category table |
| All Items | Searchable/filterable table with purchaser badge, source badge, impulse badge; filters for Person and Source added |
| By Purchaser | Per-person cards with total, impulse rate, avg order, projected spend, acceleration warnings, category breakdown |
| vs. Total Spend | Detail lens as % of all spending, stacked bar, percent line chart |

### renderPurchaserTab()

The By Purchaser tab renders a card per attributed person using `personSummary()` and `predictMonthlyDetail()`. Each card shows:
- Total spend and share of all detail spend
- Monthly avg, impulse rate, average order
- Projected this-month spend vs. historical (highlighted if >130% of avg)
- Acceleration warning (from `detectPersonTrends()`) if any category is up >40%
- Top 5 categories ranked by spend

If no purchaser data exists, the tab renders an instructional empty state explaining the filename tagging convention.

---

## Settings — Account Owners

### renderAccountOwnerSection()

Dynamically renders one row per account with a dropdown populated from the family member list (user1, user2, kids). The current `accountOwners` value is pre-selected. Only renders if `accounts.length > 0`.

### saveSettings() Update

Reads `.acct-owner-select` elements and writes to `settings.accountOwners`. Accounts not explicitly set to a person are excluded from the map (treated as shared).

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--void` | `#080808` | Deepest background |
| `--base` | `#0E0E0E` | Primary background |
| `--lift` | `#151515` | Raised surfaces |
| `--float` | `#1C1C1C` | Cards, panels |
| `--gold` | `#F5A800` | Brand primary |
| `--positive` | `#2DD4BF` | Positive values (teal) |
| `--negative` | `#F87171` | Negative values |
| `--river` | `#60A5FA` | Purchaser badges, secondary accent |
| `--purple` | `#A78BFA` | Source badges (Apple Card, non-Amazon) |
| `--ink` | `#F2EFE9` | Primary text (warm white) |

### Typography

| Token | Stack | Purpose |
|-------|-------|---------|
| `--font-d` | Cormorant Garamond → Playfair Display → Georgia | Display |
| `--font-ui` | DM Sans → Inter → system-ui | UI text |
| `--font-m` | Fira Code → JetBrains Mono → monospace | Dates, numbers |

---

## Deduplication Keys

| Data type | Dedup key |
|-----------|-----------|
| Quicken transactions | `date\|payee\|amount\|account` |
| Detail items | `date\|title\|orderId\|purchaser` |

The purchaser is part of the detail dedup key so the same item can be attributed to different people without being deduplicated against each other.

---

## External Dependencies

| Dependency | Version | Source | Usage |
|-----------|---------|--------|-------|
| Chart.js | 4.4.1 | cdnjs CDN | All 16 charts |
| Cormorant Garamond | — | Google Fonts | Display typography |
| DM Sans | — | Google Fonts | UI typography |
| Fira Code | — | Google Fonts | Monospace typography |

No npm, no webpack, no framework. Works offline except for CDN resources.

---

## Analytics Studio

### Architecture

The Analytics page is a single `renderAnalytics()` call that orchestrates five sub-renderers. All computation happens client-side in the browser using existing `txns` and `amzItems` data.

**Control flow:**
1. User changes any control → `renderAnalytics()` fires
2. `getAnaFiltered()` applies date range, category, and account filters to `txns`
3. `groupByDimension(txns, dim)` groups the filtered data by the selected dimension
4. `computeMetric(group, metric)` extracts the requested metric value per group
5. `renderMainChart()` switches on `anaChartType` and constructs the Chart.js config
6. Four secondary mini charts render independently with fixed configurations
7. `renderAnaTable()` renders if `anaTableVisible` is true

### Chart Types

| Type | Implementation | Notes |
|------|---------------|-------|
| Bar | Chart.js `bar`, vertical | Default; color per bar |
| Horizontal Bar | Chart.js `bar`, `indexAxis:'y'` | Sorted descending |
| Line | Chart.js `line`, tension 0.35 | Gold accent color |
| Area | Chart.js `line`, fill:true | River blue fill |
| Donut | Chart.js `doughnut`, cutout 58% | Legend right |
| Scatter | Chart.js `scatter`, index as x | Tooltip maps x→label |
| Waterfall | Chart.js `bar`, floating `[start,end]` pairs | Green/red per direction |
| Heatmap | Pure HTML table | Month × day-of-week grid, gold opacity scale |

### State Variables

```javascript
let anaChartType = 'bar';          // current chart type
let anaChart = null;               // primary Chart.js instance
let anaMiniStackChart = null;      // secondary: income vs spending
let anaMiniDonutChart = null;      // secondary: top categories
let anaMiniDowChart = null;        // secondary: day of week
let anaMiniPurchaserChart = null;  // secondary: by person
let anaTableVisible = false;       // data table open/closed
let anaDataCache = null;           // {keys, values, metric, dim} for table
```

---

## Test Suites

Three test suites cover all parser, analytics, and AI logic. Run with Node.js — no browser required.

```bash
node forge_tests.js       # 149 tests — parsers, formatters, dedup (original suite)
node forge_tests_v2.js    # 285 tests — Apple Card, analytics, purchaser, edge cases
node forge_sid_tests.js   # 96 tests  — $id AI layer, context, alerts, error routing
# Total: 530 tests
```

### Test framework

Micro-framework defined inside each test file: `suite(name)`, `test(name, fn)`, `assert(cond, msg)`, `eq(a, b, msg)`, `near(a, b, tol)`, `gt(a, b)`, `gte(a, b)`, `isArr(v)`, `hasKeys(obj, keys)`, `noThrow(fn)`, `throws(fn)`.

### forge_module.js (auto-generated)

The test harness requires functions extracted from `forge.html` into `forge_module.js`. Rebuild whenever `forge.html` changes:

```javascript
// Extract functions from forge.html and write to forge_module.js
// Run: node forge_docs_v2.js  (this also rebuilds Word docs)
// Or run the Python extraction script in forge_tests.js comments
```

The extractor uses a depth-counting parser to find function boundaries and a top-level guard to avoid extracting `const` declarations from inside function bodies.

---

## Wrangler Configuration

```jsonc
{
  "name": "forge-sid",
  "main": "forge_worker.js",
  "compatibility_date": "2025-09-27",
  "compatibility_flags": ["nodejs_compat"]
}
```

No `assets` block — its presence disables the Worker's `fetch` handler and prevents secrets from being accessible.
