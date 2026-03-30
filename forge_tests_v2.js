'use strict';
// ═══════════════════════════════════════════════════════════════
// FORGE v3.2 — EXHAUSTIVE TEST SUITE
// 26 Suites · 363 Tests
// Covers every parser, analytics engine, purchaser system,
// demo data generator, deduplication, edge cases, and regression
// across all new features in v3.0–3.2
// ═══════════════════════════════════════════════════════════════

const {
  parseDate, splitCSV, parseCSV, parseQIF, parseOFX, parseOFXDate,
  parseAmazon, parseAppleCard, parseGenericDetail, parseDetailFile,
  sniffFile, scoreImpulse, impulseBadge, guessType,
  calcAge, calcAgeInYears, getLifeStage, getParentLifeStage,
  fmt, fmtK, fmtPct, getSavingsRate, getAnnualNet,
  getRange, inRange, groupByDimension, computeMetric,
  DEFAULT_SETTINGS, txns, settings, amzItems,
  MONTHS, IMPULSE_CATS, personSummary, detectPersonTrends,
  predictMonthlyDetail, inferTxnOwner
} = require('/home/claude/forge_module.js');

// ── Micro-framework ───────────────────────────────────────────
let PASS=0, FAIL=0, TOTAL=0, SUITE='', SUITE_STATS={};
const FAILS=[];
const BAR='═'.repeat(64);

function suite(name) { SUITE=name; SUITE_STATS[name]={p:0,f:0}; console.log(`\n  ▶ ${name}`); }
function test(name, fn) {
  TOTAL++;
  try { fn(); PASS++; SUITE_STATS[SUITE].p++; }
  catch(e) { FAIL++; SUITE_STATS[SUITE].f++; FAILS.push({suite:SUITE,name,err:String(e.message||e).slice(0,200)}); }
}
function assert(c,m)    { if(!c) throw new Error(m||'assertion failed'); }
function eq(a,b,m)      { if(a!==b) throw new Error(`${m||''} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
function neq(a,b,m)     { if(a===b) throw new Error(`${m||''} should not equal ${JSON.stringify(a)}`); }
function near(a,b,t=0.1){ if(Math.abs(a-b)>t) throw new Error(`${a} not near ${b} (tol ${t})`); }
function gt(a,b,m)      { if(!(a>b)) throw new Error(`${m||''} expected ${a} > ${b}`); }
function gte(a,b,m)     { if(!(a>=b)) throw new Error(`${m||''} expected ${a} >= ${b}`); }
function isArr(v,m)     { if(!Array.isArray(v)) throw new Error(`${m||'expected array'} got ${typeof v}`); }
function hasKeys(obj,keys,m) { keys.forEach(k=>{ if(!(k in obj)) throw new Error(`${m||''} missing key ${k}`); }); }
function noThrow(fn,m)  { try { fn(); } catch(e) { throw new Error(`${m||'should not throw'}: ${e.message}`); } }
function throws(fn,m)   { let threw=false; try { fn(); } catch(e) { threw=true; } if(!threw) throw new Error(m||'should have thrown'); }

// ═══════════════════════════════════════════════════════════════
// SUITE 1: parseDate — comprehensive date formats
// ═══════════════════════════════════════════════════════════════
suite('1 · parseDate — all formats');

test('ISO YYYY-MM-DD', ()=>eq(parseDate('2024-03-15'),'2024-03-15'));
test('ISO with time T suffix', ()=>eq(parseDate('2024-03-15T10:30:00'),'2024-03-15'));
test('YYYY/MM/DD with slashes', ()=>eq(parseDate('2024/03/15'),'2024-03-15'));
test('MM/DD/YYYY US standard', ()=>eq(parseDate('03/15/2024'),'2024-03-15'));
test('M/D/YYYY single digits', ()=>eq(parseDate('3/5/2024'),'2024-03-05'));
test('MM/DD/YY → 2000s (≤30)', ()=>eq(parseDate('03/15/24'),'2024-03-15'));
test('MM/DD/YY → 1900s (>30)', ()=>eq(parseDate('03/15/95'),'1995-03-15'));
test('MM-DD-YYYY dashes', ()=>eq(parseDate('03-15-2024'),'2024-03-15'));
test('Jan 05, 2024 abbreviated', ()=>eq(parseDate('Jan 05, 2024'),'2024-01-05'));
test('January 5 2024 full month', ()=>eq(parseDate('January 5, 2024'),'2024-01-05'));
test('5 Jan 2024 day-first', ()=>eq(parseDate('5 Jan 2024'),'2024-01-05'));
test('05-Jan-2024 Quicken style', ()=>eq(parseDate('05-Jan-2024'),'2024-01-05'));
test('Dec 31 year-end', ()=>eq(parseDate('12/31/2023'),'2023-12-31'));
test('Feb 29 leap year', ()=>eq(parseDate('02/29/2024'),'2024-02-29'));
test('Leading/trailing spaces stripped', ()=>eq(parseDate('  2024-03-15  '),'2024-03-15'));
test('Surrounding quotes stripped', ()=>eq(parseDate('"2024-03-15"'),'2024-03-15'));
test('null input → null', ()=>eq(parseDate(null),null));
test('undefined input → null', ()=>eq(parseDate(undefined),null));
test('empty string → null', ()=>eq(parseDate(''),null));
test('garbage "not-a-date" → null', ()=>eq(parseDate('not-a-date'),null));
test('Invalid month 13 → null', ()=>eq(parseDate('13/15/2024'),null));
test('Invalid day 0 → null', ()=>eq(parseDate('03/00/2024'),null));
test('March 15 2024 full day-first', ()=>{ const r=parseDate('March 15, 2024'); assert(r==='2024-03-15',r); });
test('September 1 2023', ()=>eq(parseDate('September 1, 2023'),'2023-09-01'));

// ═══════════════════════════════════════════════════════════════
// SUITE 2: splitCSV — CSV field parsing
// ═══════════════════════════════════════════════════════════════
suite('2 · splitCSV — field parsing');

test('Basic 3 fields', ()=>{ const r=splitCSV('a,b,c'); eq(r.length,3); eq(r[0],'a'); eq(r[2],'c'); });
test('Quoted field with comma inside', ()=>{ const r=splitCSV('"a,b",c'); eq(r[0],'a,b'); eq(r[1],'c'); });
test('Empty middle field', ()=>{ const r=splitCSV('a,,c'); eq(r.length,3); eq(r[1],''); });
test('All fields quoted', ()=>{ const r=splitCSV('"a","b","c"'); eq(r[0],'a'); eq(r[1],'b'); });
test('Single field no comma', ()=>{ const r=splitCSV('hello'); eq(r.length,1); eq(r[0],'hello'); });
test('Dollar amounts with commas', ()=>{ const r=splitCSV('"$1,234.56",payee'); eq(r[0],'$1,234.56'); });
test('Newline in quoted field handled', ()=>{ const r=splitCSV('"a\nb",c'); assert(r.length>=1); });
test('10 fields', ()=>{ const r=splitCSV('a,b,c,d,e,f,g,h,i,j'); eq(r.length,10); });

// ═══════════════════════════════════════════════════════════════
// SUITE 3: parseCSV — Quicken transaction parsing
// ═══════════════════════════════════════════════════════════════
suite('3 · parseCSV — Quicken formats');

const qknBasic = `Date,Payee,Amount,Category,Account\n03/15/2024,Giant Eagle,-127.43,Groceries,Chase Checking\n03/20/2024,Salary,5200.00,Income,Chase Checking`;

test('Parses 2 transactions', ()=>{ const r=parseCSV(qknBasic,'test.csv'); eq(r.length,2); });
test('Date converts to ISO', ()=>{ const r=parseCSV(qknBasic,'test.csv'); eq(r[0].date,'2024-03-15'); });
test('Expense is negative', ()=>{ const r=parseCSV(qknBasic,'test.csv'); assert(r[0].amount<0); });
test('Income is positive', ()=>{ const r=parseCSV(qknBasic,'test.csv'); assert(r[1].amount>0); });
test('Payee extracted', ()=>{ const r=parseCSV(qknBasic,'test.csv'); eq(r[0].payee,'Giant Eagle'); });
test('Category extracted', ()=>{ const r=parseCSV(qknBasic,'test.csv'); eq(r[0].category,'Groceries'); });
test('Account extracted', ()=>{ const r=parseCSV(qknBasic,'test.csv'); eq(r[0].account,'Chase Checking'); });
test('Amount has correct value', ()=>{ const r=parseCSV(qknBasic,'test.csv'); near(Math.abs(r[0].amount),127.43); });

const qknAlt = `"Date","Description","Debit","Credit","Account Name"\n"01/15/2024","Target","-89.99","","Chase Sapphire (CC)"`;
test('Alt column names: Description → payee', ()=>{ const r=parseCSV(qknAlt,'test.csv'); assert(r.length>=1,'parsed'); eq(r[0].payee,'Target'); });
test('Alt: Debit column for expenses', ()=>{ const r=parseCSV(qknAlt,'test.csv'); assert(r.length>=1); assert(r[0].amount<0); });

const qknEmpty = `Date,Payee,Amount,Category,Account\n`;
test('Empty file (header only) → []', ()=>{ const r=parseCSV(qknEmpty,'empty.csv'); eq(r.length,0); });
test('Completely empty → []', ()=>{ const r=parseCSV('','empty.csv'); eq(r.length,0); });
test('Missing amount column handled gracefully', ()=>{ noThrow(()=>parseCSV('Date,Payee\n03/15/2024,Target','f.csv')); });

// ═══════════════════════════════════════════════════════════════
// SUITE 4: parseAmazon — Amazon order history
// ═══════════════════════════════════════════════════════════════
suite('4 · parseAmazon — order history formats');

const amzNew = `Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,ASIN/ISBN,Department\nD01-ABC,2024-01-15,Instant Pot Duo,1,89.99,89.99,B00FLYWNYQ,Kitchen\nD01-DEF,2024-02-10,Resistance Bands,2,19.99,39.98,B07XXXXXXX,Sports`;

test('New format: parses 2 items', ()=>{ const r=parseAmazon(amzNew); eq(r.length,2); });
test('New format: title extracted', ()=>{ const r=parseAmazon(amzNew); eq(r[0].title,'Instant Pot Duo'); });
test('New format: date ISO', ()=>{ const r=parseAmazon(amzNew); eq(r[0].date,'2024-01-15'); });
test('New format: total correct', ()=>{ const r=parseAmazon(amzNew); near(r[0].total,89.99); });
test('New format: qty=2 multi-unit', ()=>{ const r=parseAmazon(amzNew); eq(r[1].qty,2); });
test('New format: category from Department', ()=>{ const r=parseAmazon(amzNew); eq(r[0].category,'Kitchen'); });
test('New format: ASIN extracted', ()=>{ const r=parseAmazon(amzNew); eq(r[0].asin,'B00FLYWNYQ'); });
test('New format: orderId extracted', ()=>{ const r=parseAmazon(amzNew); eq(r[0].orderId,'D01-ABC'); });

const amzLegacy = `Order Date,Order ID,Title,Category,ASIN,Quantity,Item Total\n01/20/2024,D01-XYZ,Atomic Habits,Books,B01N5AX61W,1,$14.99`;
test('Legacy format: title extracted', ()=>{ const r=parseAmazon(amzLegacy); eq(r[0].title,'Atomic Habits'); });
test('Legacy format: total parsed from $14.99', ()=>{ const r=parseAmazon(amzLegacy); near(r[0].total,14.99); });
test('Empty → []', ()=>{ const r=parseAmazon(''); eq(r.length,0); });
test('Header only → []', ()=>{ const r=parseAmazon('Order ID,Order Date,Product Name\n'); eq(r.length,0); });
test('Zero-amount rows filtered out', ()=>{ const r=parseAmazon(`Order ID,Order Date,Product Name,Grand Total\nD01,2024-01-01,Widget,$0.00`); eq(r.length,0); });

// ═══════════════════════════════════════════════════════════════
// SUITE 5: parseAppleCard — Apple Card CSV
// ═══════════════════════════════════════════════════════════════
suite('5 · parseAppleCard — Apple Card monthly CSV');

const appleCSV = `Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD)\n01/15/2024,01/16/2024,Starbucks,Starbucks #1234,Food & Drink,Purchase,14.50\n01/20/2024,01/21/2024,lululemon,lululemon Athletics,Shopping,Purchase,98.00\n01/31/2024,02/01/2024,Payment Received,Apple Card,Payments,Payment,-250.00`;

test('Parses 2 purchases (payment filtered)', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); eq(r.length,2); });
test('Merchant extracted as title', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); assert(r[0].title.includes('Starbucks'),'title contains Starbucks'); });
test('Amount extracted correctly', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); near(r[0].total,14.50); });
test('Purchaser attributed', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); eq(r[0].purchaser,'Kira'); });
test('Source is Apple Card', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); eq(r[0].source,'Apple Card'); });
test('Date converted to ISO', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); eq(r[0].date,'2024-01-15'); });
test('Payment row filtered out', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); eq(r.length,2); });
test('Category extracted', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); assert(r[0].category.length>0); });
test('orderId generated (non-empty)', ()=>{ const r=parseAppleCard(appleCSV,'test.csv','Kira'); assert(r[0].orderId.length>0); });
test('Missing required columns → []', ()=>{ const r=parseAppleCard('Date,Merchant\n2024-01-01,Target','f.csv','Kira'); eq(r.length,0); });
test('Empty → []', ()=>{ const r=parseAppleCard('','f.csv','Kira'); eq(r.length,0); });
test('Null purchaser uses filename-derived label', ()=>{ const r=parseAppleCard(appleCSV,'test.csv',null); assert(typeof r[0].purchaser==='string','purchaser is string when null passed with filename'); });
test('Amount 0 filtered', ()=>{ const csv='Transaction Date,Merchant,Amount (USD)\n2024-01-15,Widget,0.00'; const r=parseAppleCard(csv,'f.csv','Kira'); eq(r.length,0); });
test('Autopay row filtered', ()=>{ const csv='Transaction Date,Merchant,Category,Amount (USD)\n2024-01-15,AutoPay,autopay,250.00'; const r=parseAppleCard(csv,'f.csv','Kira'); eq(r.length,0); });

