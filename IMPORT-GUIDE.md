# Forge Import Guide

One drop zone. Any file. Forge figures out the rest.

---

## How It Works

Drop any file — Quicken export, Amazon order history, Apple Card statement, or any itemized CSV — onto the single import zone in The Pour. Forge reads the first line of each file to detect what format it is, routes it to the right parser, and processes everything in one pass. You can drop multiple files at once.

| What you drop | How Forge detects it | What it becomes |
|---------------|---------------------|-----------------|
| Quicken CSV | `payee`, `account`, `amount` columns | Ledger transactions |
| Quicken QIF | `.qif` extension | Ledger transactions |
| Quicken QFX / OFX | `.qfx` / `.ofx` extension | Ledger transactions |
| Amazon order history | `asin`, `product name`, or `order id` + `quantity` columns | Detail Lens items |
| Apple Card statement | `clearing date` or `amount (usd)` column | Detail Lens items |
| Any other itemized CSV | Date + description + amount (Forge tries) | Detail Lens items |

Deduplication is automatic across all types. Re-importing any file already in the ledger adds nothing.

---

## Quicken Export — First Time (Full History)

Export everything going back as far as Quicken will allow. The more history Forge has, the more accurate its seasonal patterns, trend baselines, and year-over-year comparisons become. Do this once, then switch to the monthly routine.

### Mac

1. Open Quicken and sign in
2. In the **left sidebar**, click **All Transactions** — shows every account together
3. Clear any date filters so the full history is visible
4. **File → Export → Register Transactions to CSV File**
5. Choose **Export: All visible transactions** · uncheck Scheduled Transactions · **Save**
6. Drop the file in The Pour → **Begin Forging**

### Windows

1. Open Quicken and sign in
2. **Reports → Banking → Transaction**
3. Set **Accounts: All Accounts** · date range from your earliest date through today
4. Run the report
5. Click the **Export icon** (green arrow at top) → **Export to CSV File**
6. Drop the file in The Pour → **Begin Forging**

### Fallback — Account by Account

Export each account individually (gear icon → Export to Excel workbook) and drop all the files at once. Forge merges them automatically.

> ⚠️ **Do not use** *File → Export → Quicken Transfer Format (.qxf)* — that file moves Quicken between computers and cannot be imported here.

---

## Monthly Routine (2–3 Minutes)

Same export path, just change the date range to Last 30–60 days, All Accounts. Then add any detail files for the same period — Amazon orders, Apple Card statement — and drop everything at once. Forge handles the rest.

---

## Detail Files — Line-Item Enrichment

Detail files unmask the lump-sum charges in your Quicken register. "Amazon.com — $147.32" becomes 14 individual line items. "Apple Card — $89.00" becomes the specific merchant. Drop detail files in the same zone as your Quicken export — Forge auto-detects and routes them correctly.

### Amazon Order History

Amazon changed their export in 2023 — you must request the file and wait for an email.

1. On a **desktop browser**, go to amazon.com and sign in (the mobile app cannot do this)
2. **Account & Lists → Account → Manage your data → Request your data**
3. Select **Your Orders** → submit
4. Amazon sends a confirmation email immediately — **click the link to confirm**
5. Wait for a second email with the download link (usually a few hours, up to 24)
6. Download the ZIP file · unzip · open the **Your Orders** folder
7. Use the file named **`Retail.OrderHistory.1.csv`**
8. Drop it in The Pour with your other files

### Apple Card Monthly Statement

1. Open **Wallet** on iPhone
2. Tap **Apple Card**
3. Scroll down · tap any month's statement
4. Tap **Export Transactions** (or the share icon) → saves as CSV
5. Transfer the file to your computer and drop it in The Pour

### Other Sources — Any Itemized CSV

PayPal activity exports, Venmo transaction history, Costco purchase history, store loyalty exports — anything with Date, Description, and Amount columns. Drop it in. If Forge can read it, it will. If it can't, the import result panel tells you exactly what was missing.

---

## Purchaser Attribution — Who Bought What

Include a family member's first name in the filename to attribute every item in that file to that person:

| Filename | Who gets credited |
|----------|------------------|
| `amazon_chris.csv` | Chris |
| `applecard_kira.csv` | Kira |
| `orders_sam.csv` | Sam |
| `amazon.csv` | Unattributed (shared) |

Forge checks the filename against the full family member list from Settings (user1, user2, and every kid). The match is case-insensitive. This works for any file type — Amazon, Apple Card, or generic.

For Quicken accounts, go to **Settings → Account Owners** to map each account to the person who primarily uses it.

Once attribution is configured, the Detail Lens By Purchaser tab shows individual spending cards, impulse rates, monthly projections, and category acceleration warnings per person.

---

## Supported File Formats

### Quicken formats (drop in the unified zone)

| Format | Extension | Notes |
|--------|-----------|-------|
| Comma-separated values | `.csv` | Most reliable |
| Quicken Interchange Format | `.qif` | Also reliable |
| Quicken Financial Exchange | `.qfx` | May export empty in newer Quicken |
| Open Financial Exchange | `.ofx` | Same as QFX |

### Detail Enrichment (also in the same drop zone)

| Format | How Forge detects it |
|--------|---------------------|
| Amazon order history | `asin` column, or `product name` + `order id` + `quantity` columns, or `retail.orderhistory` in filename |
| Apple Card statement | `clearing date` column, or `amount (usd)` column, or `apple`/`applecard` in filename |
| Generic enrichment | Date + description + amount columns — Forge tries; if it reads >0 rows, it worked |

---

## Troubleshooting

### "0 transactions imported" from Quicken

Most common cause: single-account or narrow-date export.

- **Mac:** Click **All Transactions** in the sidebar before exporting, not an individual account
- **Windows:** Use **Reports → Banking → Transaction** with All Accounts selected

### File detected as wrong type

Forge uses column headers to detect format. If a Quicken CSV is being read as a detail file, it likely has column names that overlap with detail file formats. Add the file extension (`.qif`) or use the standard Quicken export path which produces consistent headers.

### "Forge couldn't read line-item detail"

The detail file doesn't have the expected columns. Forge needs: date + description or merchant + amount. Check that the file is a transaction export, not a summary or report.

### Purchaser not attributed

The filename didn't match any family member's name. Check that Settings → The Family has correct first names entered and that the filename contains the first name (case-insensitive): `amazon_Chris.csv` and `amazon_chris.csv` both work.

### "0 items" from Amazon

Use `Retail.OrderHistory.1.csv` from inside the **Your Orders** folder of the ZIP Amazon emailed you. Other files in the ZIP will not parse correctly.

---

## Monthly Checklist

```
□  Export Quicken — last 30–60 days, All Accounts
□  Download Amazon order history (if you want this month's detail)
□  Export Apple Card statement for the month
□  Name detail files with purchaser first names before importing
□  Drop ALL files at once into The Pour
□  Click Begin Forging
□  Open The Confluence with your partner (~35 min)
□  Export PDF Blueprint
```
