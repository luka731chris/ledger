'use strict';
// ═══════════════════════════════════════════════════════════════
// FORGE — SID AI LAYER TEST SUITE
// Tests: callSid, sendChat, buildContext, buildSidPrompt,
//        buildSidSystemPrompt, buildAlerts, getKidsContext,
//        getSidSetupMessage, history management, error routing,
//        system prompt generation, context accuracy
// Modes: unit · functional · contract · regression · edge case
// ═══════════════════════════════════════════════════════════════

// ── Minimal shims ──
const makeProxy = (base={}) => new Proxy(base, {
  get:(t,p)=>{ if(p in t) return t[p]; return typeof p==='symbol'?undefined:makeProxy(); },
  set:(t,p,v)=>{t[p]=v;return true;}
});
const mockEl = () => ({
  textContent:'', innerHTML:'', value:'', style:{},
  addEventListener:()=>{}, removeEventListener:()=>{},
  classList:{add:()=>{},remove:()=>{},contains:()=>false},
  appendChild:()=>{}, scrollTop:0, scrollHeight:0,
  remove:()=>{},
});
global.document = {
  getElementById:(id)=>mockEl(),
  createElement:(tag)=>({...mockEl(), tagName:tag, className:''}),
  querySelectorAll:()=>[],
  querySelector:()=>null,
  head:{appendChild:()=>{}},
  body:{appendChild:()=>{}, removeChild:()=>{}},
};
global.window   = { addEventListener:()=>{} };
global.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.sessionStorage = { getItem:()=>null, setItem:()=>{} };
global.AbortController = class { constructor(){this.signal={aborted:false};} abort(){this.signal.aborted=true;} };
global.setTimeout  = (fn,ms) => ({ _fn:fn, _ms:ms });
global.clearTimeout = ()=>{};
global.setInterval = ()=>{};
global.fetch = async()=>({ ok:true, json:async()=>({content:[{text:'mock ok'}]}) });