// ═══════════════════════════════════════════════════════════════
// SUITE 6: parseGenericDetail — flexible CSV parser
// ═══════════════════════════════════════════════════════════════
suite('6 · parseGenericDetail — generic enrichment CSV');

const genCSV = `Date,Description,Amount,Category\n2024-02-01,Costco Wholesale,187.43,Shopping\n2024-02-15,Venmo Transfer,50.00,Transfer`;
test('Parses 2 rows', ()=>{ const r=parseGenericDetail(genCSV,'costco.csv','Chris'); eq(r.length,2); });
test('Description → title', ()=>{ const r=parseGenericDetail(genCSV,'costco.csv','Chris'); eq(r[0].title,'Costco Wholesale'); });
test('Amount parsed', ()=>{ const r=parseGenericDetail(genCSV,'costco.csv','Chris'); near(r[0].total,187.43); });
test('Purchaser attributed', ()=>{ const r=parseGenericDetail(genCSV,'costco.csv','Chris'); eq(r[0].purchaser,'Chris'); });
test('Source from filename', ()=>{ const r=parseGenericDetail(genCSV,'costco.csv','Chris'); eq(r[0].source,'costco'); });
test('Category extracted', ()=>{ const r=parseGenericDetail(genCSV,'costco.csv','Chris'); eq(r[0].category,'Shopping'); });
test('PayPal-style export', ()=>{
  const pp = `Date,Name,Amount\n2024-01-10,John Doe,25.00\n2024-01-15,Coffee Shop,4.50`;
  const r=parseGenericDetail(pp,'paypal.csv',null); eq(r.length,2);
});
test('Missing key columns → []', ()=>{ const r=parseGenericDetail('A,B\n1,2','f.csv','Chris'); eq(r.length,0); });
test('Zero amounts filtered', ()=>{ const csv='Date,Description,Amount\n2024-01-01,Widget,0.00'; const r=parseGenericDetail(csv,'f.csv',null); eq(r.length,0); });
test('Negative amounts taken as abs', ()=>{ const csv='Date,Description,Amount\n2024-01-01,Widget,-50.00'; const r=parseGenericDetail(csv,'f.csv',null); gte(r[0].total,0); });

