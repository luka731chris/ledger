# Contributing & Development Guide

---

## Development Setup

No build tools required.

```bash
git clone https://github.com/luka731chris/Forge.git
cd Forge
open index.html   # macOS · or double-click in any OS
```

For live reload: `python3 -m http.server 8080` then open `http://localhost:8080`.

---

## Code Organization (index.html)

Functions are grouped under `// ════` comment headers:

```
CONSTANTS & STATE          — DB_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, IMPULSE_CATS, etc.
DEMO DATA GENERATOR        — generateDemoData(), loadDemo()
PERSISTENCE                — saveData(), loadData(), saveSettings(), loadSettings()
FILE HANDLING              — handleFiles(), renderFileList(), processAll(), showImportResults()
QUICKEN PARSERS            — parseCSV(), parseQIF(), parseOFX(), parseDate(), splitCSV()
DETAIL PARSERS             — parseAmazon(), parseAppleCard(), parseGenericDetail(), parseDetailFile()
PURCHASER INTELLIGENCE     — personSummary(), detectPersonTrends(), predictMonthlyDetail(),
                             inferTxnOwner(), getPersonSpend()
HELPERS                    — fmt(), fmtK(), fmtPct(), getRange(), inRange(), getMonthlyData()
INIT APP                   — initApp(), buildSidebar(), populateFilters()
NAVIGATION                 — showPage(), switchTab(), setRange()
DASHBOARD                  — renderDashboard()
INTELLIGENCE ENGINE        — runIntelligence(), detectTrendAlerts(), detectBudgetDrift(),
                             detectAnomalies(), detectSeasonal()
INTELLIGENCE RENDERERS     — renderAlerts(), renderTrends(), renderBudgetDrift(), etc.
CASH FLOW                  — renderCF()
CATEGORIES                 — renderCats()
MERCHANTS                  — renderMch()
DETAIL LENS                — renderAmazon(), renderPurchaserTab(), renderAmzItems(), renderAmzPage()
TRANSACTIONS               — renderTxns(), renderTxnPage()
DRAG + DROP                — event listeners on dz1, dz2
TOAST                      — showToast()
FAMILY REVIEW              — renderFamily(), buildStep1–6(), exportPDF()
SETTINGS                   — renderSettingsPage(), saveSettings(), renderAccountOwnerSection(),
                             renderKidsList(), renderAccountOwnerSection()
LIFE-STAGE                 — buildLifeStageRecommendations()
```

---

## Adding a New Detail File Format

1. Write a parser function following `parseAppleCard()` as a template:
   - Arguments: `(text, fname, purchaser)`
   - Returns: `amzItem[]` — each item must have `date`, `title`, `category`, `price`, `qty`, `total`, `orderId`, `asin`, `source`, `purchaser`
   - `orderId` can be synthetic: `GD-${date}-${title.slice(0,8)}`
   - `purchaser` comes from the argument (set by `processAll` via filename inference)

2. Add detection logic to `sniffFile()` first, then `parseDetailFile()`:
   ```javascript
   // In sniffFile(): add detection signal
   if (firstLine.includes('your-unique-column') || fn.includes('yourservice')) return 'detail';
   
   // In parseDetailFile(): add routing
   if (fname.toLowerCase().includes('yourservice')) return parseYourService(text, fname, purchaser);
   ```

3. Add a test case to `forge_tests.js`

---

## Adding a New Chart Type

To add a chart type to Analytics Studio:

1. Add a button to `#ana-chart-types` in the HTML:
   ```html
   <button class="ana-ct" data-ct="mytype" onclick="setAnaChart('mytype',this)" title="My Chart">⊡</button>
   ```

2. Add the chart config to `chartConfigs` in `renderMainChart()`:
   ```javascript
   mytype: {
     type: 'bar', // or any Chart.js type
     data: { labels: keys, datasets: [{ data: values, ... }] },
     options: { responsive: true, maintainAspectRatio: false, ... }
   }
   ```

