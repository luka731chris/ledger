# Forge v3.2 — Testing Report

**Test run date:** March 2026  
**Total tests:** 530 across three suites  
**Pass rate:** 530/530 (100%)

---

## Test Suites

### Suite A — Core Parser & Logic (`forge_tests.js`)

**149 tests · 14 suites**

| Suite | Tests | Coverage |
|-------|-------|----------|
| parseDate | 18 | ISO, US, European, abbreviated month, day-first, quoted, nulls, garbage |
| splitCSV | 8 | Quoted commas, empty fields, dollar-sign amounts, multi-field |
| parseCSV happy path | 10 | Quicken Mac/Windows formats, income/expense, category, account |
| parseCSV train wrecks | 6 | Empty file, header-only, missing columns, CRLF, BOM |
| parseQIF | 6 | Bank type, date, amount, payee, category, empty |
| parseAmazon | 14 | New 2023 format, legacy format, multi-unit qty, ASIN, empty, zero-filtered |
| parseOFX | 8 | OFX/QFX envelope, DTPOSTED, TRNAMT, FITID |
| Age & Life Stage | 18 | calcAge, calcAgeInYears, all life stages (child through retirement) |
| scoreImpulse | 10 | Empty/null guard, category bonuses, price tiers, qty multiplier, title signals, max cap |
| guessType | 8 | checking, savings, credit, CC, 401k, brokerage, HYSA, unknown |
| Formatters | 13 | fmt, fmtK (K/M), fmtPct, zeros, negatives, NaN |
| Settings & Family | 12 | DEFAULT_SETTINGS schema, kid structure, account owners, sensitivity |
| Deduplication | 8 | Txn key uniqueness, amzItem key with purchaser |
| Real-world edge cases | 10 | 2-digit years, CRLF, BOM, missing Grand Total, undefined fields |

---

### Suite B — v3.2 Exhaustive (`forge_tests_v2.js`)

**285 tests · 25 suites** — Written specifically for v3.2 new features

| Suite | Tests | Coverage |
|-------|-------|----------|
| 1 · parseDate (extended) | 24 | All 8 input formats, leap year, invalid months/days, edge nulls |
| 2 · splitCSV | 8 | Quoted commas, empty fields, 10-field rows, newlines |
| 3 · parseCSV | 13 | Standard format, alt columns (Description/Debit/Credit/Account Name), empty |
| 4 · parseAmazon | 13 | New + legacy formats, title, date, total, qty, ASIN, orderId, zero-filter |
| 5 · parseAppleCard | 14 | Merchant extraction, ISO dates, purchaser attribution, null purchaser, payments filtered, empty |
| 6 · parseGenericDetail | 10 | Standard, PayPal-style, missing columns, zeros, negatives, source from filename |
| 7 · sniffFile | 15 | All 4 output types, filename signals, header signals, empty/whitespace defaults |
| 8 · parseDetailFile | 9 | Amazon routing, Apple Card routing, generic routing, source stamps, purchaser passthrough |
| 9 · scoreImpulse | 11 | Null/empty guards, category bonuses, price tiers, qty multiplier, pack/bundle, cap at 100 |
| 10 · impulseBadge | 9 | All 3 severity bands, lbl/cls structure, boundary values (29, 30, 59, 60) |
| 11 · Age & Life Stage | 21 | calcAge edge cases, all parent/child life stages, null safety, icons/labels |
| 12 · guessType | 8 | All account types including brokerage, roth, HYSA |
| 13 · Formatters | 13 | fmt, fmtK (under/over thresholds), fmtPct signs, NaN safety |
| 14 · getRange / inRange | 8 | 3m/6m/1y/all ranges, recent vs old transactions, end-of-month boundary |
| 15 · groupByDimension | 11 | All 8 dimensions, income/expense tracking, count, empty array, missing fields |
| 16 · computeMetric | 11 | All 6 metrics, zero-count avg, negative net, negative savings rate |
| 17 · personSummary | 10 | Total, item count, topCat, monthlyAvg, impulseRate, dateFrom filter, unknown person |
| 18 · inferTxnOwner | 5 | Mapped/unmapped accounts, empty map, null map, multiple owners |
| 19 · detectPersonTrends | 6 | Spike detection, severity levels, empty data, result structure |
| 20 · predictMonthlyDetail | 7 | Null when empty, result fields, daysLeft, mtdTotal, histAvg, projection |
| 21 · Deduplication | 8 | Txn key uniqueness by all 4 fields, amzItem key with purchaser variants |
| 22 · getSavingsRate / getAnnualNet | 6 | Empty, known rate, overspend scenario |
| 23 · DEFAULT_SETTINGS schema | 21 | All settings keys, correct defaults, kids array structure, Pittsburgh family |
| 24 · parseQIF | 6 | Standard bank type, all record types, empty |
| 25 · Edge cases & regression | 18 | 2-digit years, CRLF, BOM, undefined fields, large numbers, NaN safety |

---

### Suite C — AI / $id Layer (`forge_sid_tests.js`)

**96 tests · 8 suites**

| Suite | Tests | Coverage |
|-------|-------|----------|
| buildSidSystemPrompt | 12 | All 3 modes, family context, savings target, life stage integration |
| buildAlerts | 14 | All alert types, severity levels, purchaser alerts, empty data |
| getKidsContext | 8 | Age calculation, life stage labels, empty kids, null DOB |
| buildContext | 16 | Txn summary, amz summary, purchaser breakdown, source breakdown |
| getSidSetupMessage | 6 | Configured/unconfigured states |
| History management | 10 | Append, truncate at 16, role alternation |
| Error routing | 18 | 401, 429, timeout, network error, generic fallback |
| Welcome message | 12 | With/without data, savings rate, kids context |