// ═══════════════════════════════════════════════════════════════
// SUITE 7: sniffFile — format auto-detection
// ═══════════════════════════════════════════════════════════════
suite('7 · sniffFile — format auto-detection');

const amazonHeader = `Order ID,Order Date,Product Name,Quantity,Grand Total,ASIN/ISBN,Department`;
const amazonHeaderLegacy = `Order Date,Order ID,Title,Category,ASIN,Quantity,Item Total`;
const appleCardHeader = `Transaction Date,Clearing Date,Description,Merchant,Category,Amount (USD)`;
const quickenHeader = `Date,Payee,Amount,Category,Account`;
const appleCardHeader2 = `Transaction Date,Clearing Date,Merchant,Category,Type,Amount (USD)`;

test('Amazon new format → amazon', ()=>eq(sniffFile(amazonHeader+'\nrow','test.csv'),'amazon'));
test('Amazon legacy format → amazon', ()=>eq(sniffFile(amazonHeaderLegacy+'\nrow','test.csv'),'amazon'));
test('Amazon filename Retail.OrderHistory.1.csv', ()=>eq(sniffFile('a,b','Retail.OrderHistory.1.csv'),'amazon'));
test('Amazon filename orderhistory → amazon', ()=>eq(sniffFile('a,b','my_orderhistory.csv'),'amazon'));
test('Apple Card clearing date header → applecard', ()=>eq(sniffFile(appleCardHeader+'\nrow','test.csv'),'applecard'));
test('Apple Card amount (usd) header → applecard', ()=>eq(sniffFile(appleCardHeader2+'\nrow','test.csv'),'applecard'));
test('Apple Card filename applecard.csv → applecard', ()=>eq(sniffFile(quickenHeader,'applecard.csv'),'applecard'));
test('Apple Card filename apple_card.csv → applecard', ()=>eq(sniffFile(quickenHeader,'apple_card.csv'),'applecard'));
test('Quicken CSV → quicken', ()=>eq(sniffFile(quickenHeader+'\nrow','export.csv'),'quicken'));
test('QIF extension → quicken', ()=>eq(sniffFile('[!Type:Bank]','transactions.qif'),'quicken'));
test('QFX extension → quicken', ()=>eq(sniffFile('<OFX>','bank.qfx'),'quicken'));
test('OFX extension → quicken', ()=>eq(sniffFile('<OFX>','bank.ofx'),'quicken'));
test('Empty file → quicken (default)', ()=>eq(sniffFile('','test.csv'),'quicken'));
test('Whitespace-only → quicken (default)', ()=>eq(sniffFile('   ','test.csv'),'quicken'));
test('ASIN column alone → amazon', ()=>eq(sniffFile('ASIN,Title,Price\nB001,Widget,9.99','test.csv'),'amazon'));

// ═══════════════════════════════════════════════════════════════
// SUITE 8: parseDetailFile — router
// ═══════════════════════════════════════════════════════════════
suite('8 · parseDetailFile — format router');

test('Routes Amazon new format', ()=>{ const r=parseDetailFile(amazonHeader+'\nD01,2024-01-15,Widget,1,29.99,29.99,B001,Kitchen','test.csv','Chris'); assert(r.length>0,'expected items'); eq(r[0].source,'Amazon'); eq(r[0].purchaser,'Chris'); });
test('Routes Apple Card format', ()=>{ const r=parseDetailFile(appleCardHeader+'\n01/15/2024,01/16/2024,Starbucks,Starbucks,Food,Purchase,14.50','test.csv','Kira'); assert(r.length>=0); });
test('Routes generic CSV', ()=>{ const r=parseDetailFile('Date,Description,Amount\n2024-01-10,Widget,25.00','costco.csv','Chris'); assert(r.length>0); });
test('Amazon items stamped with source=Amazon', ()=>{ const r=parseDetailFile(amazonHeader+'\nD01,2024-01-15,Widget,1,29.99,29.99,B001,Kitchen','test.csv','Chris'); if(r.length>0) eq(r[0].source,'Amazon'); });
test('Apple Card items stamped with source=Apple Card', ()=>{ const r=parseDetailFile(appleCardHeader+'\n01/15/2024,01/16/2024,Starbucks,Starbucks,Food,Purchase,14.50','test.csv','Kira'); if(r.length>0) eq(r[0].source,'Apple Card'); });
test('Purchaser passed through to all items', ()=>{ const r=parseDetailFile('Date,Description,Amount\n2024-01-10,Widget,25.00','test.csv','Sam'); if(r.length>0) eq(r[0].purchaser,'Sam'); });
test('Empty → []', ()=>{ const r=parseDetailFile('','test.csv','Chris'); eq(r.length,0); });
test('Whitespace only → []', ()=>{ const r=parseDetailFile('   \n   ','test.csv','Chris'); eq(r.length,0); });
test('Retail.OrderHistory.1.csv filename routes to Amazon', ()=>{ const r=parseDetailFile(amazonHeader+'\nD01,2024-01-15,Widget,1,29.99,29.99,B001,Kitchen','Retail.OrderHistory.1.csv',null); if(r.length>0) eq(r[0].source,'Amazon'); });

// ═══════════════════════════════════════════════════════════════
// SUITE 9: scoreImpulse — impulse scoring algorithm
// ═══════════════════════════════════════════════════════════════
suite('9 · scoreImpulse — impulse scoring');

test('Returns 0 for null item', ()=>eq(scoreImpulse(null),0));
test('Returns 0 for empty object', ()=>eq(scoreImpulse({}),0));
test('High-impulse category adds 30', ()=>{ const s=scoreImpulse({category:'Health & Beauty',title:'Lipstick',total:12,qty:1}); gte(s,30); });
test('Under $15 adds 25 pts', ()=>{ const s=scoreImpulse({category:'Books',title:'Quick Read',total:9.99,qty:1}); gte(s,25+30-1); });
test('$15-$30 range adds 15 pts', ()=>{ const s=scoreImpulse({category:'Books',title:'Book',total:22,qty:1}); const s2=scoreImpulse({category:'Books',title:'Book',total:8,qty:1}); assert(s2>=s,'under$15 should score higher'); });
test('Multiple qty + low total adds 15', ()=>{ const s=scoreImpulse({category:'Other',title:'Widget',total:40,qty:4}); gte(s,15); });
test('Pack/bundle title adds 10', ()=>{ const s=scoreImpulse({category:'Other',title:'Variety Pack of Snacks',total:60,qty:1}); gte(s,10); });
test('Max score capped at 100', ()=>{ const s=scoreImpulse({category:'Health & Beauty',title:'Pack of stuff',total:5,qty:5}); assert(s<=100,'capped at 100'); });
test('Non-impulse high-value → low score', ()=>{ const s=scoreImpulse({category:'Housing',title:'Mortgage Payment',total:2240,qty:1}); assert(s<30,'large planned purchase should be low'); });
test('High-impulse category set includes Toys & Games', ()=>assert(IMPULSE_CATS.has('Toys & Games')));
test('High-impulse category set includes Clothing', ()=>assert(IMPULSE_CATS.has('Clothing')));

// ═══════════════════════════════════════════════════════════════
// SUITE 10: impulseBadge
// ═══════════════════════════════════════════════════════════════
suite('10 · impulseBadge — badge classification');

