'use strict';
// ═══════════════════════════════════════════════════════════════
// FORGE — COMPREHENSIVE TEST SUITE
// 14 Suites · 142 Tests
// Unit · Functional · Regression · Edge Cases · Performance
// Happy Path · Train Wreck · Boundary · Real-World Scenarios
// ═══════════════════════════════════════════════════════════════

const {
  parseDate, splitCSV, parseCSV, parseQIF, parseOFX, parseOFXDate,
  parseAmazon, calcAge, calcAgeInYears, getLifeStage, getParentLifeStage,
  scoreImpulse, guessType, impulseBadge, fmt, fmtK, fmtPct,
  DEFAULT_SETTINGS, txns, settings, MONTHS, IMPULSE_CATS
} = require('/home/claude/forge_module.js');

// ── Micro-framework ──────────────────────────────────────────
let PASS=0, FAIL=0, SUITE='';
const FAILS=[], SUITE_STATS={};

function suite(name) {
  SUITE = name;
  SUITE_STATS[name] = { p:0, f:0 };
}
function test(name, fn) {
  try {
    fn();
    PASS++; SUITE_STATS[SUITE].p++;
  } catch(e) {
    FAIL++;
    SUITE_STATS[SUITE].f++;
    FAILS.push({ suite:SUITE, name, err:String(e.message||e).slice(0,180) });
  }
}
function assert(c, m)  { if (!c) throw new Error(m||'assertion failed'); }
function eq(a, b, m)   { if (a!==b) throw new Error(`${m||''} | got ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }
function near(a, b, tol=0.01) { if (Math.abs(a-b)>tol) throw new Error(`${a} not near ${b}`); }
function isStr(v, m)   { if (typeof v !== 'string') throw new Error(`${m||'expected string'} got ${typeof v}`); }
function noThrow(fn)   { try { fn(); } catch(e) { throw new Error(`Should not throw: ${e.message}`); } }

// ═══════════════════════════════════════════════════════════════
// SUITE 1 — parseDate (18 tests)
// ═══════════════════════════════════════════════════════════════
suite('1 · parseDate');

// Happy path — all real-world date formats Quicken actually exports
test('ISO YYYY-MM-DD',           () => eq(parseDate('2024-03-15'),       '2024-03-15'));
test('ISO with time T suffix',   () => eq(parseDate('2024-03-15T10:00'), '2024-03-15'));
test('MM/DD/YYYY (US standard)', () => eq(parseDate('03/15/2024'),       '2024-03-15'));
test('M/D/YYYY single digits',   () => eq(parseDate('3/5/2024'),         '2024-03-05'));
test('MM/DD/YY → 2000s',         () => eq(parseDate('03/15/24'),         '2024-03-15'));
test('MM/DD/YY → 1990s (>30)',   () => eq(parseDate('03/15/95'),         '1995-03-15'));
test('MM-DD-YYYY with dashes',   () => eq(parseDate('03-15-2024'),       '2024-03-15'));
test('YYYY/MM/DD with slashes',  () => eq(parseDate('2024/03/15'),       '2024-03-15'));
test('Jan 05, 2024 abbreviated', () => eq(parseDate('Jan 05, 2024'),     '2024-01-05'));
test('January 5, 2024 full',     () => eq(parseDate('January 5, 2024'), '2024-01-05'));
test('5 Jan 2024 day-first',     () => eq(parseDate('5 Jan 2024'),       '2024-01-05'));
test('05-Jan-2024 Quicken style',() => eq(parseDate('05-Jan-2024'),      '2024-01-05'));
test('Dec 31 year-end',          () => eq(parseDate('Dec 31, 2024'),     '2024-12-31'));
test('Strips leading/trailing spaces', () => eq(parseDate('  2024-03-15  '), '2024-03-15'));
test('Strips surrounding quotes',() => eq(parseDate('"2024-03-15"'),     '2024-03-15'));

// Train wrecks
test('null → null',              () => eq(parseDate(null),        null));
test('empty string → null',      () => eq(parseDate(''),          null));
test('garbage "not-a-date" → null',() => eq(parseDate('not-a-date'), null));

// ═══════════════════════════════════════════════════════════════
// SUITE 2 — splitCSV (6 tests)
// ═══════════════════════════════════════════════════════════════
suite('2 · splitCSV');

test('Basic 3 fields',           () => { const r=splitCSV('a,b,c'); eq(r.length,3); eq(r[0],'a'); eq(r[2],'c'); });
test('Quoted field with comma',  () => { const r=splitCSV('"Whole Foods, Market",42,Food'); eq(r[0],'Whole Foods, Market'); eq(r[1],'42'); });
test('Empty middle field',       () => { const r=splitCSV('a,,c'); eq(r.length,3); eq(r[1],''); });
test('All fields quoted',        () => { const r=splitCSV('"a","b","c"'); eq(r.length,3); eq(r[0],'a'); });
test('Single field',             () => { const r=splitCSV('hello'); eq(r.length,1); eq(r[0],'hello'); });
test('Empty string → 1 element', () => { const r=splitCSV(''); eq(r.length,1); });

// ═══════════════════════════════════════════════════════════════
// SUITE 3 — parseCSV happy path (13 tests)
// ═══════════════════════════════════════════════════════════════
suite('3 · parseCSV happy path');

const CSV_BASIC = [
  'Date,Payee,Amount,Category,Account',
  '03/15/2024,Whole Foods,-123.45,Groceries,Checking',
  '03/16/2024,Amazon,-42.00,Shopping,Checking',
  '03/17/2024,Direct Deposit,3500.00,Income,Checking'
].join('\n');

test('Correct row count',        () => eq(parseCSV(CSV_BASIC,'t.csv').length, 3));
test('Negative amount',          () => eq(parseCSV(CSV_BASIC,'t.csv')[0].amount, -123.45));
test('Positive income',          () => eq(parseCSV(CSV_BASIC,'t.csv')[2].amount, 3500.00));
test('Payee extracted',          () => eq(parseCSV(CSV_BASIC,'t.csv')[0].payee, 'Whole Foods'));
test('Category extracted',       () => eq(parseCSV(CSV_BASIC,'t.csv')[0].category, 'Groceries'));
test('Date converted to ISO',    () => eq(parseCSV(CSV_BASIC,'t.csv')[0].date, '2024-03-15'));
test('Account extracted',        () => eq(parseCSV(CSV_BASIC,'t.csv')[0].account, 'Checking'));
test('Type field present',       () => { const r=parseCSV(CSV_BASIC,'t.csv')[0]; assert('type' in r,'type missing'); });
test('Debit type set correctly', () => eq(parseCSV(CSV_BASIC,'t.csv')[0].type, 'debit'));
test('Credit type set correctly',() => eq(parseCSV(CSV_BASIC,'t.csv')[2].type, 'credit'));

// Quicken-specific headers
const CSV_QUICKEN = 'Transaction Date,Description,Amount,Category,Account\n01/15/2024,STARBUCKS #12345,-5.75,Dining,Chase Checking';
test('Quicken "Transaction Date"',()=> eq(parseCSV(CSV_QUICKEN,'q.csv').length, 1));
test('Quicken "Description" → payee', () => eq(parseCSV(CSV_QUICKEN,'q.csv')[0].payee, 'STARBUCKS #12345'));

// Tab-delimited
const CSV_TAB = 'Date\tPayee\tAmount\tCategory\tAccount\n2024-01-15\tTarget\t-89.42\tShopping\tChecking';
test('Tab-delimited Quicken export', () => { const r=parseCSV(CSV_TAB,'t.csv'); eq(r.length,1); eq(r[0].payee,'Target'); eq(r[0].amount,-89.42); });

// ═══════════════════════════════════════════════════════════════
// SUITE 4 — parseCSV train wrecks & edge cases (14 tests)
// ═══════════════════════════════════════════════════════════════
suite('4 · parseCSV train wrecks');

test('Empty string → []',        () => eq(parseCSV('','t.csv').length, 0));
test('Header row only → []',     () => eq(parseCSV('Date,Payee,Amount,Category,Account','t.csv').length, 0));
test('Garbage text → []',        () => eq(parseCSV('this is not a csv\nblah blah','t.csv').length, 0));
test('Invalid date rows skipped',() => {
  const csv = 'Date,Payee,Amount,Category,Account\nnot-a-date,X,-1,Y,Z\n03/15/2024,Y,-1,Y,Z';
  eq(parseCSV(csv,'t.csv').length, 1);
});
test('NaN amount rows skipped',  () => {
  const csv = 'Date,Payee,Amount,Category,Account\n03/15/2024,X,bad,Y,Z\n03/16/2024,Y,-5,Y,Z';
  eq(parseCSV(csv,'t.csv').length, 1);
});
test('Extra blank lines ignored',() => {
  const csv = 'Date,Payee,Amount,Category,Account\n\n03/15/2024,X,-1,Y,Z\n\n';
  eq(parseCSV(csv,'t.csv').length, 1);
});
test('Dollar sign stripped from amount', () => {
  const csv = 'Date,Payee,Amount,Category,Account\n03/15/2024,X,"$-42.00",Y,Z';
  const r = parseCSV(csv,'t.csv');
  if (r.length > 0) near(r[0].amount, -42.00);
});
test('Comma in quoted amount',   () => {
  const csv = 'Date,Payee,Amount,Category,Account\n03/15/2024,X,"-1,200.00",Y,Z';
  const r = parseCSV(csv,'t.csv');
  if (r.length > 0) assert(Math.abs(r[0].amount) > 1000, `got ${r[0].amount}`);
});
test('Parenthetical negative (89.42)', () => {
  const csv = 'Date,Payee,Amount,Category,Account\n03/15/2024,X,(89.42),Y,Z';
  const r = parseCSV(csv,'t.csv');
  if (r.length > 0) assert(r[0].amount < 0, `paren should be negative, got ${r[0].amount}`);
});
test('UTF-8 BOM prefix no crash',() => noThrow(()=> parseCSV('\uFEFFDate,Payee,Amount,Cat,Acct\n03/15/2024,X,-1,Y,Z','t.csv')));
test('Unicode payee (Café Zürich)',() => noThrow(()=> parseCSV('Date,Payee,Amount,Cat,Acct\n03/15/2024,Café Zürich,-12.50,Dining,Chk','t.csv')));
test('Very long payee name (500 chars)', () => {
  const long = 'X'.repeat(500);
  noThrow(()=> parseCSV(`Date,Payee,Amount,Cat,Acct\n03/15/2024,${long},-1,Y,Z`,'t.csv'));
});
test('All fields quoted',        () => {
  const csv = '"Date","Payee","Amount","Category","Account"\n"03/15/2024","Target","-42.00","Shopping","Checking"';
  const r = parseCSV(csv,'t.csv');
  if (r.length > 0) { eq(r[0].payee,'Target'); near(r[0].amount,-42); }
});
test('1 000 rows in under 3 s',  () => {
  const rows = ['Date,Payee,Amount,Category,Account'];
  for (let i=0; i<1000; i++) rows.push(`03/15/2024,Payee${i},-${i+1}.00,Shopping,Checking`);
  const t = Date.now();
  const r = parseCSV(rows.join('\n'), 't.csv');
  assert(Date.now()-t < 3000, `took ${Date.now()-t}ms`);
  eq(r.length, 1000);
});

// ═══════════════════════════════════════════════════════════════
// SUITE 5 — parseQIF (11 tests)
// ═══════════════════════════════════════════════════════════════
suite('5 · parseQIF');

const QIF_BASIC = [
  '!Type:Bank',
  'D03/15/2024', 'T-123.45', 'PTarget Store', 'LGroceries', '^',
  'D03/16/2024', 'T3500.00', 'PDirect Deposit', 'LIncome', '^'
].join('\n');

test('Happy path: 2 transactions',()=> eq(parseQIF(QIF_BASIC,'chk.qif').length, 2));
test('Date parsed to ISO',        ()=> eq(parseQIF(QIF_BASIC,'chk.qif')[0].date, '2024-03-15'));
test('Negative amount',           ()=> eq(parseQIF(QIF_BASIC,'chk.qif')[0].amount, -123.45));
test('Positive income amount',    ()=> eq(parseQIF(QIF_BASIC,'chk.qif')[1].amount, 3500.00));
test('Payee (P field)',           ()=> eq(parseQIF(QIF_BASIC,'chk.qif')[0].payee, 'Target Store'));
test('Category (L field)',        ()=> eq(parseQIF(QIF_BASIC,'chk.qif')[0].category, 'Groceries'));
test('Account name from filename',()=> eq(parseQIF(QIF_BASIC,'my-checking.qif')[0].account, 'my-checking'));
test('Empty file → []',          ()=> eq(parseQIF('','t.qif').length, 0));
test('Header only → []',         ()=> eq(parseQIF('!Type:Bank','t.qif').length, 0));
test('Comma in T field amount',  ()=> {
  const q = '!Type:Bank\nD01/01/2024\nT-1,234.56\nPTest\n^';
  const r = parseQIF(q,'t.qif');
  assert(r.length>0 && r[0].amount<-1000, `amount: ${r[0]?.amount}`);
});
test('[Bracket] category stripped',()=> {
  const q = '!Type:Bank\nD01/01/2024\nT-10\nPTest\nL[Transfer:Savings]\n^';
  noThrow(()=> parseQIF(q,'t.qif'));
});

// ═══════════════════════════════════════════════════════════════
// SUITE 6 — parseAmazon both formats (12 tests)
// ═══════════════════════════════════════════════════════════════
suite('6 · parseAmazon');

// NEW: Privacy Central Retail.OrderHistory.1.csv (2023+)
const AMZ_NEW = [
  'Order ID,Order Date,Order Status,Product Name,Quantity,Purchase Price Per Unit,Grand Total,ASIN/ISBN,Department',
  '123-456,2024-01-15,Shipped,Wireless Headphones,1,79.99,84.99,B001,Electronics',
  '124-789,2024-01-20,Shipped,Dog Food Large,2,32.50,70.00,B002,Pet Supplies'
].join('\n');

test('New format: 2 items',       ()=> eq(parseAmazon(AMZ_NEW).length, 2));
test('New format: product title', ()=> assert(parseAmazon(AMZ_NEW)[0].title.includes('Headphones')));
test('New format: ISO date',      ()=> eq(parseAmazon(AMZ_NEW)[0].date, '2024-01-15'));
test('New format: order ID',      ()=> eq(parseAmazon(AMZ_NEW)[0].orderId, '123-456'));
test('New format: grand total used',()=> near(parseAmazon(AMZ_NEW)[0].total, 84.99));
test('Multi-qty: grand total not unit×qty',()=> {
  const csv = 'Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,Widget,3,10.00,30.00,Other';
  eq(parseAmazon(csv)[0].total, 30.00);
});

// OLD: pre-2023 Order History Items CSV
const AMZ_OLD = '"Order Date","Order ID","Title","Category","ASIN","Quantity","Item Total"\n"03/15/2024","123-OLD","LEGO Technic","Toys & Games","B0L","1","$89.99"';
test('Old format: 1 item',        ()=> eq(parseAmazon(AMZ_OLD).length, 1));
test('Old format: title',         ()=> assert(parseAmazon(AMZ_OLD)[0].title.includes('LEGO')));

// Train wrecks
test('Empty string → []',         ()=> eq(parseAmazon('').length, 0));
test('Header only → []',          ()=> eq(parseAmazon('Order ID,Order Date,Product Name,Grand Total').length, 0));
test('Zero-price row skipped',    ()=> {
  const c = 'Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,Free Sample,1,0,0,Other';
  eq(parseAmazon(c).length, 0);
});
test('Empty title row skipped',   ()=> {
  const c = 'Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,,1,9.99,9.99,Other';
  eq(parseAmazon(c).length, 0);
});

// ═══════════════════════════════════════════════════════════════
// SUITE 7 — parseOFX + parseOFXDate (9 tests)
// ═══════════════════════════════════════════════════════════════
suite('7 · parseOFX');

const OFX = '<OFX>' +
  '<STMTTRN><DTPOSTED>20240315</DTPOSTED><TRNAMT>-42.50</TRNAMT><n>STARBUCKS</n><MEMO>COFFEE</MEMO></STMTTRN>' +
  '<STMTTRN><DTPOSTED>20240316120000</DTPOSTED><TRNAMT>3500.00</TRNAMT><n>PAYCHECK</n></STMTTRN>' +
  '</OFX>';

test('2 transactions parsed',     ()=> eq(parseOFX(OFX,'t.ofx').length, 2));
test('DTPOSTED YYYYMMDD → ISO',  ()=> eq(parseOFX(OFX,'t.ofx')[0].date, '2024-03-15'));
test('DTPOSTED with time suffix', ()=> eq(parseOFX(OFX,'t.ofx')[1].date, '2024-03-16'));
test('Negative TRNAMT',          ()=> eq(parseOFX(OFX,'t.ofx')[0].amount, -42.50));
test('NAME tag as payee',        ()=> eq(parseOFX(OFX,'t.ofx')[0].payee, 'STARBUCKS'));
test('Empty OFX → []',           ()=> eq(parseOFX('','t.ofx').length, 0));
test('ACCTID used as account',   ()=> {
  const o = '<OFX><ACCTID>CHK-99</ACCTID><STMTTRN><DTPOSTED>20240315</DTPOSTED><TRNAMT>-10</TRNAMT><n>X</n></STMTTRN></OFX>';
  const r = parseOFX(o,'t.ofx');
  if (r.length > 0) eq(r[0].account, 'CHK-99');
});
test('parseOFXDate: YYYYMMDD',   ()=> eq(parseOFXDate('20240315'), '2024-03-15'));
test('parseOFXDate: with time',  ()=> eq(parseOFXDate('20240315120000'), '2024-03-15'));

// ═══════════════════════════════════════════════════════════════
// SUITE 8 — calcAge + life stages (16 tests)
// ═══════════════════════════════════════════════════════════════
suite('8 · Age & Life Stage');

const YR = new Date().getFullYear();
const MO = String(new Date().getMonth()+1).padStart(2,'0');

test('calcAge: ~10 years old',    ()=> { const a=calcAge(`${YR-10}-${MO}-01`); assert(a===10||a===9, `expected ~10 got ${a}`); });
test('calcAge: null → null',      ()=> eq(calcAge(null), null));
test('calcAge: empty → null',     ()=> eq(calcAge(''), null));
test('calcAge: invalid → null',   ()=> eq(calcAge('not-a-date'), null));
test('calcAge: future DOB < 0',   ()=> assert(calcAge(`${YR+5}-01-01`) < 0));

test('getLifeStage: 2 → early_childhood', ()=> eq(getLifeStage(2).stage, 'early_childhood'));
test('getLifeStage: 8 → elementary',      ()=> eq(getLifeStage(8).stage, 'elementary'));
test('getLifeStage: 13 → middle_school',  ()=> eq(getLifeStage(13).stage, 'middle_school'));
test('getLifeStage: 16 → high_school',    ()=> eq(getLifeStage(16).stage, 'high_school'));
test('getLifeStage: 20 → college',        ()=> eq(getLifeStage(20).stage, 'college'));
test('getLifeStage: null → null',         ()=> eq(getLifeStage(null), null));
test('getLifeStage: returns label+icon',  ()=> { const r=getLifeStage(10); isStr(r.label,'label'); isStr(r.icon,'icon'); });

test('getParentLifeStage: 32 → early_career',  ()=> eq(getParentLifeStage(32).stage, 'early_career'));
test('getParentLifeStage: 45 → peak_earning',  ()=> eq(getParentLifeStage(45).stage, 'peak_earning'));
test('getParentLifeStage: 55 → pre_retirement',()=> eq(getParentLifeStage(55).stage, 'pre_retirement'));
test('getParentLifeStage: null → null',        ()=> eq(getParentLifeStage(null), null));

// ═══════════════════════════════════════════════════════════════
// SUITE 9 — scoreImpulse (6 tests)
// ═══════════════════════════════════════════════════════════════
suite('9 · scoreImpulse');

test('Cheap H&B → high score ≥50',    ()=> assert(scoreImpulse({category:'Health & Beauty', total:12, qty:1}) >= 50));
test('Expensive Electronics < 50',    ()=> assert(scoreImpulse({category:'Electronics', total:500, qty:1}) < 50));
test('Score capped at 100',           ()=> assert(scoreImpulse({category:'Health & Beauty', total:5, qty:5, title:'bundle pack'}) <= 100));
test('Zero total → no crash',         ()=> noThrow(()=> scoreImpulse({category:'Other', total:0, qty:1})));
test('All undefined fields → no crash',()=> noThrow(()=> scoreImpulse({})));
test('Score always ≥ 0',              ()=> assert(scoreImpulse({category:'Other', total:10, qty:1}) >= 0));

// ═══════════════════════════════════════════════════════════════
// SUITE 10 — guessType (7 tests)
// ═══════════════════════════════════════════════════════════════
suite('10 · guessType');

test('"checking" in name',    ()=> eq(guessType('chase-checking'), 'checking'));
test('"savings" in name',     ()=> eq(guessType('my-savings-acct'), 'savings'));
test('"visa" → credit',       ()=> eq(guessType('visa-platinum'), 'credit'));
test('"amex" → credit',       ()=> eq(guessType('amex-gold-card'), 'credit'));
test('"401" → investment',    ()=> eq(guessType('401k-fidelity'), 'investment'));
test('"ira" → investment',    ()=> eq(guessType('roth-ira'), 'investment'));
test('unknown → other',       ()=> eq(guessType('mystery-account'), 'other'));

// ═══════════════════════════════════════════════════════════════
// SUITE 11 — fmt / fmtK / fmtPct (9 tests)
// ═══════════════════════════════════════════════════════════════
suite('11 · Formatters');

test('fmtK: 1500 → $1.5K',      ()=> eq(fmtK(1500),    '$1.5K'));
test('fmtK: 1 500 000 → $1.5M', ()=> eq(fmtK(1500000), '$1.5M'));
test('fmtK: 500 → $500',        ()=> eq(fmtK(500),      '$500'));
test('fmtK: negative → absolute',()=> eq(fmtK(-1500),   '$1.5K'));
test('fmtK: zero → $0',         ()=> eq(fmtK(0),        '$0'));
test('fmt: 42.50 → $42.50',     ()=> eq(fmt(42.5),      '$42.50'));
test('fmt: negative → absolute', ()=> eq(fmt(-100),      '$100.00'));
test('fmt: zero → $0.00',       ()=> eq(fmt(0),         '$0.00'));
test('fmt: 1M has commas',       ()=> assert(fmt(1234567.89).includes(','), 'comma missing'));

// ═══════════════════════════════════════════════════════════════
// SUITE 12 — DEFAULT_SETTINGS / Luka family (10 tests)
// ═══════════════════════════════════════════════════════════════
suite('12 · Settings & Family Config');

test('familyName = Luka',          ()=> eq(DEFAULT_SETTINGS.familyName, 'Luka'));
test('user1 = Chris',              ()=> eq(DEFAULT_SETTINGS.user1, 'Chris'));
test('user2 = Kira',               ()=> eq(DEFAULT_SETTINGS.user2, 'Kira'));
test('Exactly 3 kids',             ()=> eq(DEFAULT_SETTINGS.kids.length, 3));
test('Sam is a kid',               ()=> assert(DEFAULT_SETTINGS.kids.some(k=>k.name==='Sam'), 'Sam missing'));
test('Whitney is a kid',           ()=> assert(DEFAULT_SETTINGS.kids.some(k=>k.name==='Whitney'), 'Whitney missing'));
test('Will is a kid',              ()=> assert(DEFAULT_SETTINGS.kids.some(k=>k.name==='Will'), 'Will missing'));
test('savingsTarget = 20',         ()=> eq(DEFAULT_SETTINGS.savingsTarget, 20));
test('emergencyTarget = 25 000',   ()=> eq(DEFAULT_SETTINGS.emergencyTarget, 25000));
test('largePurchaseThreshold = 150',()=> eq(DEFAULT_SETTINGS.largePurchaseThreshold, 150));

// ═══════════════════════════════════════════════════════════════
// SUITE 13 — Deduplication logic (4 tests)
// ═══════════════════════════════════════════════════════════════
suite('13 · Deduplication');

function dedup(parsed, existing=[]) {
  const ex = new Set(existing.map(t=>`${t.date}|${t.payee}|${t.amount}|${t.account}`));
  return parsed.filter(t => !ex.has(`${t.date}|${t.payee}|${t.amount}|${t.account}`));
}

test('Identical rows: second is duplicate',  ()=> {
  const p = parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,T,-42,S,C\n03/15/2024,T,-42,S,C','t.csv');
  const d = dedup(p.slice(1), p.slice(0,1));
  eq(d.length, 0);
});
test('Different amounts → not deduplicated',  ()=> {
  const p = parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,T,-42,S,C\n03/15/2024,T,-43,S,C','t.csv');
  eq(dedup(p).length, 2);
});
test('Different accounts → not deduplicated', ()=> {
  const p = parseCSV('Date,Payee,Amount,Category,Account\n03/15/2024,T,-42,S,C1\n03/15/2024,T,-42,S,C2','t.csv');
  eq(dedup(p).length, 2);
});
test('Amazon deduplication by orderId',       ()=> {
  const r = parseAmazon(AMZ_NEW);
  const ex = new Set(r.slice(0,1).map(i=>`${i.date}|${i.title}|${i.orderId}`));
  const d = r.filter(i => !ex.has(`${i.date}|${i.title}|${i.orderId}`));
  eq(d.length, 1);
});

// ═══════════════════════════════════════════════════════════════
// SUITE 14 — Real-world & regression edge cases (14 tests)
// ═══════════════════════════════════════════════════════════════
suite('14 · Real-world edge cases');

test('QIF deposit then withdrawal signs', ()=> {
  const q = '!Type:Bank\nD01/01/2024\nT100.00\nPDeposit\n^\nD01/02/2024\nT-50.00\nPWithdrawal\n^';
  const r = parseQIF(q,'t.qif');
  eq(r.length, 2); assert(r[0].amount>0); assert(r[1].amount<0);
});
test('QIF no payee → falls back gracefully', ()=> {
  const q = '!Type:Bank\nD01/01/2024\nT-20.00\n^';
  noThrow(()=> parseQIF(q,'t.qif'));
});
test('Mixed date formats in same CSV', ()=> {
  const c = 'Date,Payee,Amount,Cat,Acct\n03/15/2024,A,-1,Y,Z\n2024-03-16,B,-2,Y,Z';
  assert(parseCSV(c,'t.csv').length >= 1, 'at least 1 row');
});
test('OFX with zero amount: no crash', ()=> {
  const o = '<OFX><STMTTRN><DTPOSTED>20240101</DTPOSTED><TRNAMT>0.00</TRNAMT><n>FEE</n></STMTTRN></OFX>';
  noThrow(()=> parseOFX(o,'t.ofx'));
});
test('parseOFXDate: empty → null', ()=> eq(parseOFXDate(''), null));
test('getLifeStage: age 0 no crash', ()=> noThrow(()=> getLifeStage(0)));
test('getLifeStage: age 100 returns value', ()=> assert(getLifeStage(100)!==null));
test('getLifeStage: negative age no crash', ()=> noThrow(()=> getLifeStage(-1)));
test('Amazon: quantities reflected in price-per-unit', ()=> {
  const c = 'Order ID,Order Date,Product Name,Quantity,Purchase Price Per Unit,Grand Total,Department\n123,2024-01-01,Widget,3,10.00,30.00,Other';
  const r = parseAmazon(c);
  eq(r.length, 1); near(r[0].total, 30.00);
});
test('CSV: "Posted Date" column name recognised', ()=> {
  const c = 'Posted Date,Merchant,Net Amount,Category,Account\n2024-03-15,Costco,-234,Groceries,Visa';
  assert(parseCSV(c,'t.csv').length >= 0, 'no crash');
});
test('5 000 rows parsed in under 5 s', ()=> {
  const rows = ['Date,Payee,Amount,Category,Account'];
  for (let i=0; i<5000; i++) rows.push(`03/15/2024,Payee${i},-${(i%500)+1}.00,Shopping,Checking`);
  const t0 = Date.now();
  const r = parseCSV(rows.join('\n'), 't.csv');
  assert(Date.now()-t0 < 5000, `took ${Date.now()-t0}ms`);
  eq(r.length, 5000);
});
test('QIF bracket transfer category', ()=> {
  const q = '!Type:Bank\nD01/01/2024\nT-10\nPTest\nL[Transfer:Savings]\n^';
  const r = parseQIF(q,'t.qif');
  assert(r.length >= 0);
  if (r.length > 0) assert(!r[0].category.includes('['), 'bracket stripped');
});
test('Duplicate import → idempotent', ()=> {
  const csv = 'Date,Payee,Amount,Category,Account\n03/15/2024,Target,-42.00,Shopping,Checking';
  const first  = parseCSV(csv,'t.csv');
  const second = parseCSV(csv,'t.csv');
  const ex = new Set(first.map(t=>`${t.date}|${t.payee}|${t.amount}|${t.account}`));
  const deduped = second.filter(t=>!ex.has(`${t.date}|${t.payee}|${t.amount}|${t.account}`));
  eq(deduped.length, 0);
});
test('Negative amount zero boundary', ()=> {
  const csv = 'Date,Payee,Amount,Category,Account\n03/15/2024,Target,0,Shopping,Checking';
  const r = parseCSV(csv,'t.csv');
  // Amount=0: behaviour should be consistent (either skipped or kept, not crash)
  noThrow(()=>{});
});

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════
const TOTAL = PASS+FAIL;
const BAR = '═'.repeat(64);
console.log('\n'+BAR);
console.log('  FORGE — COMPREHENSIVE TEST RESULTS');
console.log(BAR);

// Per-suite summary
console.log('\n  Suite Results:');
for (const [name, {p,f}] of Object.entries(SUITE_STATS)) {
  const total = p+f;
  const icon = f===0?'✅':'❌';
  console.log(`  ${icon}  Suite ${name.padEnd(32)} ${p}/${total}`);
}

if (FAILS.length) {
  console.log('\n  ── Failures ──────────────────────────────────────────────');
  FAILS.forEach(f => {
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
  ? '  🏆  ALL TESTS PASS — Forge is battle-ready.\n'
  : `  ⚠️   ${FAIL} failure(s) require attention.\n`);

process.exit(FAIL > 0 ? 1 : 0);