---

## Bugs Found and Fixed

Five code defects were identified by the test suite and fixed in the production code:

### BUG-001 · `scoreImpulse` — empty object scores 25 (was: medium severity)
**Symptom:** Calling `scoreImpulse({})` or `scoreImpulse({total:0})` returned 25 instead of 0. Any structurally empty or zero-total item received a "Medium Impulse" badge in Detail Lens.  
**Root cause:** The condition `if(total < 15) s += 25` evaluated true for `total=0` (since `0 < 15`).  
**Fix:** Added `total > 0` guard: `if(total > 0 && total < 15) s += 25`.  
**Impact:** Detail Lens — impulse badges on all items, particularly Apple Card items parsed with empty totals.

### BUG-002 · `guessType` — brokerage accounts classified as `other`
**Symptom:** `guessType('Fidelity Brokerage')` returned `'other'` instead of `'investment'`. Brokerage and Roth accounts appeared in the wrong bucket in account type filtering, the sidebar, and the Analytics account filter.  
**Root cause:** The investment detection pattern checked for `invest`, `401`, `ira` but not `brokerage` or `roth`.  
**Fix:** Added both keywords to the investment branch.  
**Impact:** Account type display, filtering, investment account grouping in analytics.

### BUG-003 · `parseCSV` — standalone `debit`/`credit` columns not detected
**Symptom:** Apple Card-style bank CSV exports with separate `Debit` and `Credit` columns (instead of a single `Amount` column) imported with all amounts as $0.  
**Root cause:** The amount column detector included `debit/credit` (combined) but not standalone `debit` or `credit`.  
**Fix:** Added `'debit'` and `'credit'` to the `col()` lookup list.  
**Impact:** Bank exports and Apple Card CSVs with split debit/credit columns.

### BUG-004 · `parseAppleCard` — `null` purchaser replaced by filename
**Symptom:** Calling `parseAppleCard(csv, 'filename.csv', null)` attributed all items to `'filename'` (derived from the filename) instead of preserving `null`.  
**Root cause:** `const owner = purchaser || fname.replace(...)` — JavaScript's `||` treats `null` as falsy and falls through to the filename fallback.  
**Fix:** Changed to `(purchaser !== undefined && purchaser !== null) ? purchaser : fname.replace(...)`.  
**Impact:** Any caller explicitly passing `null` to indicate "unattributed/shared" would have items incorrectly attributed. Affects the unified import pipeline.

### BUG-005 · `parseGenericDetail` — same null-purchaser issue
**Symptom:** Same as BUG-004, in the generic CSV detail parser.  
**Fix:** Same guard applied.  
**Impact:** Consistent null-purchaser behavior across all detail parsers.

---

## Test Design Notes

**State isolation:** Suites 17, 19, 20 each save and restore the global `amzItems` array to prevent cross-suite contamination. Each suite that modifies global state clears it with `amzItems.length = 0` before planting test data.

**Timing-safe tests:** Date-dependent tests (Suite 22 getSavingsRate, Suite 14 getRange, Suite 20 predictMonthlyDetail) use relative date construction (`new Date()` with month offsets) rather than hardcoded dates. Assertions use `near()` with appropriate tolerances rather than exact equality.

**Edge case philosophy:** Every parser has a corresponding "train wreck" test: empty string, null, whitespace-only, header-only (no data rows), missing required columns, and zero-value rows. All must return `[]` or `null` without throwing.

**Regression anchoring:** The 149 existing tests in `forge_tests.js` serve as a regression baseline. Running all three suites in sequence confirms no regressions from v3.2 additions.

---

## Pulse Mobile — Manual Verification Checklist

The following items were structurally verified in `forge-pulse.html`:

- ✅ All 5 tabs (`snapshot`, `alerts`, `amazon`, `analytics`, `chat`) have matching page divs  
- ✅ `go('analytics')` calls `renderPulseAnalytics()` before returning  
- ✅ `renderPulseAnalytics()` calls all 5 sub-renderers and destroys prior charts first  
- ✅ `pPurchaserRange` and `pCatRange` are scoped module-level (no reset on re-render)  
- ✅ `setPulseRange()` destroys and re-creates only the affected chart  
- ✅ Purchaser card auto-hides when `people.length === 0`  
- ✅ `family.accountOwners` is read from loaded settings (correct storage key)  
- ✅ `destroyPulseAna()` catches and ignores errors from charts that may not exist yet  
- ✅ `renderPulseSavRate()` includes a dashed target reference line  
- ✅ All 5 canvas elements exist in HTML before JS references them  
- ✅ localStorage keys match desktop: `ledger_v3`, `forge_settings_v1`, `ledger_fbr_v2`

---

## Desktop App — Structural Verification

- ✅ 11 page IDs all have matching nav IDs (10 nav items + upload page with no nav)
- ✅ `showPage('analytics')` renders correctly and calls `loadSettings()` first
- ✅ `renderAnalytics()` calls `populateAnaFilters()` which reads live txns data
- ✅ `destroyAnaCharts()` handles null chart instances gracefully
- ✅ `renderHeatmap()` renders pure HTML into `ana-heatmap-wrap` when type is `'heatmap'`
- ✅ All 8 chart types have configs in `renderMainChart()` with no missing keys
- ✅ `exportAnaChart()` uses `toDataURL` — safe in all modern browsers
- ✅ Demo data generates without throwing (tested via module extraction)
- ✅ `loadDemo()` writes to `localStorage` under `SETTINGS_KEY` after setting accountOwners
- ✅ `sniffFile()` returns one of exactly 4 valid strings: `'amazon'`, `'applecard'`, `'detail'`, `'quicken'`
- ✅ `processAll()` calls `sniffFile()` on every file before routing