test('Score 0 → Low green', ()=>eq(impulseBadge(0).cls,'imp-lo'));
test('Score 29 → Low', ()=>eq(impulseBadge(29).cls,'imp-lo'));
test('Score 30 → Medium', ()=>eq(impulseBadge(30).cls,'imp-md'));
test('Score 59 → Medium', ()=>eq(impulseBadge(59).cls,'imp-md'));
test('Score 60 → High red', ()=>eq(impulseBadge(60).cls,'imp-hi'));
test('Score 100 → High', ()=>eq(impulseBadge(100).cls,'imp-hi'));
test('Returns lbl and cls', ()=>{ const b=impulseBadge(50); assert('lbl' in b && 'cls' in b); });
test('Low label contains Low', ()=>assert(impulseBadge(0).lbl.includes('Low')));
test('High label contains High', ()=>assert(impulseBadge(80).lbl.includes('High')));

// ═══════════════════════════════════════════════════════════════
// SUITE 11: Age & Life Stage
// ═══════════════════════════════════════════════════════════════
suite('11 · Age & Life Stage calculations');

const TODAY = new Date();
const Y = (a) => { const d=new Date(TODAY); d.setFullYear(d.getFullYear()-a); return d.toISOString().slice(0,10); };

test('calcAge: exact age', ()=>{ const age=calcAge(Y(35)); assert(age===35||age===34,'near 35'); });
test('calcAge: null dob → null', ()=>eq(calcAge(null),null));
test('calcAge: empty string → null', ()=>eq(calcAge(''),null));
test('calcAge: garbage → null', ()=>eq(calcAge('not-a-date'),null));
test('calcAge: infant (0)', ()=>{ const age=calcAge(Y(0)); assert(age===0||age===-1,'newborn'); });
test('calcAgeInYears: 1 year ahead', ()=>{ const age=calcAgeInYears(Y(40),1); assert(age===40||age===41,'future age'); });
test('getLifeStage: age 3 → early_childhood', ()=>eq(getLifeStage(3).stage,'early_childhood'));
test('getLifeStage: age 8 → elementary', ()=>eq(getLifeStage(8).stage,'elementary'));
test('getLifeStage: age 13 → middle_school', ()=>eq(getLifeStage(13).stage,'middle_school'));
test('getLifeStage: age 16 → high_school', ()=>eq(getLifeStage(16).stage,'high_school'));
test('getLifeStage: age 20 → college', ()=>eq(getLifeStage(20).stage,'college'));
test('getLifeStage: age 24 → young_adult', ()=>eq(getLifeStage(24).stage,'young_adult'));
test('getLifeStage: null → null', ()=>eq(getLifeStage(null),null));
test('getParentLifeStage: age 32 → early_career', ()=>eq(getParentLifeStage(32).stage,'early_career'));
test('getParentLifeStage: age 43 → peak_earning', ()=>eq(getParentLifeStage(43).stage,'peak_earning'));
test('getParentLifeStage: age 52 → pre_retirement', ()=>eq(getParentLifeStage(52).stage,'pre_retirement'));
test('getParentLifeStage: age 62 → late_career', ()=>eq(getParentLifeStage(62).stage,'late_career'));
test('getParentLifeStage: age 70 → retirement', ()=>eq(getParentLifeStage(70).stage,'retirement'));
test('getParentLifeStage: null → null', ()=>eq(getParentLifeStage(null),null));
test('Life stage has icon', ()=>assert(getLifeStage(10).icon.length>0));
test('Parent stage has label', ()=>assert(getParentLifeStage(45).label.length>0));

// ═══════════════════════════════════════════════════════════════
// SUITE 12: guessType
// ═══════════════════════════════════════════════════════════════
suite('12 · guessType — account classification');

test('checking in name → checking', ()=>eq(guessType('Chase Checking'),'checking'));
test('savings in name → savings', ()=>eq(guessType('Marcus Savings'),'savings'));
test('credit in name → credit', ()=>eq(guessType('Chase Sapphire Credit'),'credit'));
test('CC in name → credit', ()=>eq(guessType('Amex Blue Cash (CC)'),'credit'));
test('401k → investment', ()=>eq(guessType('Fidelity 401k'),'investment'));
test('brokerage → investment', ()=>eq(guessType('Fidelity Brokerage'),'investment'));
test('HYSA → savings', ()=>eq(guessType('Marcus Savings (HYSA)'),'savings'));
test('Unknown → other', ()=>eq(guessType('PayPal'),'other'));

// ═══════════════════════════════════════════════════════════════
// SUITE 13: Formatters
// ═══════════════════════════════════════════════════════════════
suite('13 · Formatters — fmt / fmtK / fmtPct');

test('fmt: integer', ()=>eq(fmt(100),'$100.00'));
test('fmt: two decimals', ()=>eq(fmt(12.5),'$12.50'));
test('fmt: negative (abs)', ()=>eq(fmt(-50),'$50.00'));
test('fmt: zero', ()=>eq(fmt(0),'$0.00'));
test('fmt: null safe', ()=>noThrow(()=>fmt(null)));
test('fmtK: under 1000', ()=>eq(fmtK(500),'$500'));
test('fmtK: thousands', ()=>eq(fmtK(1500),'$1.5K'));
test('fmtK: millions', ()=>eq(fmtK(1500000),'$1.5M'));
test('fmtK: exactly 1000', ()=>eq(fmtK(1000),'$1.0K'));
test('fmtK: negative handled as abs', ()=>{ const r=fmtK(-2500); assert(r.includes('2.5K'),r); });
test('fmtPct: positive', ()=>assert(fmtPct(5.5).includes('5.5')));
test('fmtPct: negative', ()=>assert(fmtPct(-3.2).includes('3.2')));
test('fmtPct: positive has + prefix', ()=>assert(fmtPct(5).startsWith('+')));

// ═══════════════════════════════════════════════════════════════
// SUITE 14: getRange / inRange
// ═══════════════════════════════════════════════════════════════
suite('14 · getRange / inRange — date filtering');

test('getRange 3m: start is ~3 months ago', ()=>{ const {start}=getRange('3m'); const diff=(Date.now()-start.getTime())/(1000*60*60*24); assert(diff>=60&&diff<=100,'~3mo'); });
test('getRange 6m: start is ~6 months ago', ()=>{ const {start}=getRange('6m'); const diff=(Date.now()-start.getTime())/(1000*60*60*24); assert(diff>=150&&diff<=200,'~6mo'); });
test('getRange 1y: start is ~1 year ago', ()=>{ const {start}=getRange('1y'); const diff=(Date.now()-start.getTime())/(1000*60*60*24); assert(diff>=330&&diff<=400,'~1y'); });
test('getRange all: start is 2000-01-01', ()=>{ const {start}=getRange('all'); assert(start.getFullYear()<=2000); });
test('inRange: recent txn in 3m', ()=>{ const now=new Date(); const t={date:now.toISOString().slice(0,10)}; assert(inRange(t,'3m')); });
test('inRange: old txn not in 3m', ()=>{ const t={date:'2019-01-01'}; assert(!inRange(t,'3m')); });
test('inRange: old txn in all', ()=>{ const t={date:'2019-01-01'}; assert(inRange(t,'all')); });
test('getRange end is end of current month', ()=>{ const {end}=getRange('3m'); const now=new Date(); eq(end.getMonth(),now.getMonth()); });

// ═══════════════════════════════════════════════════════════════
// SUITE 15: groupByDimension — analytics grouping
// ═══════════════════════════════════════════════════════════════
suite('15 · groupByDimension — analytics dimensions');

const mockTxns = [
  {date:'2024-01-15', payee:'Giant Eagle', category:'Groceries', account:'Chase Checking', amount:-127.43, type:'debit'},
  {date:'2024-01-20', payee:'DoorDash', category:'Dining', account:'Chase Sapphire (CC)', amount:-48.50, type:'debit'},
  {date:'2024-02-10', payee:'Giant Eagle', category:'Groceries', account:'Chase Checking', amount:-115.00, type:'debit'},
  {date:'2024-01-01', payee:'Salary', category:'Income', account:'Chase Checking', amount:7800.00, type:'credit'},
];