3. If it requires special handling (like `heatmap`), add a branch before `renderMainChart()` in `renderAnalytics()`.

---

## Adding a New Dimension

To add a new grouping option to Analytics Studio:

1. Add an `<option>` to `#ana-dim` in the HTML
2. Add the case to `groupByDimension()`:
   ```javascript
   else if (dim === 'myDimension') key = t.someField || 'Unknown';
   ```

---

## Adding a New Pulse Chart

To add a chart to the Pulse Analytics tab:

1. Add a `.p-ana-card` div inside `#pg-analytics` in the HTML with a `<canvas>` element
2. Add a chart variable: `let pMyChart = null;`
3. Add to `destroyPulseAna()`: `try { if(pMyChart) pMyChart.destroy(); } catch(e) {}`
4. Write a `function renderPulseMyChart() {...}` function
5. Call it from `renderPulseAnalytics()`

---

## Adding a New Purchaser Feature

The purchaser data model is simple. Every `amzItem` has:
```javascript
{ ..., source: 'Amazon', purchaser: 'Chris' }
```

And `settings.accountOwners` maps account names to person names:
```javascript
{ "Chase Sapphire (CC)": "Chris", "Apple Card (CC)": "Kira" }
```

To add a new per-person analytic:
1. Filter `amzItems` by `purchaser` using `personSummary()` or direct filter
2. For Quicken transactions, use `inferTxnOwner(txn)` which checks `accountOwners`
3. Surface in the Bullpen via `intelAlerts.push(...)` in `detectTrendAlerts()`
4. Surface in the Recommended Actions via `buildLifeStageRecommendations()`

---

## Testing

```bash
node forge_tests.js       # 149 tests — original parsers, formatters, dedup
node forge_tests_v2.js    # 285 tests — Apple Card, analytics, purchaser, edge cases
node forge_sid_tests.js   # 96 tests  — $id AI layer, context, error handling
# Total: 530 tests · 100% pass rate required before any commit
```

Both must pass at 100% before any commit. The test harness extracts functions from `index.html` at runtime — no separate test build needed.

**Adding a test:**
```javascript
// In forge_tests_v2.js, inside a suite() block:
test('parseAppleCard: handles payment rows', ()=>{
  const result = parseAppleCard(
    'Transaction Date,Merchant,Category,Amount (USD)\n2024-01-15,Autopay,Payment,89.00',
    'test.csv', 'Chris'
  );
  eq(result.length, 0, 'payment rows should be filtered out');
});
```

---

## Deployment

**GitHub Pages** — any push to `main` deploys automatically. Live URL: `luka731chris.github.io/Forge`. Deployment takes 30–90 seconds.

**Cloudflare Worker** — not auto-deployed. After changing `forge_worker.js`:
- Dashboard: dash.cloudflare.com → forge-sid → Edit Code → paste → Deploy
- CLI: `npm install -g wrangler && wrangler login && wrangler deploy`

---

## Common Mistakes

**"Variables cannot be added to a Worker with static assets"**
The `wrangler.jsonc` has an `"assets"` block. Remove it. The `assets` key makes Cloudflare treat the Worker as a static site host, disabling secrets and the `fetch` handler.

**"Purchaser not attributed even with correct filename"**
Check that the family member's first name is in Settings → The Family. Forge compares the filename against `settings.user1`, `settings.user2`, and each `settings.kids[n].name`. If the settings haven't been saved, the name list is empty.

**"New detail format doesn't parse"**
`parseDetailFile()` detects formats by column headers in the first line. If your file's headers don't contain the expected keywords, it falls through to `parseGenericDetail()`. Log `firstLine` in the console and add your column names to the detection logic.

**"Forge shows no data after clearing browser storage"**
`localStorage` is the only data store. Re-import from Quicken using the full-history export workflow. Detail files must be re-imported separately.