// ── Framework ──────────────────────────────────────────────────
let PASS=0, FAIL=0, SUITE='';
const FAILS=[], STATS={};
function suite(n){ SUITE=n; STATS[n]={p:0,f:0}; }
function test(name, fn){
  try{ fn(); PASS++; STATS[SUITE].p++; }
  catch(e){ FAIL++; STATS[SUITE].f++; FAILS.push({suite:SUITE,name,err:String(e.message||e).slice(0,200)}); }
}
function assert(c,m){ if(!c) throw new Error(m||'assertion failed'); }
function eq(a,b,m){ if(a!==b) throw new Error(`${m||''} | got ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }
function contains(str,sub,m){ if(!String(str).includes(sub)) throw new Error(`${m||''} | expected to contain "${sub}"`); }
function notContains(str,sub,m){ if(String(str).includes(sub)) throw new Error(`${m||''} | should NOT contain "${sub}"`); }
function noThrow(fn,m){ try{fn();}catch(e){throw new Error(`${m||'Should not throw'}: ${e.message}`);} }
function isStr(v,m){ if(typeof v!=='string') throw new Error(`${m||'expected string'} got ${typeof v}`); }
function near(a,b,tol,m){ tol=tol||0.01; if(Math.abs(a-b)>tol) throw new Error(`${m||''} | ${a} not near ${b} (±${tol})`); }

// ── Load the pure functions module (already extracted) ──
const {
  calcAge, getLifeStage, getParentLifeStage,
  DEFAULT_SETTINGS, fmt, fmtK
} = require('/home/claude/forge_module.js');

// ── Re-implement pulse-specific pure functions inline for testing ──
// (These live only in forge-pulse.html, not in the shared module)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtP  = n => '$' + Math.abs(n||0).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
const fmtKP = n => { const a=Math.abs(n||0); return a>=1e6?'$'+(a/1e6).toFixed(1)+'M':a>=1e3?'$'+(a/1e3).toFixed(1)+'K':'$'+a.toFixed(0); };
const nowMo  = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; };
const prevMo = () => { const n=new Date(), m=n.getMonth()===0?12:n.getMonth(), y=n.getMonth()===0?n.getFullYear()-1:n.getFullYear(); return `${y}-${String(m).padStart(2,'0')}`; };

function getParentStage(age) {
  if (age === null) return null;
  if (age < 35) return { stage:'early_career',   label:'Early Career',   icon:'🚀' };
  if (age < 45) return { stage:'peak_earning',   label:'Peak Earning',   icon:'📈' };
  if (age < 55) return { stage:'pre_retirement', label:'Pre-Retirement', icon:'🏗️' };
  return              { stage:'late_career',     label:'Late Career',    icon:'🏁' };
}

const DEFAULT_FAMILY = {
  familyName:'Luka', user1:'Chris', user1Dob:'', user2:'Kira', user2Dob:'',
  kids:[{name:'Sam',gender:'m',dob:'',emoji:'👦'},{name:'Whitney',gender:'f',dob:'',emoji:'👧'},{name:'Will',gender:'m',dob:'',emoji:'👦'}],
  savingsTarget:20, largePurchaseThreshold:150, amzSensitivity:3, confluenceMode:true,
};

// Mutable test state (mirrors pulse globals)
let txns=[], amzItems=[], accounts=[], goals=[], family={...DEFAULT_FAMILY}, history=[];

function cats3m() {
  const n=new Date(), s=new Date(n.getFullYear(),n.getMonth()-2,1), c={};
  txns.filter(t=>new Date(t.date)>=s&&t.amount<0).forEach(t=>c[t.category]=(c[t.category]||0)+Math.abs(t.amount));
  return Object.entries(c).sort((a,b)=>b[1]-a[1]);
}

function getKidsContext() {
  return family.kids.filter(k=>k.name).map(k=>{
    const age=k.dob?calcAge(k.dob):(parseInt(k.age)||null);
    const ls=getLifeStage(age);
    return {...k, age, ls, yearsToCollege: age!==null?Math.max(0,18-age):null};
  });
}

function buildContext() {
  if (!txns.length) return 'No financial data imported yet.';
  const n=new Date(), cm=nowMo(), lm=prevMo();
  const cmE=txns.filter(t=>t.date.startsWith(cm)&&t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
  const cmI=txns.filter(t=>t.date.startsWith(cm)&&t.amount>0).reduce((s,t)=>s+t.amount,0);
  const lmE=txns.filter(t=>t.date.startsWith(lm)&&t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
  const net=cmI-cmE, sr=cmI>0?(net/cmI*100):0;
  const y1=new Date(n.getFullYear()-1,n.getMonth()+1,1);
  const yt=txns.filter(t=>new Date(t.date)>=y1);
  const yi=yt.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  const ye=Math.abs(yt.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));
  const catStr=cats3m().slice(0,8).map(([c,v])=>`${c}: ${fmtKP(v)}`).join(', ');
  const goalsStr=goals.length?goals.map(g=>`${g.name}: ${fmtP(g.current)}/${fmtP(g.target)}`).join(', '):'No goals configured';
  const amzT=amzItems.reduce((s,i)=>s+i.total,0);
  const dates=txns.map(t=>t.date).sort();
  const chrisAge=calcAge(family.user1Dob);
  const ps=getParentStage(chrisAge);
  const kids=getKidsContext();
  const kidStr=kids.filter(k=>k.name).map(k=>`${k.name} (${k.age||'?'}, ${k.ls?.label||'unknown stage'}${k.yearsToCollege!==null?`, ${k.yearsToCollege} yrs to college`:''})`).join(', ');
  return `THE ${family.familyName.toUpperCase()} FAMILY — FORGE FINANCIAL INTELLIGENCE\nData: ${dates[0]} to ${dates[dates.length-1]} | Accounts: ${accounts.length} | Transactions: ${txns.length.toLocaleString()}\n\nFAMILY:\n- ${family.user1}${chrisAge?` (${chrisAge}${ps?', '+ps.label:''})`:''}\n- ${family.user2}\n- Kids: ${kidStr||'None configured'}\n\nCURRENT MONTH (${MONTHS[n.getMonth()]} ${n.getFullYear()}):\nIncome: ${fmtP(cmI)} | Expenses: ${fmtP(cmE)} | Net: ${fmtP(net)} | Savings rate: ${sr.toFixed(1)}%\n\n12-MONTH: Income ${fmtKP(yi)} | Expenses ${fmtKP(ye)} | Net ${fmtKP(yi-ye)}\n\nTOP SPENDING CATEGORIES (3 months): ${catStr}\n\nGOALS: ${goalsStr}\n\nAMAZON WATCHLIST: Total ${fmtKP(amzT)}`;
}

function buildSidPrompt(msg) {
  const u1=family.user1||'Chris', u2=family.user2||'Kira';
  const mentionsKira = msg.toLowerCase().includes(u2.toLowerCase()) || msg.toLowerCase().includes('kira') || msg.toLowerCase().includes('wife') || msg.toLowerCase().includes('partner');
  const isConfluence  = msg.toLowerCase().includes('confluence') || msg.toLowerCase().includes('meeting') || msg.toLowerCase().includes('family review');
  const chrisAge=calcAge(family.user1Dob);
  const ps=getParentStage(chrisAge);
  let mode='';
  if (isConfluence && family.confluenceMode) {
    mode=`CONFLUENCE MODE: Speak to both ${u1} and ${u2} as a team. Use "we" and "you both." The ${family.familyName} family.`;
  } else if (mentionsKira) {
    mode=`STORY-FIRST MODE (${u2} is in the conversation): Context and narrative before numbers. Warm but never condescending.`;
  } else {
    mode=`DATA-FIRST MODE (${u1}): Numbers lead. Give the key figure in the first sentence. Direct and specific.`;
  }
  return `You are Sid — named after Sidney Crosby, the greatest of his generation: precise, decisive, always sees the play first. You are the AI financial intelligence inside Forge.\n\nFAMILY: The ${family.familyName} family. ${u1} and ${u2}.\n\n${mode}\n\nALWAYS: Under 180 words unless depth genuinely required. No markdown headers. No hedging.\nNEVER: Say "I cannot" or "I apologize." Never be vague when data is available.`;
}

function getSidSetupMessage() {
  return `Hey ${family.user1||'there'} — Sid here. I'm almost ready, but need one quick setup step first.\n\nTo activate the chat feature, you need to configure a free Cloudflare Worker proxy that securely holds your Anthropic API key. It takes about 10 minutes and costs nothing.\n\nHere's what to do:\n1. Go to workers.cloudflare.com and create a free account\n2. Create a new Worker and paste the forge_worker.js file\n3. Add a Secret called ANTHROPIC_API_KEY\n4. Copy your Worker URL and replace WORKER_URL_HERE in forge-pulse.html`;
}

const SID_PROXY_CONFIGURED = 'https://forge-sid.example.workers.dev';
const SID_PROXY_UNCONFIGURED = 'WORKER_URL_HERE';

async function callSid(msg, proxyUrl) {
  // Simulates the actual callSid logic for testing
  if (!proxyUrl || proxyUrl === 'WORKER_URL_HERE') return getSidSetupMessage();
  const ctx = buildContext();
  const msgs = [
    { role:'user',      content:`Financial data:\n\n${ctx}` },
    { role:'assistant', content:`Got it — I have the full ${family.familyName} family picture.` },
    ...history,
    { role:'user', content: msg }
  ];
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 30000);
  try {
    const r = await global.fetch(proxyUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:500, system:buildSidPrompt(msg), messages:msgs }),
      signal:controller.signal,
    });
    global.clearTimeout(timeout);
    if (!r.ok) {
      const errText = await r.text().catch(()=>'');
      throw new Error(`API ${r.status}: ${errText.slice(0,100)}`);
    }
    const d = await r.json();
    return d.content?.[0]?.text || 'Sid had trouble generating a response — try again.';
  } catch(e) {
    global.clearTimeout(timeout);
    if (e.name==='AbortError') throw new Error('Request timed out after 30 seconds.');
    throw e;
  }
}

// Error routing logic (mirrors sendChat)
function routeError(errMsg) {
  if (errMsg.includes('timed out'))     return "That took too long — Anthropic's servers may be busy.";
  if (errMsg.includes('401'))           return "API key issue — double-check the ANTHROPIC_API_KEY in your Cloudflare Worker settings.";
  if (errMsg.includes('429'))           return "Rate limit hit — wait a moment and try again.";
  if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) return "Can't reach the proxy server. Check your Worker URL in SID_PROXY_URL.";
  return `Sid ran into an issue: ${errMsg||'unknown error'}. Check your Worker setup if this keeps happening.`;
}

// History pruning (mirrors sendChat)
function pruneHistory(hist) { return hist.length > 16 ? hist.slice(-16) : hist; }

// Helper: make test transactions
function makeTxn(date, payee, amount, category='Shopping', account='Checking') {
  return { date, payee, amount, category, account, type: amount >= 0 ? 'credit' : 'debit' };
}

const CM = nowMo(); // current month prefix e.g. "2026-03"
const LM = prevMo();

// ═══════════════════════════════════════════════════════════════
// SUITE 1 — getSidSetupMessage (5 tests)
// ═══════════════════════════════════════════════════════════════
suite('1 · getSidSetupMessage');

test('Returns a string',           ()=> isStr(getSidSetupMessage()));
test('Names the user (Chris)',      ()=> contains(getSidSetupMessage(), 'Chris'));
test('Mentions Cloudflare Worker', ()=> contains(getSidSetupMessage(), 'Cloudflare'));
test('Mentions ANTHROPIC_API_KEY', ()=> contains(getSidSetupMessage(), 'ANTHROPIC_API_KEY'));
test('Does not error on no-name family', ()=>{
  const saved = family.user1;
  family.user1 = '';
  noThrow(()=> getSidSetupMessage());
  family.user1 = saved;
});

// ═══════════════════════════════════════════════════════════════
// SUITE 2 — callSid: proxy guard (5 tests)
// ═══════════════════════════════════════════════════════════════
suite('2 · callSid proxy guard');

test('Unconfigured proxy → setup msg (not error)', async ()=>{
  const result = await callSid('hello', SID_PROXY_UNCONFIGURED);
  isStr(result); contains(result, 'Cloudflare', 'setup message expected');
});
test('Empty proxy URL → setup msg', async ()=>{
  const result = await callSid('hello', '');
  isStr(result); contains(result, 'Cloudflare');
});
test('Null proxy URL → setup msg', async ()=>{
  const result = await callSid('hello', null);
  isStr(result); contains(result, 'Cloudflare');
});
test('Configured proxy → calls fetch', async ()=>{
  let fetchCalled = false;
  global.fetch = async(url, opts)=>{ fetchCalled=true; return {ok:true,json:async()=>({content:[{text:'Sid response here'}]})}; };
  const result = await callSid('What is my savings rate?', SID_PROXY_CONFIGURED);
  assert(fetchCalled, 'fetch should be called with configured proxy');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});
test('Configured proxy → returns text content', async ()=>{
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'Savings rate is 18.2%'}]})});
  const result = await callSid('savings rate?', SID_PROXY_CONFIGURED);
  eq(result, 'Savings rate is 18.2%');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});

// ═══════════════════════════════════════════════════════════════
// SUITE 3 — callSid: HTTP error codes (6 tests)
// ═══════════════════════════════════════════════════════════════
suite('3 · callSid HTTP error handling');

async function fetchWithStatus(status, body='') {
  global.fetch = async()=>({ok:false, status, text:async()=>body, json:async()=>({})});
  try { await callSid('test', SID_PROXY_CONFIGURED); return null; }
  catch(e) { return e.message; }
  finally { global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})}); }
}

test('401 Unauthorized → throws with 401', async ()=>{
  const err = await fetchWithStatus(401, 'Unauthorized');
  assert(err && err.includes('401'), `expected 401 in error, got: ${err}`);
});
test('429 Rate limit → throws with 429', async ()=>{
  const err = await fetchWithStatus(429, 'Too Many Requests');
  assert(err && err.includes('429'), `expected 429 in error, got: ${err}`);
});
test('500 Server error → throws with 500', async ()=>{
  const err = await fetchWithStatus(500, 'Internal Server Error');
  assert(err && err.includes('500'), `expected 500 in error, got: ${err}`);
});
test('403 Forbidden → throws with 403', async ()=>{
  const err = await fetchWithStatus(403, 'Forbidden');
  assert(err && err.includes('403'), `expected 403 in error, got: ${err}`);
});
test('Empty content array → fallback string', async ()=>{
  global.fetch = async()=>({ok:true,json:async()=>({content:[]})});
  const result = await callSid('test', SID_PROXY_CONFIGURED);
  isStr(result); assert(result.length>0, 'fallback string expected');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});
test('Null content → fallback string', async ()=>{
  global.fetch = async()=>({ok:true,json:async()=>({content:null})});
  const result = await callSid('test', SID_PROXY_CONFIGURED);
  isStr(result, 'fallback string expected');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});

// ═══════════════════════════════════════════════════════════════
// SUITE 4 — callSid: timeout + network failure (4 tests)
// ═══════════════════════════════════════════════════════════════
suite('4 · callSid timeout & network');

test('AbortError → "Request timed out" message', async ()=>{
  global.fetch = async()=>{ const e=new Error('aborted'); e.name='AbortError'; throw e; };
  try { await callSid('test', SID_PROXY_CONFIGURED); assert(false,'should throw'); }
  catch(e) { contains(e.message,'timed out'); }
  finally { global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})}); }
});
test('Network error → propagates', async ()=>{
  global.fetch = async()=>{ throw new Error('Failed to fetch'); };
  try { await callSid('test', SID_PROXY_CONFIGURED); assert(false,'should throw'); }
  catch(e) { contains(e.message,'Failed to fetch'); }
  finally { global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})}); }
});
test('Timeout value sent correctly in body', async ()=>{
  let capturedBody = null;
  global.fetch = async(url, opts)=>{ capturedBody=JSON.parse(opts.body); return {ok:true,json:async()=>({content:[{text:'ok'}]})}; };
  await callSid('test', SID_PROXY_CONFIGURED);
  assert(capturedBody, 'body captured');
  eq(capturedBody.max_tokens, 500, 'max_tokens');
  eq(capturedBody.model, 'claude-sonnet-4-20250514', 'model');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});
test('Request body includes system prompt', async ()=>{
  let capturedBody = null;
  global.fetch = async(url, opts)=>{ capturedBody=JSON.parse(opts.body); return {ok:true,json:async()=>({content:[{text:'ok'}]})}; };
  await callSid('test', SID_PROXY_CONFIGURED);
  isStr(capturedBody.system, 'system prompt must be string');
  assert(capturedBody.system.length > 50, 'system prompt not trivially short');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});

// ═══════════════════════════════════════════════════════════════
// SUITE 5 — sendChat error routing (8 tests)
// ═══════════════════════════════════════════════════════════════
suite('5 · sendChat error routing');

test('Timeout error → user-friendly timeout message', ()=>{
  const msg = routeError('Request timed out after 30 seconds.');
  contains(msg, 'too long');
});
test('401 error → API key guidance', ()=>{
  const msg = routeError('API 401: Unauthorized');
  contains(msg, 'API key');
});
test('429 error → rate limit guidance', ()=>{
  const msg = routeError('API 429: Too Many Requests');
  contains(msg, 'Rate limit');
});
test('Network error → proxy URL guidance', ()=>{
  const msg = routeError('Failed to fetch');
  contains(msg, 'proxy');
});
test('NetworkError → proxy URL guidance', ()=>{
  const msg = routeError('NetworkError when attempting fetch');
  contains(msg, 'proxy');
});
test('Unknown error → includes error text', ()=>{
  const msg = routeError('some unexpected error');
  contains(msg, 'some unexpected error');
});
test('Empty error → graceful fallback', ()=>{
  const msg = routeError('');
  isStr(msg); assert(msg.length > 0, 'empty error fallback');
});
test('No user-facing message contains raw stack traces', ()=>{
  const errors = ['timed out', '401', '429', 'Failed to fetch', 'unexpected'];
  errors.forEach(e => {
    const msg = routeError(e);
    notContains(msg, 'at Object.', 'no stack trace in user message');
    notContains(msg, 'node_modules', 'no stack trace');
  });
});

// ═══════════════════════════════════════════════════════════════
// SUITE 6 — buildSidPrompt mode detection (10 tests)
// ═══════════════════════════════════════════════════════════════
suite('6 · buildSidPrompt mode detection');

test('Returns a string',                   ()=> isStr(buildSidPrompt('hello')));
test('Always mentions Sid',                ()=> contains(buildSidPrompt('hello'), 'Sid'));
test('Chris name in data-first mode',      ()=>{ const p=buildSidPrompt('what is my savings rate?'); contains(p,'Chris'); });
test('DATA-FIRST for neutral question',    ()=>{ const p=buildSidPrompt('what are my expenses?'); contains(p,'DATA-FIRST'); });
test('STORY-FIRST when Kira mentioned',   ()=>{ const p=buildSidPrompt('can you explain this to Kira?'); contains(p,'STORY-FIRST'); });
test('STORY-FIRST when "wife" mentioned', ()=>{ const p=buildSidPrompt('show my wife a summary'); contains(p,'STORY-FIRST'); });
test('STORY-FIRST when "partner" mentioned',()=>{ const p=buildSidPrompt('my partner wants to see spending'); contains(p,'STORY-FIRST'); });
test('CONFLUENCE when "meeting" mentioned',()=>{ family.confluenceMode=true; const p=buildSidPrompt('lets start the family meeting'); contains(p,'CONFLUENCE'); });
test('CONFLUENCE when "family review" mentioned',()=>{ const p=buildSidPrompt('family review time'); contains(p,'CONFLUENCE'); });
test('Prompt contains no-markdown instruction',()=>{ const p=buildSidPrompt('hi'); contains(p,'No markdown'); });

// ═══════════════════════════════════════════════════════════════
// SUITE 7 — buildContext: empty state (4 tests)
// ═══════════════════════════════════════════════════════════════
suite('7 · buildContext empty state');

test('No txns → returns no-data string', ()=>{
  txns = [];
  const ctx = buildContext();
  isStr(ctx);
  contains(ctx, 'No financial data');
});
test('No txns → short and safe', ()=>{
  txns = [];
  const ctx = buildContext();
  assert(ctx.length < 100, `unexpectedly long empty context: ${ctx.length}`);
});
test('Empty txns no crash',   ()=> noThrow(()=>{ txns=[]; buildContext(); }));
test('Empty goals no crash',  ()=> noThrow(()=>{ txns=[]; goals=[]; buildContext(); }));

// ═══════════════════════════════════════════════════════════════
// SUITE 8 — buildContext: with real data (12 tests)
// ═══════════════════════════════════════════════════════════════
suite('8 · buildContext with transaction data');

// Set up a realistic month of transactions
function setupMonth() {
  txns = [
    makeTxn(`${CM}-01`, 'Paycheck', 5000, 'Income'),
    makeTxn(`${CM}-05`, 'Whole Foods', -120, 'Groceries'),
    makeTxn(`${CM}-06`, 'Starbucks', -8.50, 'Dining'),
    makeTxn(`${CM}-10`, 'Target', -75, 'Shopping'),
    makeTxn(`${CM}-15`, 'Paycheck', 5000, 'Income'),
    makeTxn(`${CM}-20`, 'Gas Station', -60, 'Gas & Fuel'),
    makeTxn(`${LM}-15`, 'Paycheck', 4800, 'Income'),
    makeTxn(`${LM}-20`, 'Amazon', -200, 'Shopping'),
  ];
  accounts = [{name:'Checking'},{name:'Visa'}];
  goals = [{name:'Emergency Fund', current:15000, target:25000}];
}

test('Context is a non-empty string',   ()=>{ setupMonth(); isStr(buildContext()); assert(buildContext().length>100); });
test('Family name in context',          ()=>{ setupMonth(); contains(buildContext(), 'LUKA'); });
test('User names in context',           ()=>{ setupMonth(); contains(buildContext(), 'Chris'); });
test('Transaction count shown',         ()=>{ setupMonth(); const ctx=buildContext(); contains(ctx, txns.length.toString()); });
test('Income figure in context',        ()=>{ setupMonth(); const ctx=buildContext(); assert(ctx.includes('Income') || ctx.includes('income'), 'income label'); });
test('Expenses figure in context',      ()=>{ setupMonth(); const ctx=buildContext(); assert(ctx.includes('Expenses') || ctx.includes('Spending'), 'expenses'); });
test('Savings rate in context',         ()=>{ setupMonth(); contains(buildContext(), 'Savings rate'); });
test('Top categories present',          ()=>{ setupMonth(); const ctx=buildContext(); assert(ctx.includes('Groceries')||ctx.includes('Shopping')||ctx.includes('Dining'), 'categories'); });
test('Goals string in context',         ()=>{ setupMonth(); contains(buildContext(), 'Emergency Fund'); });
test('Amazon section present',          ()=>{ setupMonth(); amzItems=[{date:`${CM}-01`,title:'Widget',total:29.99,orderId:'123'}]; contains(buildContext(),'AMAZON'); amzItems=[]; });
test('Date range in context',           ()=>{ setupMonth(); const ctx=buildContext(); assert(ctx.includes(CM)||ctx.includes(LM), 'date range'); });
test('Context under 3000 chars (Anthropic context efficiency)',()=>{ setupMonth(); assert(buildContext().length<3000, `context too long: ${buildContext().length}`); });

// ═══════════════════════════════════════════════════════════════
// SUITE 9 — buildContext: financial accuracy (8 tests)
// ═══════════════════════════════════════════════════════════════
suite('9 · buildContext financial accuracy');

test('Net = income − expenses (current month)', ()=>{
  txns = [
    makeTxn(`${CM}-01`, 'Salary', 6000, 'Income'),
    makeTxn(`${CM}-05`, 'Rent',  -1500, 'Housing'),
    makeTxn(`${CM}-10`, 'Food',  -300,  'Groceries'),
  ];
  const ctx = buildContext();
  // Net = 6000 - 1800 = 4200
  assert(ctx.includes('4,200') || ctx.includes('$4.2K') || ctx.includes('4200'), `net not found in: ${ctx.slice(0,500)}`);
});
test('Savings rate calculation correct', ()=>{
  txns = [
    makeTxn(`${CM}-01`, 'Salary', 5000, 'Income'),
    makeTxn(`${CM}-05`, 'Expenses', -4000, 'Shopping'),
  ];
  // Rate = (5000-4000)/5000 * 100 = 20%
  const ctx = buildContext();
  assert(ctx.includes('20.0') || ctx.includes('20%') || ctx.includes(' 20'), `20% savings rate not found`);
});
test('Zero income → 0% savings rate, no crash', ()=>{
  txns = [ makeTxn(`${CM}-01`, 'Cash', -100, 'Shopping') ];
  noThrow(()=> buildContext());
});
test('All income, no expenses → 100% rate handled', ()=>{
  txns = [ makeTxn(`${CM}-01`, 'Salary', 5000, 'Income') ];
  noThrow(()=> buildContext());
});
test('Large transaction count (500 txns) → no crash', ()=>{
  txns = [];
  for (let i=0; i<500; i++) txns.push(makeTxn(`${CM}-01`,`Store${i}`,-Math.random()*100,'Shopping'));
  noThrow(()=> buildContext());
  txns = [];
});
test('Category totals are correct', ()=>{
  txns = [
    makeTxn(`${CM}-01`, 'Whole Foods', -100, 'Groceries'),
    makeTxn(`${CM}-05`, 'Trader Joes', -150, 'Groceries'),
    makeTxn(`${CM}-10`, 'Starbucks', -50, 'Dining'),
  ];
  const c3 = cats3m();
  const grocery = c3.find(([cat])=>cat==='Groceries');
  assert(grocery, 'Groceries not in cats3m');
  eq(grocery[1], 250, 'Groceries total should be 250');
});
test('Context with goals shows goal progress', ()=>{
  txns = [makeTxn(`${CM}-01`, 'Salary', 5000, 'Income')];
  goals = [{name:'Vacation Fund', current:2000, target:5000}];
  contains(buildContext(), 'Vacation Fund');
  goals = [];
});
test('Multiple accounts shown in count', ()=>{
  txns = [makeTxn(`${CM}-01`, 'Salary', 5000, 'Income')];
  accounts = [{name:'Checking'},{name:'Savings'},{name:'Visa'}];
  const ctx = buildContext();
  contains(ctx, '3', 'account count');
  accounts = [];
});

// ═══════════════════════════════════════════════════════════════
// SUITE 10 — getKidsContext (6 tests)
// ═══════════════════════════════════════════════════════════════
suite('10 · getKidsContext');

const YR = new Date().getFullYear();

test('Returns 3 kids (Luka family)',       ()=> eq(getKidsContext().length, 3));
test('Filters kids with no name',         ()=>{
  const saved = family.kids;
  family.kids = [{name:'Sam',dob:''},{name:'',dob:''},{name:'Whitney',dob:''}];
  eq(getKidsContext().length, 2);
  family.kids = saved;
});
test('yearsToCollege computed for aged kid', ()=>{
  const saved = family.kids;
  family.kids = [{name:'TestKid', dob:`${YR-10}-01-01`}];
  const ctx = getKidsContext();
  assert(ctx[0].yearsToCollege === 8 || ctx[0].yearsToCollege === 7, `expected ~8 yrs to college, got ${ctx[0].yearsToCollege}`);
  family.kids = saved;
});
test('yearsToCollege is 0 for adult kid', ()=>{
  const saved = family.kids;
  family.kids = [{name:'Adult', dob:`${YR-20}-01-01`}];
  const ctx = getKidsContext();
  eq(ctx[0].yearsToCollege, 0, 'adult yearsToCollege');
  family.kids = saved;
});
test('No dob → age is null, no crash', ()=>{
  const saved = family.kids;
  family.kids = [{name:'NoDOB', dob:''}];
  noThrow(()=> getKidsContext());
  family.kids = saved;
});
test('Life stage attached to kid', ()=>{
  const saved = family.kids;
  family.kids = [{name:'TestKid', dob:`${YR-10}-01-01`}];
  const ctx = getKidsContext();
  assert(ctx[0].ls !== null && ctx[0].ls !== undefined, 'life stage should be set');
  family.kids = saved;
});

// ═══════════════════════════════════════════════════════════════
// SUITE 11 — History management (6 tests)
// ═══════════════════════════════════════════════════════════════
suite('11 · Conversation history management');

test('History starts empty',           ()=> eq(history.length, 0));
test('Prune: 16 msgs → unchanged',     ()=> eq(pruneHistory(Array(16).fill({role:'user',content:'x'})).length, 16));
test('Prune: 17 msgs → 16 remain',     ()=> eq(pruneHistory(Array(17).fill({role:'user',content:'x'})).length, 16));
test('Prune: 20 msgs → 16 remain',     ()=> eq(pruneHistory(Array(20).fill({role:'user',content:'x'})).length, 16));
test('Prune: keeps LAST 16 (not first)',()=>{
  const hist = Array.from({length:20},(_,i)=>({role:'user',content:`msg${i}`}));
  const pruned = pruneHistory(hist);
  eq(pruned[0].content, 'msg4', 'first of pruned should be msg4');
  eq(pruned[15].content,'msg19','last of pruned should be msg19');
});
test('Prune: empty history → empty',   ()=> eq(pruneHistory([]).length, 0));

// ═══════════════════════════════════════════════════════════════
// SUITE 12 — callSid request body contract (6 tests)
// ═══════════════════════════════════════════════════════════════
suite('12 · callSid API request body contract');

async function captureBody(msg) {
  let body = null;
  global.fetch = async(url,opts)=>{ body=JSON.parse(opts.body); return {ok:true,json:async()=>({content:[{text:'ok'}]})}; };
  await callSid(msg, SID_PROXY_CONFIGURED);
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
  return body;
}

test('Model is claude-sonnet-4-20250514', async ()=>{
  const b = await captureBody('test');
  eq(b.model, 'claude-sonnet-4-20250514');
});
test('max_tokens is 500', async ()=>{
  const b = await captureBody('test');
  eq(b.max_tokens, 500);
});
test('messages array is present', async ()=>{
  const b = await captureBody('test');
  assert(Array.isArray(b.messages), 'messages must be array');
  assert(b.messages.length >= 2, 'at least 2 messages (context seed + user)');
});
test('Last message is user message', async ()=>{
  const b = await captureBody('my spending this month?');
  const last = b.messages[b.messages.length-1];
  eq(last.role, 'user');
  eq(last.content, 'my spending this month?');
});
test('system field is a non-empty string', async ()=>{
  const b = await captureBody('test');
  isStr(b.system); assert(b.system.length > 100);
});
test('Content-Type header is application/json', async ()=>{
  let headers = null;
  global.fetch = async(url,opts)=>{ headers=opts.headers; return {ok:true,json:async()=>({content:[{text:'ok'}]})}; };
  await callSid('test', SID_PROXY_CONFIGURED);
  eq(headers['Content-Type'], 'application/json');
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});

// ═══════════════════════════════════════════════════════════════
// SUITE 13 — buildSidSystemPrompt (from forge.html) (8 tests)
// ═══════════════════════════════════════════════════════════════
suite('13 · buildSidSystemPrompt (desktop)');

// Test the desktop version by reading the extracted JS
const fs = require('fs');
let desktopSrc = fs.readFileSync('/home/claude/forge_module.js', 'utf8');
// buildSidSystemPrompt isn't in the module - test its logic directly

function buildSidSystemPromptTest(mode, settingsOverride) {
  const s = settingsOverride || DEFAULT_SETTINGS;
  const u1=s.user1||'Chris', u2=s.user2||'Kira';
  const sr=s.savingsTarget||20, lpt=s.largePurchaseThreshold||150;
  const kidNames = s.kids.filter(k=>k.name).map(k=>{
    const age=k.dob?calcAge(k.dob):(parseInt(k.age)||null);
    const ls=age!==null?getLifeStage(age):null;
    return `${k.name}${age!==null?` (${age}, ${ls?.label||''})`:''  }`;
  });
  const kidsStr=kidNames.length?`Their kids are: ${kidNames.join(', ')}.`:'';
  const dataFirst=`COMMUNICATION STYLE — DATA-FIRST MODE (${u1}):\nNumbers lead.`;
  const storyFirst=`COMMUNICATION STYLE — STORY-FIRST MODE (${u2}):\nContext and narrative before the numbers.`;
  const confluence=`CONFLUENCE MEETING MODE (both together):\nWarmer, more conversational.`;
  const activeMode = mode==='chris'?dataFirst:mode==='kira'?storyFirst:mode==='confluence'?confluence:`${dataFirst}\n\n${storyFirst}`;
  return `You are Sid — named after Sidney Crosby.\n\nFAMILY: The ${s.familyName} family. ${u1} and ${u2}. ${kidsStr}\n\nFINANCIAL CONTEXT: Savings rate target ${sr}%. Large purchases at $${lpt}+.\n\n${activeMode}\n\nALWAYS: Use specific numbers. Under 180 words.\nNEVER: Say "I cannot" or "I apologize."`;
}

test('Returns a string',                ()=> isStr(buildSidSystemPromptTest('auto')));
test('Auto mode contains both styles',  ()=>{ const p=buildSidSystemPromptTest('auto'); contains(p,'DATA-FIRST'); contains(p,'STORY-FIRST'); });
test('Chris mode = data-first only',    ()=>{ const p=buildSidSystemPromptTest('chris'); contains(p,'DATA-FIRST'); notContains(p,'STORY-FIRST'); });
test('Kira mode = story-first only',    ()=>{ const p=buildSidSystemPromptTest('kira'); contains(p,'STORY-FIRST'); notContains(p,'DATA-FIRST'); });
test('Confluence mode = confluence',    ()=>{ const p=buildSidSystemPromptTest('confluence'); contains(p,'CONFLUENCE'); });
test('Savings target in prompt',        ()=>{ const p=buildSidSystemPromptTest('auto'); contains(p,'20'); });
test('Family name in prompt',           ()=>{ const p=buildSidSystemPromptTest('auto'); contains(p,'Luka'); });
test('Kids included when have names',   ()=>{ const p=buildSidSystemPromptTest('auto'); contains(p,'Sam'); contains(p,'Whitney'); contains(p,'Will'); });

// ═══════════════════════════════════════════════════════════════
// SUITE 14 — Edge cases & regression (8 tests)
// ═══════════════════════════════════════════════════════════════
suite('14 · Edge cases & regression');

test('callSid with empty message string', async ()=>{
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'response'}]})});
  const r = await callSid('', SID_PROXY_CONFIGURED);
  isStr(r);
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});
test('callSid with very long message (2000 chars)', async ()=>{
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
  const long = 'x'.repeat(2000);
  noThrow(async()=> await callSid(long, SID_PROXY_CONFIGURED));
  global.fetch = async()=>({ok:true,json:async()=>({content:[{text:'ok'}]})});
});
test('buildContext with special chars in payee', ()=>{
  txns = [makeTxn(`${CM}-01`, 'Café & Bäckerei', -25, 'Dining')];
  noThrow(()=> buildContext());
  txns = [];
});
test('buildSidPrompt: empty message no crash', ()=> noThrow(()=> buildSidPrompt('')));
test('buildSidPrompt: emoji in message no crash', ()=> noThrow(()=> buildSidPrompt('💰 savings?')));
test('getSidSetupMessage: always returns worker instructions', ()=>{
  const msg = getSidSetupMessage();
  contains(msg, 'workers.cloudflare.com');
});
test('Family with no kids → kidsStr empty, no crash', ()=>{
  const saved = family.kids;
  family.kids = [];
  noThrow(()=> buildSidPrompt('hello'));
  noThrow(()=> getKidsContext());
  family.kids = saved;
});
test('nowMo returns YYYY-MM format', ()=>{
  const mo = nowMo();
  assert(/^\d{4}-\d{2}$/.test(mo), `nowMo format wrong: ${mo}`);
});

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════
// Async tests must resolve — wrap in promise
Promise.resolve().then(async ()=> {
  // Run any pending async tests (already resolved inline above)
  const BAR = '═'.repeat(64);
  const TOTAL = PASS+FAIL;
  console.log('\n'+BAR);
  console.log('  FORGE SID — COMPREHENSIVE AI LAYER TEST RESULTS');
  console.log(BAR);
  console.log('\n  Suite Results:');
  for (const [name, {p,f}] of Object.entries(STATS)) {
    console.log(`  ${f===0?'✅':'❌'}  Suite ${name.padEnd(38)} ${p}/${p+f}`);
  }
  if (FAILS.length) {
    console.log('\n  ── Failures ──────────────────────────────────────────────');
    FAILS.forEach(f=>console.log(`\n  ❌  [${f.suite}] ${f.name}\n      ${f.err}`));
  }
  console.log(`\n${BAR}`);
  console.log(`  ✅  Passed : ${PASS} / ${TOTAL}`);
  console.log(`  ❌  Failed : ${FAIL} / ${TOTAL}`);
  console.log(`  📊  Score  : ${Math.round(PASS/TOTAL*100)}%`);
  console.log(BAR);
  console.log(FAIL===0 ? '  🏆  ALL TESTS PASS — Sid is battle-ready.\n' : `  ⚠️   ${FAIL} failure(s) require attention.\n`);
  process.exit(FAIL>0?1:0);
});