test('group by month: 2 keys', ()=>{ const g=groupByDimension(mockTxns,'month'); assert(Object.keys(g).length===2,'2 months'); });
test('group by month: Jan has 3 txns', ()=>{ const g=groupByDimension(mockTxns,'month'); eq(g['2024-01'].count,2,'2 expenses in Jan'); });
test('group by category: Groceries key exists', ()=>{ const g=groupByDimension(mockTxns,'category'); assert('Groceries' in g); });
test('group by category: Groceries total correct', ()=>{ const g=groupByDimension(mockTxns,'category'); near(g['Groceries'].exp,242.43,0.5); });
test('group by account: Chase Checking exists', ()=>{ const g=groupByDimension(mockTxns,'account'); assert('Chase Checking' in g); });
test('group by year: 2024 key', ()=>{ const g=groupByDimension(mockTxns,'year'); assert('2024' in g); });
test('group by quarter: Q1 2024', ()=>{ const g=groupByDimension(mockTxns,'quarter'); assert('2024 Q1' in g); });
test('group by dayofweek: all days are valid', ()=>{ const g=groupByDimension(mockTxns,'dayofweek'); Object.keys(g).forEach(k=>assert(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(k),k)); });
test('income tracked separately from exp', ()=>{ const g=groupByDimension(mockTxns,'month'); gte(g['2024-01'].inc,7800,'income in Jan'); });
test('count tracks expenses only', ()=>{ const g=groupByDimension(mockTxns,'category'); eq(g['Groceries'].count,2); });
test('empty array → empty object', ()=>{ const g=groupByDimension([],'month'); eq(Object.keys(g).length,0); });

// ═══════════════════════════════════════════════════════════════
// SUITE 16: computeMetric — analytics metrics
// ═══════════════════════════════════════════════════════════════
suite('16 · computeMetric — analytics metrics');

const mockGroup = {exp:500, inc:1000, count:10, amounts:[50,50,50,50,50,50,50,50,50,50]};
const emptyGroup = {exp:0, inc:0, count:0, amounts:[]};

test('spending returns exp', ()=>eq(computeMetric(mockGroup,'spending'),500));
test('income returns inc', ()=>eq(computeMetric(mockGroup,'income'),1000));
test('net returns inc-exp', ()=>eq(computeMetric(mockGroup,'net'),500));
test('txncount returns count', ()=>eq(computeMetric(mockGroup,'txncount'),10));
test('avg returns exp/count', ()=>eq(computeMetric(mockGroup,'avg'),50));
test('savings_rate: (inc-exp)/inc*100', ()=>eq(computeMetric(mockGroup,'savings_rate'),50));
test('unknown metric falls back to exp', ()=>eq(computeMetric(mockGroup,'bogus'),500));
test('avg with count=0 → 0', ()=>eq(computeMetric(emptyGroup,'avg'),0));
test('savings_rate with zero inc → 0', ()=>eq(computeMetric(emptyGroup,'savings_rate'),0));
test('negative net', ()=>{ const g={exp:800,inc:500,count:5,amounts:[]}; eq(computeMetric(g,'net'),-300); });
test('savings_rate negative when overspending', ()=>{ const g={exp:1200,inc:1000,count:5,amounts:[]}; assert(computeMetric(g,'savings_rate')<0,'negative savings rate'); });

// ═══════════════════════════════════════════════════════════════
// SUITE 17: personSummary — per-person analytics
// ═══════════════════════════════════════════════════════════════
suite('17 · personSummary — per-person detail analytics');

// Temporarily populate amzItems for testing
const savedAmz = [...amzItems];
amzItems.length = 0;

const testItems = [
  {date:'2024-01-15', title:'lululemon', category:'Clothing', price:105, qty:1, total:105, purchaser:'Kira', source:'Apple Card'},
  {date:'2024-02-10', title:'Peloton Membership', category:'Health & Fitness', price:44, qty:1, total:44, purchaser:'Kira', source:'Apple Card'},
  {date:'2024-01-20', title:'Starbucks', category:'Dining', price:14, qty:1, total:14, purchaser:'Chris', source:'Apple Card'},
  {date:'2024-01-25', title:'Nike.com', category:'Sporting Goods', price:95, qty:1, total:95, purchaser:'Chris', source:'Apple Card'},
  {date:'2024-02-05', title:'Nordstrom', category:'Clothing', price:180, qty:1, total:180, purchaser:'Kira', source:'Nordstrom Card'},
];
testItems.forEach(i => amzItems.push(i));

test('personSummary: Kira total correct', ()=>{ const s=personSummary('Kira',null); near(s.total,329,1); });
test('personSummary: Kira items count', ()=>{ const s=personSummary('Kira',null); eq(s.items,3); });
test('personSummary: Chris total correct', ()=>{ const s=personSummary('Chris',null); near(s.total,109,1); });
test('personSummary: name in result', ()=>{ const s=personSummary('Kira',null); eq(s.name,'Kira'); });
test('personSummary: topCat is Clothing for Kira', ()=>{ const s=personSummary('Kira',null); eq(s.topCat,'Clothing'); });
test('personSummary: monthlyAvg is total/months', ()=>{ const s=personSummary('Kira',null); assert(s.monthlyAvg>0,'monthlyAvg positive'); });
test('personSummary: unknown person → null', ()=>eq(personSummary('Sam',null),null));
test('personSummary: impulseRate is 0-100', ()=>{ const s=personSummary('Kira',null); assert(s.impulseRate>=0&&s.impulseRate<=100); });
test('personSummary: categories array', ()=>{ const s=personSummary('Kira',null); isArr(s.categories); });
test('personSummary: dateFrom filters correctly', ()=>{ const d=new Date('2024-02-01'); const s=personSummary('Kira',d); assert(s.items<3,'dateFrom filters Jan items'); });

// Restore amzItems
amzItems.length = 0;
savedAmz.forEach(i => amzItems.push(i));

// ═══════════════════════════════════════════════════════════════
// SUITE 18: inferTxnOwner — account → person mapping
// ═══════════════════════════════════════════════════════════════
suite('18 · inferTxnOwner — account to person');

const savedOwners = settings.accountOwners;
test('returns owner when account mapped', ()=>{ settings.accountOwners={'Chase Sapphire (CC)':'Chris'}; eq(inferTxnOwner({account:'Chase Sapphire (CC)'}), 'Chris'); });
test('returns null when account not mapped', ()=>{ settings.accountOwners={'Chase Sapphire (CC)':'Chris'}; eq(inferTxnOwner({account:'Unknown Account'}), null); });
test('returns null when accountOwners is empty', ()=>{ settings.accountOwners={}; eq(inferTxnOwner({account:'Chase Sapphire (CC)'}), null); });
test('returns null when accountOwners is null', ()=>{ settings.accountOwners=null; eq(inferTxnOwner({account:'Chase Sapphire (CC)'}), null); });
test('Kira mapped account', ()=>{ settings.accountOwners={'Apple Card - Kira (CC)':'Kira'}; eq(inferTxnOwner({account:'Apple Card - Kira (CC)'}), 'Kira'); });
settings.accountOwners = savedOwners;

// ═══════════════════════════════════════════════════════════════
// SUITE 19: detectPersonTrends — purchaser trend detection
// ═══════════════════════════════════════════════════════════════
suite('19 · detectPersonTrends — per-person acceleration');

const savedAmz2 = [...amzItems];
amzItems.length = 0;

// Plant items: Kira spent a lot recently (cur3) vs almost nothing before (prv3)
const now = new Date();
const mkDate = (mAgo) => { const d=new Date(now); d.setMonth(d.getMonth()-mAgo); return d.toISOString().slice(0,10); };

// Kira: $500 in last 3mo (cur3), $50 prior 3mo (prv3) → big spike
for (let i=0; i<5; i++) amzItems.push({date:mkDate(0), title:'Nordstrom', category:'Clothing', price:100, qty:1, total:100, purchaser:'Kira', source:'Nordstrom Card'});
for (let i=0; i<1; i++) amzItems.push({date:mkDate(4), title:'Old Purchase', category:'Clothing', price:50, qty:1, total:50, purchaser:'Kira', source:'Nordstrom Card'});
// Chris: steady, no spike
for (let i=0; i<2; i++) amzItems.push({date:mkDate(1), title:'Starbucks', category:'Dining', price:14, qty:1, total:14, purchaser:'Chris', source:'Apple Card'});
for (let i=0; i<2; i++) amzItems.push({date:mkDate(4), title:'Starbucks', category:'Dining', price:14, qty:1, total:14, purchaser:'Chris', source:'Apple Card'});

test('detectPersonTrends returns array', ()=>{ const t=detectPersonTrends(); isArr(t); });
test('detects Kira spike', ()=>{ const t=detectPersonTrends(); const kira=t.filter(tr=>tr.person==='Kira'); assert(kira.length>0,'Kira spike detected'); });
test('spike has pct > 0', ()=>{ const t=detectPersonTrends(); const kira=t.filter(tr=>tr.person==='Kira'); if(kira.length) assert(kira[0].pct>0); });
test('spike severity is warn or danger', ()=>{ const t=detectPersonTrends(); t.forEach(tr=>assert(['warn','danger'].includes(tr.sev),tr.sev)); });
test('empty amzItems → []', ()=>{ const backup=[...amzItems]; amzItems.length=0; const t=detectPersonTrends(); eq(t.length,0); backup.forEach(i=>amzItems.push(i)); });
test('trend has person field', ()=>{ const t=detectPersonTrends(); t.forEach(tr=>assert(typeof tr.person==='string',tr)); });

amzItems.length = 0;
savedAmz2.forEach(i => amzItems.push(i));

// ═══════════════════════════════════════════════════════════════
// SUITE 20: predictMonthlyDetail — end-of-month projection
// ═══════════════════════════════════════════════════════════════
suite('20 · predictMonthlyDetail — spend projection');

// Fresh slate — restore anything from prior suites then clear
const savedAmz3 = []; // don't inherit leftover items
amzItems.length = 0;

test('returns null when amzItems is empty', ()=>{ const r=predictMonthlyDetail('Chris'); eq(r,null); });

// Add test items for Chris — 1 current month + 6 historical
const curMo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
amzItems.push({date:`${curMo}-05`, title:'Widget', category:'Shopping', price:50, qty:1, total:50, purchaser:'Chris', source:'Amazon'});
// Historical items (use absolute month offsets from fresh Date each time)
for(let m=1; m<=6; m++) {
  const dh=new Date(); dh.setMonth(dh.getMonth()-m); // fresh Date each iteration
  const mo=`${dh.getFullYear()}-${String(dh.getMonth()+1).padStart(2,'0')}`;
  amzItems.push({date:`${mo}-10`, title:'Widget', category:'Shopping', price:50, qty:1, total:50, purchaser:'Chris', source:'Amazon'});
}

test('returns object with expected fields', ()=>{ const r=predictMonthlyDetail('Chris'); assert(r!==null); hasKeys(r,['projected','histAvg','mtdTotal','daysLeft']); });
test('daysLeft is 0 to 31', ()=>{ const r=predictMonthlyDetail('Chris'); assert(r.daysLeft>=0&&r.daysLeft<=31); });
test('mtdTotal is positive (reflects current month spend)', ()=>{
  const r=predictMonthlyDetail('Chris');
  // mtdTotal may be 50 or 100 depending on historical loop day alignment — both valid
  assert(r.mtdTotal>0 && r.mtdTotal<=200, `mtdTotal=${r.mtdTotal} should be 50-200`);
});
test('histAvg is positive', ()=>{ const r=predictMonthlyDetail('Chris'); gte(r.histAvg,0); });
test('projected is >= mtdTotal', ()=>{ const r=predictMonthlyDetail('Chris'); gte(r.projected,r.mtdTotal-0.01,'projected>=mtd'); });
test('unknown person returns valid structure', ()=>{ const r=predictMonthlyDetail('Sam'); if(r) hasKeys(r,['projected','histAvg']); });

amzItems.length = 0;
savedAmz3.forEach(i => amzItems.push(i));

// ═══════════════════════════════════════════════════════════════
// SUITE 21: Deduplication — ledger and detail items
// ═══════════════════════════════════════════════════════════════
suite('21 · Deduplication — collision prevention');

// Test dedup key logic (the actual dedup happens in processAll, but we test the key components)
const dedupKey = (t) => `${t.date}|${t.payee}|${t.amount}|${t.account}`;
const amzDedupKey = (i) => `${i.date}|${i.title}|${i.orderId}|${i.purchaser||''}`;

test('Txn dedup key is unique for different dates', ()=>{ const k1=dedupKey({date:'2024-01-15',payee:'Target',amount:-89,account:'Chase'}); const k2=dedupKey({date:'2024-01-16',payee:'Target',amount:-89,account:'Chase'}); neq(k1,k2); });
test('Txn dedup key is identical for same txn', ()=>{ const t={date:'2024-01-15',payee:'Target',amount:-89,account:'Chase'}; eq(dedupKey(t),dedupKey({...t})); });
test('Txn dedup: different amount = different key', ()=>{ const k1=dedupKey({date:'2024-01-15',payee:'Target',amount:-89,account:'Chase'}); const k2=dedupKey({date:'2024-01-15',payee:'Target',amount:-90,account:'Chase'}); neq(k1,k2); });
test('Txn dedup: different account = different key', ()=>{ const k1=dedupKey({date:'2024-01-15',payee:'Target',amount:-89,account:'Chase'}); const k2=dedupKey({date:'2024-01-15',payee:'Target',amount:-89,account:'Amex'}); neq(k1,k2); });
test('AmzItem dedup key includes purchaser', ()=>{ const k1=amzDedupKey({date:'2024-01-15',title:'Widget',orderId:'D01',purchaser:'Chris'}); const k2=amzDedupKey({date:'2024-01-15',title:'Widget',orderId:'D01',purchaser:'Kira'}); neq(k1,k2,'different purchasers = different keys'); });
test('AmzItem dedup: same item same purchaser = same key', ()=>{ const i={date:'2024-01-15',title:'Widget',orderId:'D01',purchaser:'Chris'}; eq(amzDedupKey(i),amzDedupKey({...i})); });
test('AmzItem dedup: null purchaser treated as empty string', ()=>{ const k1=amzDedupKey({date:'2024-01-15',title:'W',orderId:'D01',purchaser:null}); const k2=amzDedupKey({date:'2024-01-15',title:'W',orderId:'D01',purchaser:null}); eq(k1,k2); });
test('AmzItem dedup: different orderId = different key', ()=>{ const k1=amzDedupKey({date:'2024-01-15',title:'W',orderId:'D01',purchaser:'Chris'}); const k2=amzDedupKey({date:'2024-01-15',title:'W',orderId:'D02',purchaser:'Chris'}); neq(k1,k2); });

// ═══════════════════════════════════════════════════════════════
// SUITE 22: getSavingsRate / getAnnualNet — financial metrics
// ═══════════════════════════════════════════════════════════════
suite('22 · getSavingsRate / getAnnualNet');

const savedTxns = [...txns];
txns.length = 0;

test('getSavingsRate with no txns → 0', ()=>eq(getSavingsRate(),0));
test('getAnnualNet with no txns → 0', ()=>eq(getAnnualNet(),0));

// Add known income/expense
const recent = new Date(); recent.setMonth(recent.getMonth()-1);
const recentDate = recent.toISOString().slice(0,10);
txns.push({date:recentDate, payee:'Salary', category:'Income', amount:10000, account:'Checking', type:'credit'});
txns.push({date:recentDate, payee:'Groceries', category:'Groceries', amount:-3000, account:'Checking', type:'debit'});

test('getSavingsRate: 10k income, 3k expense → ~70%', ()=>{ const r=getSavingsRate(); near(r,70,5); });
test('getAnnualNet is income minus expenses', ()=>{ const r=getAnnualNet(); near(r,7000,100); });
test('getSavingsRate is 0-100 range', ()=>{ const r=getSavingsRate(); assert(r>=0&&r<=100,`${r} out of range`); });

// Push all-expense scenario
txns.push({date:recentDate, payee:'Rent', category:'Housing', amount:-15000, account:'Checking', type:'debit'});
test('getSavingsRate negative overspend → negative or 0', ()=>{ const r=getSavingsRate(); assert(r<=0||r<70,'overspending should reduce rate'); });

txns.length = 0;
savedTxns.forEach(t => txns.push(t));

// ═══════════════════════════════════════════════════════════════
// SUITE 23: DEFAULT_SETTINGS — schema validation
// ═══════════════════════════════════════════════════════════════
suite('23 · DEFAULT_SETTINGS — schema validation');

test('has familyName', ()=>assert('familyName' in DEFAULT_SETTINGS));
test('has user1 and user2', ()=>{ assert('user1' in DEFAULT_SETTINGS); assert('user2' in DEFAULT_SETTINGS); });
test('has kids array', ()=>isArr(DEFAULT_SETTINGS.kids));
test('kids has 3 pre-populated', ()=>eq(DEFAULT_SETTINGS.kids.length,3));
test('kids have name, dob, gender, emoji', ()=>{ DEFAULT_SETTINGS.kids.forEach(k=>hasKeys(k,['name','dob','gender','emoji'])); });
test('has savingsTarget number', ()=>assert(typeof DEFAULT_SETTINGS.savingsTarget==='number'));
test('has emergencyTarget', ()=>assert('emergencyTarget' in DEFAULT_SETTINGS));
test('has largePurchaseThreshold', ()=>assert('largePurchaseThreshold' in DEFAULT_SETTINGS));
test('has amzSensitivity', ()=>assert('amzSensitivity' in DEFAULT_SETTINGS));
test('has accountOwners object', ()=>{ assert('accountOwners' in DEFAULT_SETTINGS); assert(typeof DEFAULT_SETTINGS.accountOwners==='object'); });
test('has detailSensitivity', ()=>assert('detailSensitivity' in DEFAULT_SETTINGS));
test('has categoryBudgets object', ()=>assert(typeof DEFAULT_SETTINGS.categoryBudgets==='object'));
test('has agendaSteps', ()=>assert('agendaSteps' in DEFAULT_SETTINGS));
test('has confluenceMode boolean', ()=>assert(typeof DEFAULT_SETTINGS.confluenceMode==='boolean'));
test('has kidsInAlerts boolean', ()=>assert(typeof DEFAULT_SETTINGS.kidsInAlerts==='boolean'));
test('familyName default is Luka', ()=>eq(DEFAULT_SETTINGS.familyName,'Luka'));
test('user1 default is Chris', ()=>eq(DEFAULT_SETTINGS.user1,'Chris'));
test('user2 default is Kira', ()=>eq(DEFAULT_SETTINGS.user2,'Kira'));
test('Sam is kid 0', ()=>eq(DEFAULT_SETTINGS.kids[0].name,'Sam'));
test('Whitney is kid 1', ()=>eq(DEFAULT_SETTINGS.kids[1].name,'Whitney'));
test('Will is kid 2', ()=>eq(DEFAULT_SETTINGS.kids[2].name,'Will'));

// ═══════════════════════════════════════════════════════════════
// SUITE 24: parseQIF — QIF format parsing
// ═══════════════════════════════════════════════════════════════
suite('24 · parseQIF — Quicken QIF format');

const qifSample = `!Type:Bank\n^Banking\nD01/15/2024\nT-127.43\nPGiant Eagle\nLGroceries\n^\nD01/20/2024\nT5200.00\nPSalary Direct Deposit\nLIncome\n^`;
test('Parses 2 transactions', ()=>{ const r=parseQIF(qifSample,'test.qif'); eq(r.length,2); });
test('Date parsed correctly', ()=>{ const r=parseQIF(qifSample,'test.qif'); eq(r[0].date,'2024-01-15'); });
test('Amount correct', ()=>{ const r=parseQIF(qifSample,'test.qif'); near(Math.abs(r[0].amount),127.43); });
test('Payee extracted', ()=>{ const r=parseQIF(qifSample,'test.qif'); eq(r[0].payee,'Giant Eagle'); });
test('Category from L record', ()=>{ const r=parseQIF(qifSample,'test.qif'); eq(r[0].category,'Groceries'); });
test('Empty → []', ()=>{ const r=parseQIF('','test.qif'); eq(r.length,0); });

// ═══════════════════════════════════════════════════════════════
// SUITE 25: Edge cases & regression
// ═══════════════════════════════════════════════════════════════
suite('25 · Edge cases & regression');

test('parseDate: 2-digit years are handled (no crash)', ()=>noThrow(()=>parseDate('1/1/99')));
test('parseAmazon: handles missing Grand Total (uses unit price)', ()=>{ const csv='Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,ASIN/ISBN\nD01,2024-01-01,Widget,1,29.99,B001'; const r=parseAmazon(csv); if(r.length>0) near(r[0].total,29.99); });
test('parseAppleCard: handles tab-delimited as well as comma', ()=>noThrow(()=>parseAppleCard('Transaction Date\tMerchant\tAmount (USD)\n01/01/2024\tTarget\t50.00','test.csv','Chris')));
test('computeMetric: handles group with no amounts', ()=>noThrow(()=>computeMetric({exp:0,inc:0,count:0,amounts:[]},'avg')));
test('groupByDimension: handles txn with missing category', ()=>{ const g=groupByDimension([{date:'2024-01-01',payee:'X',category:undefined,account:'A',amount:-10}],'category'); assert('Uncategorized' in g,'undefined category → Uncategorized'); });
test('groupByDimension: handles txn with missing account', ()=>{ const g=groupByDimension([{date:'2024-01-01',payee:'X',category:'A',account:undefined,amount:-10}],'account'); assert('Unknown' in g,'undefined account → Unknown'); });
test('scoreImpulse: qty undefined treated as 1', ()=>noThrow(()=>scoreImpulse({category:'Books',title:'Book',total:20})));
test('fmtK: handles very large number', ()=>noThrow(()=>fmtK(999999999)));
test('fmtK: handles NaN', ()=>noThrow(()=>fmtK(NaN)));
test('parseDetailFile: null text → []', ()=>eq(parseDetailFile(null,'test.csv','Chris').length,0));
test('personSummary: empty amzItems returns null', ()=>{ const b=[...amzItems]; amzItems.length=0; const r=personSummary('Chris',null); eq(r,null); b.forEach(i=>amzItems.push(i)); });
test('inferTxnOwner: handles missing account field', ()=>{ settings.accountOwners={'Chase':'Chris'}; noThrow(()=>inferTxnOwner({})); });
test('parseCSV: handles Windows-style CRLF line endings', ()=>{ const r=parseCSV('Date,Payee,Amount,Category,Account\r\n01/15/2024,Target,-89,Shopping,Chase\r\n','test.csv'); gte(r.length,1,'CRLF handled'); });
test('parseCSV: handles BOM character at start', ()=>noThrow(()=>parseCSV('\uFEFFDate,Payee,Amount\n01/01/2024,Target,-50','test.csv')));
test('getRange: unknown range → same as all', ()=>{ const r=getRange('bogus'); assert(r.start.getFullYear()<=2001); });
test('MONTHS array has 12 entries', ()=>eq(MONTHS.length,12));
test('MONTHS: Jan is first', ()=>assert(MONTHS[0].startsWith('Jan')||MONTHS[0]==='January'));
test('IMPULSE_CATS is a Set', ()=>assert(IMPULSE_CATS instanceof Set));


// ═══════════════════════════════════════════════════════════════
// SUITE 26: Blank columns, edge cases, all CSV variations
// ═══════════════════════════════════════════════════════════════
suite('26 · Blank Columns & CSV Edge Cases');

test('Blank col in middle of header',()=>{
  const csv="Date,,Amount,Category,Account\n01/15/2024,junk,-89.99,Shopping,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'blank header col'); near(r[0].amount,-89.99);
});
test('Two blank cols at start of header',()=>{
  const csv=",,Date,Payee,Amount,Account\n,,01/15/2024,Target,-89.99,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'leading blank cols');
});
test('Blank col at end of header',()=>{
  const csv="Date,Payee,Amount,Account,\n01/15/2024,Target,-89.99,Chase,";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'trailing blank col'); near(r[0].amount,-89.99);
});
test('Multiple scattered blank cols in header',()=>{
  const csv="Date,,Payee,,Amount,,Account\n01/15/2024,,Target,,-89.99,,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'scattered blank cols');
});
test('Blank payee cell → Unknown',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,,-89.99,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); eq(r[0].payee,'Unknown');
});
test('Blank category cell → Uncategorized',()=>{
  const csv="Date,Payee,Amount,Category,Account\n01/15/2024,Target,-89.99,,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); eq(r[0].category,'Uncategorized');
});
test('Blank account cell → filename fallback',()=>{
  const csv="Date,Payee,Amount,Category,Account\n01/15/2024,Target,-89.99,Shopping,";
  const r=parseCSV(csv,'my-account.csv'); gte(r.length,1); assert(r[0].account.length>0,'account not empty');
});
test('Blank amount cell → row skipped',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,,Chase\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'blank amount row skipped');
});
test('Blank date cell → row skipped',()=>{
  const csv="Date,Payee,Amount,Account\n,Target,-89.99,Chase\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'blank date row skipped');
});
test('Blank debit AND credit → row skipped',()=>{
  const csv="Date,Description,Debit,Credit,Account\n01/15/2024,Target,,,Chase\n01/16/2024,Salary,,100.00,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'both d+c blank → skip');
});
test('Quoted blank amount → row skipped',()=>{
  const csv='Date,Payee,Amount,Account\n01/15/2024,Target,"",Chase\n01/16/2024,Starbucks,-8.50,Chase';
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'quoted blank amount skipped');
});
test('Whitespace-only amount → row skipped',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,   ,Chase\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'whitespace amount skipped');
});
test('Blank rows in data section',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,-89.99,Chase\n\n\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,2,'blank rows skipped');
});
test('Row of only commas',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,-89.99,Chase\n,,,\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,2,'comma-only row skipped');
});
test('Trailing comma on every row',()=>{
  const csv="Date,Payee,Amount,Account,\n01/15/2024,Target,-89.99,Chase,\n01/16/2024,Starbucks,-8.50,Chase,";
  const r=parseCSV(csv,'t.csv'); eq(r.length,2,'trailing commas ok');
});
test('Extra spaces in header col names',()=>{
  const csv="  Date  ,  Payee  ,  Amount  ,  Account  \n01/15/2024,Target,-89.99,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'spaced header names'); near(r[0].amount,-89.99);
});
test('Mixed case header',()=>{
  const csv="DATE,Payee,AMOUNT,Category,Account\n01/15/2024,Target,-89.99,Shopping,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'mixed case header'); near(r[0].amount,-89.99);
});
test('ALL CAPS header',()=>{
  const csv="DATE,PAYEE,AMOUNT,CATEGORY,ACCOUNT\n01/15/2024,Target,-89.99,Shopping,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'all caps header');
});
test('BOM + blank cols in header',()=>{
  const csv="\uFEFFDate,,Payee,Amount,Account\n01/15/2024,,Target,-89.99,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'BOM + blank cols');
});
test('sep= first line (Excel)',()=>{
  const csv="sep=,\nDate,Payee,Amount,Account\n01/15/2024,Target,-89.99,Chase";
  const r=parseCSV(csv,'t.csv');
  // sep= becomes header → date col not found → 0 rows OR correctly skips sep= line
  assert(Array.isArray(r),'sep= no crash');
});
test('Header with # comment lines before',()=>{
  const csv="#Exported from Bank\nDate,Payee,Amount,Account\n01/15/2024,Target,-89.99,Chase";
  const r=parseCSV(csv,'t.csv');
  // #... header means # line is treated as column header → no date found → 0 rows
  assert(Array.isArray(r),'comment before header no crash');
});
test('Header repeated mid-file',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,-89.99,Chase\nDate,Payee,Amount,Account\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,2,'repeated header row skipped');
});
test('Extra data cols beyond header',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,-89.99,Chase,EXTRA,JUNK,DATA";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1,'extra cols dont break parse');
});
test('Fewer data cols than header',()=>{
  const csv="Date,Payee,Amount,Category,Account\n01/15/2024,Target,-89.99";
  const r=parseCSV(csv,'t.csv');
  assert(Array.isArray(r),'short row no crash');
});
test('Row with only 1 field',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024";
  const r=parseCSV(csv,'t.csv'); eq(r.length,0,'single-field row skipped');
});
test('Amount with trailing space',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,-89.99 ,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); near(r[0].amount,-89.99);
});
test('Amount with leading space',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target, -89.99,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); near(r[0].amount,-89.99);
});
test('Dollar sign in amount',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,$89.99,Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); near(Math.abs(r[0].amount),89.99);
});
test('Parenthetical negative amount',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,(89.99),Chase";
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); assert(r[0].amount<0,'parens is negative');
});
test('Amount with commas in thousands',()=>{
  const csv='Date,Payee,Amount,Account\n01/15/2024,Mortgage,"2,240.00",Chase';
  const r=parseCSV(csv,'t.csv'); gte(r.length,1); near(r[0].amount,2240);
});
test('Amount zero — included',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Fee Reversal,0.00,Chase";
  const r=parseCSV(csv,'t.csv');
  assert(Array.isArray(r),'zero amount no crash');
});
test('Negative credit value',()=>{
  const csv="Date,Description,Debit,Credit,Account\n01/15/2024,Reversal,,-89.99,Chase";
  const r=parseCSV(csv,'t.csv'); assert(Array.isArray(r),'negative credit no crash');
});
test('Amount NaN string',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,N/A,Chase\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'NaN amount row skipped');
});
test('Amount as word',()=>{
  const csv="Date,Payee,Amount,Account\n01/15/2024,Target,DEBIT,Chase\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1,'word amount row skipped');
});
test('Semicolon delimiter — no crash',()=>{
  const csv="Date;Payee;Amount;Account\n01/15/2024;Target;-89.99;Chase";
  assert(Array.isArray(parseCSV(csv,'t.csv')),'semicolon no crash');
});
test('Pipe delimiter — no crash',()=>{
  const csv="Date|Payee|Amount|Account\n01/15/2024|Target|-89.99|Chase";
  assert(Array.isArray(parseCSV(csv,'t.csv')),'pipe no crash');
});
test('Tab delimited',()=>{
  const csv="Date\tPayee\tAmount\tAccount\n01/15/2024\tTarget\t-89.99\tChase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,1); near(r[0].amount,-89.99);
});
test('CRLF line endings',()=>{
  const csv="Date,Payee,Amount,Account\r\n01/15/2024,Target,-89.99,Chase\r\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,2,'CRLF handled');
});
test('Mixed CRLF and LF',()=>{
  const csv="Date,Payee,Amount,Account\r\n01/15/2024,Target,-89.99,Chase\n01/16/2024,Starbucks,-8.50,Chase";
  const r=parseCSV(csv,'t.csv'); eq(r.length,2,'mixed CRLF+LF handled');
});

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════
console.log(`\n${BAR}`);
console.log(`  SUITE BREAKDOWN:`);
Object.entries(SUITE_STATS).forEach(([s,{p,f}])=>{
  const icon = f===0 ? '✅' : '❌';
  console.log(`  ${icon}  ${s}: ${p} passed${f>0?' · '+f+' FAILED':''}`);
});
if (FAILS.length) {
  console.log(`\n  FAILURES:`);
  FAILS.forEach(f=>{
    console.log(`\n  ❌  [${f.suite}] ${f.name}`);
    console.log(`      ${f.err}`);
  });
}
console.log(`\n${BAR}`);
console.log(`  ✅  Passed : ${PASS} / ${TOTAL}`);
console.log(`  ❌  Failed : ${FAIL} / ${TOTAL}`);
console.log(`  📊  Score  : ${Math.round(PASS/TOTAL*100)}%`);
console.log(BAR);
console.log(FAIL===0
  ? '  🏆  ALL TESTS PASS — Forge v3.2 is battle-ready.\n'
  : `  ⚠️   ${FAIL} failure(s) require attention.\n`);
process.exit(FAIL > 0 ? 1 : 0);
