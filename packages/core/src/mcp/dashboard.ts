import type { Pool } from "mysql2/promise";

export interface DashboardViewer {
  name: string;
  capabilities: Set<string>;
}

/**
 * Server sends a static SPA shell; the client fetches /api/* (operator session
 * required) and renders the management console. All data and actions are gated
 * server-side; values are HTML-escaped client-side before insertion. Light theme.
 */
export async function renderDashboard(_pool: Pool, _viewer: DashboardViewer | null): Promise<string> {
  return SHELL;
}

const SHELL = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Utility Watch — Console</title>
<link rel="icon" href="/logo.png?v=2">
<script src="https://cdn.tailwindcss.com?plugins=forms"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  body{background:#ffffff;color:#0f172a;font-family:Inter,system-ui,sans-serif;margin:0}
  h1,h2,.head{font-family:'Space Grotesk',Inter,sans-serif}
  code,.mono{font-family:'JetBrains Mono',monospace}
  .card{background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
  .pill{display:inline-block;font-size:11px;padding:2px 9px;border-radius:999px;border:1px solid #e2e8f0;color:#64748b}
  code{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:1px 6px;font-size:12px;color:#0e7490}
  .field{background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;font-size:13px;color:#0f172a;outline:none}
  .field:focus{border-color:#0891b2}
  .btn{background:#0891b2;color:#fff;font-weight:600;font-size:12.5px;padding:7px 13px;border-radius:8px;border:none;cursor:pointer}
  .btn:hover{background:#0e7490}
  .btn-ghost{background:transparent;border:1px solid #cbd5e1;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer;color:#334155}
  .btn-ghost:hover{border-color:#94a3b8}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;text-align:left;padding:8px 12px}
  td{padding:8px 12px;border-top:1px solid #e2e8f0}
  .nav{display:block;width:100%;text-align:left;padding:9px 12px;border-radius:9px;color:#475569;font-size:14px;cursor:pointer;border:none;background:transparent}
  .nav:hover{background:#f1f5f9;color:#0f172a}
  .nav.active{background:#ecfeff;color:#0e7490;font-weight:600}
  .st-needs_review{color:#b45309}.st-approved{color:#047857}.st-exported{color:#0e7490}.st-rejected{color:#b91c1c}.st-failed{color:#b91c1c}
</style></head>
<body>
<div id="app" class="min-h-screen"></div>
<script>
const mk = (h) => { const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstChild; };
const esc = (s) => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let ME = { authenticated:false, capabilities:[] };
const can = (c) => ME.capabilities.indexOf(c) >= 0;

function csrf(){ const m=document.cookie.match(/(?:^|;\s*)uw_csrf=([^;]+)/); return m?decodeURIComponent(m[1]):''; }
async function api(path, method, body){
  const h={}; if(body) h['content-type']='application/json';
  const mth=method||'GET'; if(mth!=='GET'&&mth!=='HEAD') h['x-csrf-token']=csrf();
  const r = await fetch(path,{method:mth,headers:h,body:body?JSON.stringify(body):undefined});
  let j={}; try{ j=await r.json(); }catch(_){}
  if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
  return j;
}

async function boot(){
  ME = await api('/api/me');
  if(!ME.authenticated){ renderLogin(); return; }
  renderApp(); show('overview');
}

function renderLogin(){
  const app=document.getElementById('app'); app.replaceChildren();
  app.appendChild(mk('<div class="flex items-center justify-center min-h-screen"><div class="card p-7" style="width:360px"><div class="flex items-center gap-2 mb-2"><img src="/logo.png?v=2" width="30" height="30" class="rounded-lg"><h1 class="text-2xl font-bold">Utility Watch<span style="color:#0891b2">.</span></h1></div><p class="text-slate-500 text-sm mt-1 mb-5">Operator console. Sign in to manage providers, accounts, bills, users, and reports.</p><input id="email" class="field w-full mb-2" type="email" placeholder="operator@email" autocomplete="username"><input id="password" class="field w-full mb-3" type="password" placeholder="password" autocomplete="current-password"><button class="btn w-full" id="loginBtn">Sign in</button><p id="loginErr" class="text-red-600 text-xs mt-2"></p></div></div>'));
  document.getElementById('loginBtn').onclick = async () => {
    try{ await api('/login','POST',{email:document.getElementById('email').value,password:document.getElementById('password').value}); boot(); }
    catch(e){ document.getElementById('loginErr').textContent = e.message; }
  };
  document.getElementById('password').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });
}

const SECTIONS = [['overview','Overview'],['properties','Properties'],['obligations','Accounts & balances'],['alerts','Alerts'],['health','Scraper health'],['trends','Trends'],['calendar','Calendar'],['providers','Providers'],['accounts','Logins'],['bills','Bills'],['history','History'],['users','Users'],['audit','Audit'],['reports','Reports']];

function renderApp(){
  const app=document.getElementById('app'); app.replaceChildren();
  app.appendChild(mk('<div class="flex min-h-screen"><aside class="w-60 shrink-0 border-r border-slate-200 p-4 flex flex-col"><div class="px-2 mb-5 flex items-center gap-2"><img src="/logo.png?v=2" width="26" height="26" class="rounded-md"><div><div class="head font-bold">Utility Watch</div><div class="text-[11px] text-slate-500">operator console</div></div></div><nav id="nav" class="space-y-1 flex-1"></nav><div class="border-t border-slate-200 pt-3 text-sm text-slate-500"><div class="px-2">Signed in as <b class="text-slate-900" id="who"></b></div><button class="btn-ghost mt-2 w-full" id="logoutBtn">Sign out</button></div></aside><main id="main" class="flex-1 p-7 overflow-auto"></main></div>'));
  document.getElementById('who').textContent = ME.name||'operator';
  const nav = document.getElementById('nav');
  SECTIONS.forEach(s=>{ const b=mk('<button class="nav" data-sec="'+s[0]+'">'+s[1]+'</button>'); b.onclick=()=>show(s[0]); nav.appendChild(b); });
  document.getElementById('logoutBtn').onclick = async ()=>{ await fetch('/logout',{method:'POST'}); boot(); };
}

function setActive(id){ document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.sec===id)); }
function panel(title, bodyHtml){ return '<h1 class="text-2xl font-bold mb-1">'+esc(title)+'</h1><div class="mt-4">'+bodyHtml+'</div>'; }
function tbl(cols, rows){ return '<div class="card overflow-hidden"><table><thead><tr>'+cols.map(c=>'<th'+(c.r?' class="text-right"':'')+'>'+c.h+'</th>').join('')+'</tr></thead><tbody>'+(rows||'<tr><td colspan="'+cols.length+'" class="text-slate-500">none</td></tr>')+'</tbody></table></div>'; }
const money = (c,a)=> a==null?'—':(esc(c||'')+' '+esc(a));
const stPill = (s)=>'<span class="pill st-'+esc(s)+'">'+esc(s)+'</span>';

async function show(id){
  setActive(id);
  const main=document.getElementById('main');
  main.innerHTML='<div class="text-slate-500">Loading…</div>';
  try{
    if(id==='overview'){ main.innerHTML = await viewOverview(); return; }
    if(id==='providers'){ main.innerHTML = await viewProviders(); bindProviders(); return; }
    if(id==='accounts'){ main.innerHTML = await viewAccounts(); bindAccounts(); return; }
    if(id==='bills'){ main.innerHTML = await viewBills(); bindActions(); return; }
    if(id==='history'){ main.innerHTML = await viewHistory(); return; }
    if(id==='users'){ main.innerHTML = await viewUsers(); bindUsers(); return; }
    if(id==='properties'){ main.innerHTML = await viewProperties(); bindProperties(); return; }
    if(id==='obligations'){ main.innerHTML = await viewObligations(); bindObligations(); return; }
    if(id==='alerts'){ main.innerHTML = await viewAlerts(); bindObligations(); return; }
    if(id==='health'){ main.innerHTML = await viewHealth(); return; }
    if(id==='trends'){ main.innerHTML = await viewTrends(); await bindTrends(); return; }
    if(id==='calendar'){ main.innerHTML = await viewCalendar(); bindCalendar(); return; }
    if(id==='audit'){ main.innerHTML = await viewAudit(); return; }
    if(id==='reports'){ main.innerHTML = await viewReports(); return; }
  }catch(e){ main.innerHTML = '<div class="text-red-600">'+esc(e.message)+'</div>'; }
}

async function viewOverview(){
  const r = await Promise.all([api('/api/overview'), api('/api/kpis').catch(()=>null)]);
  const o=r[0], k=r[1]; const t=o.totals;
  var tok=null; if(can('users.manage')){ try{ tok=await api('/api/mcp-token'); }catch(_){} }
  const card=(label,val,color)=>'<div class="card p-4"><div class="text-slate-500 text-xs uppercase tracking-wide">'+label+'</div><div class="text-2xl font-bold mt-1"'+(color?' style="color:'+color+'"':'')+'>'+val+'</div></div>';
  var kpiHtml='';
  if(k){ kpiHtml = '<div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Money</div><div class="grid grid-cols-4 gap-3 mb-5">'+
    card('Total owed','USD '+Number(k.totalOwed).toFixed(2))+
    card('Overdue ('+k.overdueCount+')','USD '+Number(k.overdueTotal).toFixed(2),'#b91c1c')+
    card('Paid this month','USD '+Number(k.paidThisMonth).toFixed(2),'#047857')+
    card('Accounts owing','+'+k.dueCount+'/'+k.accountCount)+'</div>'; }
  var tokHtml='';
  if(tok){ tokHtml = tok.enabled
    ? '<div class="mt-3 text-sm"><span class="text-slate-500">Agent token (Authorization: Bearer):</span> <code>'+esc(tok.token)+'</code></div>'
    : '<div class="mt-3 text-sm text-slate-500">Agent token: <b>not set</b> — the /mcp endpoint is open. Set <code>MCP_AUTH_TOKEN</code> to require a bearer token.</div>'; }
  return panel('Overview',
   kpiHtml+
   '<div class="text-xs uppercase tracking-widest text-slate-500 mb-2">System</div><div class="grid grid-cols-3 gap-3">'+card('Providers',t.providers)+card('Accounts',t.accounts)+card('Bills',t.bills)+card('Runs',t.runs)+card('Users',t.users)+card('Total due','USD '+Number(t.total_due).toFixed(2))+'</div>'+
   '<div class="card p-5 mt-4"><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Agent Interface (MCP)</div><div class="mono text-cyan-700 text-sm">'+esc(location.origin)+'/mcp</div><div class="text-slate-500 text-sm mt-2">Tools: list_providers · list_bills · run_retrieval · get_bill · diagnose_run · export_bill/propose_review (gated)</div>'+tokHtml+'</div>');
}

async function viewAudit(){
  const rows = await api('/api/audit');
  const oPill=(o)=> o==='deny'||o==='fail' ? '<span class="pill st-rejected">'+esc(o)+'</span>' : '<span class="pill st-approved">'+esc(o)+'</span>';
  const body = rows.map(function(r){ var tgt = r.target_type ? esc(r.target_type)+(r.target_id?(' #'+esc(r.target_id)):'') : '—'; return '<tr><td class="text-slate-500 mono text-xs">'+esc(r.ts)+'</td><td>'+esc(r.actor||'—')+'</td><td><code>'+esc(r.action)+'</code></td><td class="text-slate-500">'+tgt+'</td><td>'+oPill(r.outcome)+'</td><td class="text-slate-500 mono text-xs">'+esc(r.ip||'—')+'</td></tr>'; }).join('');
  return panel('Audit log', '<p class="text-slate-500 text-sm mb-3">Most recent 200 actions (logins, installs, ingests, reviews, exports, denials).</p>'+tbl([{h:'Time'},{h:'Actor'},{h:'Action'},{h:'Target'},{h:'Outcome'},{h:'IP'}], body));
}

async function viewProviders(){
  const ps = await api('/api/providers');
  const rows = ps.map(p=>'<tr><td><code>'+esc(p.id)+'</code></td><td>'+esc(p.name)+'</td><td class="text-slate-500">'+esc((p.serviceTypes||[]).join(', '))+'</td><td class="text-slate-500">'+esc(p.kind||'code')+'</td><td>'+(p.installed?'<span class="pill st-approved">installed</span>':'<span class="pill">registry</span>')+'</td><td class="text-right">'+((!p.installed && can('providers.install'))?'<button class="btn-ghost" data-install="'+esc(p.id)+'">Install</button>':'—')+'</td></tr>').join('');
  const add = can('providers.install') ? '<div class="card p-4 mb-4"><div class="font-semibold mb-1">Add a declarative provider</div><div class="text-xs text-slate-500 mb-2">Paste a uw-plugin-v1 manifest with kind "declarative" and a parser block. No code — bills are normalized by declarative rules; ingest via Upload/Fetch on its accounts.</div><textarea id="reg-man" class="field w-full" rows="6" placeholder="uw-plugin-v1 manifest JSON (kind: declarative, with a parser block)"></textarea><div class="mt-2"><button class="btn" id="reg-btn">Register provider</button> <span id="reg-msg" class="text-xs text-slate-500"></span></div></div>' : '';
  return panel('Providers (utility companies as plugins)', add + tbl([{h:'ID'},{h:'Name'},{h:'Service'},{h:'Kind'},{h:'State'},{h:'Action',r:1}], rows));
}
function bindProviders(){
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=async()=>{ try{ await api('/api/providers/install','POST',{id:b.dataset.install}); show('providers'); }catch(e){ alert(e.message); } });
  const reg=document.getElementById('reg-btn');
  if(reg) reg.onclick=async()=>{ const msg=document.getElementById('reg-msg'); msg.textContent='Registering…'; try{ const r=await api('/api/providers/register','POST',{manifest:document.getElementById('reg-man').value}); msg.textContent='Registered '+r.id; show('providers'); }catch(e){ msg.textContent=e.message; } };
}

async function viewAccounts(){
  const res = await Promise.all([api('/api/accounts'), api('/api/providers')]);
  const accts=res[0], installed=res[1].filter(p=>p.installed);
  const rows = accts.map(function(a){ var act='—'; if(can('jobs.run')){ act = a.kind==='declarative' ? '<button class="btn-ghost" data-upload="'+a.id+'">Upload bill</button> <button class="btn-ghost" data-fetch="'+a.id+'">Fetch URL</button>' : '<button class="btn-ghost" data-run="'+a.id+'">Run retrieval</button>'; } return '<tr><td>#'+a.id+'</td><td><code>'+esc(a.provider)+'</code></td><td>'+esc(a.displayName)+'</td><td class="text-slate-500">'+esc(a.kind||'code')+'</td><td>'+esc(a.status)+'</td><td class="text-right">'+act+'</td></tr>'; }).join('');
  const form = can('accounts.create') ? '<div class="card p-4 mb-4 flex flex-wrap gap-2 items-end"><div><div class="text-xs text-slate-500 mb-1">Provider</div><select id="acc-prov" class="field">'+installed.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></div><div><div class="text-xs text-slate-500 mb-1">Display name</div><input id="acc-name" class="field" placeholder="e.g. Main office"></div><div><div class="text-xs text-slate-500 mb-1">Account ref</div><input id="acc-ref" class="field" placeholder="optional"></div><button class="btn" id="acc-add">Add account</button></div>' : '';
  return panel('Accounts', form + tbl([{h:'ID'},{h:'Provider'},{h:'Name'},{h:'Kind'},{h:'Status'},{h:'Action',r:1}], rows));
}
function bindAccounts(){
  const add=document.getElementById('acc-add');
  if(add) add.onclick=async()=>{ try{ await api('/api/accounts','POST',{providerId:document.getElementById('acc-prov').value,displayName:document.getElementById('acc-name').value,ref:document.getElementById('acc-ref').value}); show('accounts'); }catch(e){ alert(e.message); } };
  document.querySelectorAll('[data-run]').forEach(b=>b.onclick=async()=>{ b.disabled=true; b.textContent='Running…'; try{ await api('/api/actions/run','POST',{accountId:Number(b.dataset.run)}); show('bills'); }catch(e){ alert(e.message); show('accounts'); } });
  document.querySelectorAll('[data-upload]').forEach(b=>b.onclick=async()=>{ const content=prompt('Paste the bill text or JSON to normalize:'); if(content==null||content==='') return; try{ await api('/api/actions/ingest','POST',{accountId:Number(b.dataset.upload),content:content}); show('bills'); }catch(e){ alert(e.message); } });
  document.querySelectorAll('[data-fetch]').forEach(b=>b.onclick=async()=>{ const url=prompt('Public bill URL to fetch (SSRF-guarded, must match provider allowlist):'); if(!url) return; b.disabled=true; b.textContent='Fetching…'; try{ await api('/api/actions/ingest','POST',{accountId:Number(b.dataset.fetch),url:url}); show('bills'); }catch(e){ alert(e.message); show('accounts'); } });
}

async function viewBills(){
  const bs = await api('/api/bills');
  const rows = bs.map(b=>{
    const parts=[];
    if(can('bills.review') && b.status==='needs_review'){ parts.push('<button class="btn-ghost" style="color:#047857" data-rev="'+b.id+'" data-dec="approve">Approve</button>'); parts.push('<button class="btn-ghost" style="color:#b91c1c" data-rev="'+b.id+'" data-dec="reject">Reject</button>'); }
    if(can('bills.export')) parts.push('<button class="btn-ghost" style="color:#0e7490'+(b.status==='approved'?'':';opacity:.35;pointer-events:none')+'" data-exp="'+b.id+'">Export</button>');
    const act = parts.length?parts.join(' '):'—';
    return '<tr><td>#'+b.id+'</td><td><code>'+esc(b.provider_id)+'</code></td><td>'+money(b.currency,b.amount_due)+'</td><td class="text-slate-500">'+esc(b.due_date||'—')+'</td><td class="mono text-cyan-700">'+(b.confidence_score==null?'—':Number(b.confidence_score).toFixed(2))+'</td><td>'+stPill(b.status)+'</td><td class="text-right space-x-1">'+act+'</td></tr>';
  }).join('');
  return panel('Bills', tbl([{h:'Bill'},{h:'Provider'},{h:'Amount'},{h:'Due'},{h:'Confidence'},{h:'Status'},{h:'Actions',r:1}], rows));
}
function bindActions(){
  document.querySelectorAll('[data-rev]').forEach(b=>b.onclick=async()=>{ try{ await api('/api/actions/review','POST',{billId:Number(b.dataset.rev),decision:b.dataset.dec}); show('bills'); }catch(e){ alert(e.message); } });
  document.querySelectorAll('[data-exp]').forEach(b=>b.onclick=async()=>{ try{ const r=await api('/api/actions/export','POST',{billId:Number(b.dataset.exp)}); alert('Exported: '+r.path); show('bills'); }catch(e){ alert(e.message); } });
}

async function viewHistory(){
  const rs = await api('/api/runs');
  const rows = rs.map(r=>'<tr><td>#'+r.id+'</td><td><code>'+esc(r.provider_id)+'</code></td><td>'+esc(r.account||'—')+'</td><td class="text-slate-500">'+esc(r.adapter)+'</td><td>'+stPill(r.status)+'</td><td class="text-slate-500">'+esc(r.error_code||'')+'</td><td class="text-slate-500">'+esc(r.started_at||'')+'</td></tr>').join('');
  return panel('Run history', tbl([{h:'Run'},{h:'Provider'},{h:'Account'},{h:'Adapter'},{h:'Status'},{h:'Error'},{h:'Started'}], rows));
}

async function viewUsers(){
  if(!can('users.manage')) return panel('Users','<div class="text-slate-500">You lack the users.manage capability.</div>');
  const us = await api('/api/users');
  const rows = us.map(u=>'<tr><td>#'+u.id+'</td><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td class="text-slate-500">'+esc(u.roles||'—')+'</td><td>'+esc(u.status)+'</td></tr>').join('');
  const form = '<div class="card p-4 mb-4 flex flex-wrap gap-2 items-end"><div><div class="text-xs text-slate-500 mb-1">Name</div><input id="u-name" class="field"></div><div><div class="text-xs text-slate-500 mb-1">Email</div><input id="u-email" class="field" type="email"></div><div><div class="text-xs text-slate-500 mb-1">Password</div><input id="u-pass" class="field" type="password"></div><div><div class="text-xs text-slate-500 mb-1">Role</div><select id="u-role" class="field"><option>operator</option><option>reviewer</option><option>auditor</option><option>admin</option></select></div><button class="btn" id="u-add">Add user</button></div>';
  return panel('Users', form + tbl([{h:'ID'},{h:'Name'},{h:'Email'},{h:'Roles'},{h:'Status'}], rows));
}
function bindUsers(){
  const add=document.getElementById('u-add');
  if(add) add.onclick=async()=>{ try{ await api('/api/users','POST',{name:document.getElementById('u-name').value,email:document.getElementById('u-email').value,password:document.getElementById('u-pass').value,roleCode:document.getElementById('u-role').value}); show('users'); }catch(e){ alert(e.message); } };
}

function oblPill(s){ var c=({overdue:'#b91c1c',due:'#b45309',paid:'#047857',arrangement:'#0e7490',cancelled:'#64748b',unknown:'#94a3b8'})[s]||'#64748b'; return '<span class="pill" style="color:'+c+';border-color:'+c+'55">'+esc(s)+'</span>'; }
function oblBadges(o){ var b=''; if(+o.is_autopay) b+=' <span class="pill" title="On autopay — do not pay manually" style="color:#0e7490;border-color:#0891b255">🔁 auto</span>'; if(+o.paid_by_tenant) b+=' <span class="pill" title="Paid by tenant" style="color:#475569;border-color:#94a3b855">👤 tenant</span>'; if(+o.is_payment_arrangement) b+=' <span class="pill" title="Payment arrangement" style="color:#b45309;border-color:#b4530955">plan</span>'; return b; }

async function viewTrends(){
  return panel('Trends','<div class="grid grid-cols-2 gap-4"><div class="card p-4"><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Payments by month</div><canvas id="ch-pay" height="150"></canvas></div><div class="card p-4"><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Currently owed by category</div><canvas id="ch-cat" height="150"></canvas></div></div>');
}
async function bindTrends(){
  let d; try{ d=await api('/api/trends'); }catch(e){ return; }
  if(!window.Chart) return;
  const pc=document.getElementById('ch-pay'); if(pc) new Chart(pc,{type:'bar',data:{labels:d.paymentsByMonth.map(x=>x.ym),datasets:[{label:'Paid',data:d.paymentsByMonth.map(x=>x.total),backgroundColor:'#0891b2'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  const cc=document.getElementById('ch-cat'); if(cc) new Chart(cc,{type:'doughnut',data:{labels:d.owedByCategory.map(x=>x.category),datasets:[{data:d.owedByCategory.map(x=>x.total),backgroundColor:['#0891b2','#b45309','#047857','#7c3aed','#b91c1c','#64748b','#0e7490']}]},options:{responsive:true}});
}

async function viewCalendar(){
  const obs = await api('/api/obligations');
  const now=new Date(); const ym = window.__calYM || (now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));
  const parts=ym.split('-'); const Y=Number(parts[0]); const M=Number(parts[1]);
  const startDow=new Date(Y,M-1,1).getDay(); const days=new Date(Y,M,0).getDate();
  const byDay={};
  obs.forEach(o=>{ var d=null; if(o.due_day&&o.due_day>=1&&o.due_day<=31) d=o.due_day; else if(o.current_due_date){ const cd=String(o.current_due_date); if(cd.slice(0,7)===ym) d=Number(cd.slice(8,10)); } if(d&&Number(o.current_balance)>0){ (byDay[d]=byDay[d]||[]).push(o); } });
  var cells=''; for(var i=0;i<startDow;i++) cells+='<td style="height:92px;width:14%"></td>';
  for(var dd=1;dd<=days;dd++){ const items=byDay[dd]||[]; const sum=items.reduce((s,o)=>s+Number(o.current_balance||0),0);
    cells+='<td class="align-top border-t border-l border-slate-200 p-1" style="height:92px;width:14%"><div class="text-xs text-slate-400">'+dd+'</div>'+(items.length?'<div class="text-xs font-bold" style="color:#b45309">USD '+sum.toFixed(0)+'</div>'+items.slice(0,3).map(o=>'<div class="text-[10px] text-slate-500 truncate">'+esc(o.provider_id)+'</div>').join(''):'')+'</td>';
    if((startDow+dd)%7===0) cells+='</tr><tr>'; }
  const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>'<th class="text-xs text-slate-500 p-1">'+x+'</th>').join('');
  return panel('Calendar — due dates',
    '<div class="flex items-center gap-3 mb-3"><button class="btn-ghost" id="cal-prev">←</button><b>'+esc(ym)+'</b><button class="btn-ghost" id="cal-next">→</button><span class="text-slate-500 text-sm">amounts due by day (recurring due-day, then statement due date)</span></div>'+
    '<div class="card overflow-hidden"><table class="w-full" style="table-layout:fixed"><thead><tr>'+dow+'</tr></thead><tbody><tr>'+cells+'</tr></tbody></table></div>');
}
function bindCalendar(){
  const now=new Date(); const ym=window.__calYM||(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));
  const shift=(n)=>{ const p=ym.split('-'); var Y=Number(p[0]),M=Number(p[1])+n; if(M<1){M=12;Y--;} if(M>12){M=1;Y++;} window.__calYM=Y+'-'+String(M).padStart(2,'0'); show('calendar'); };
  const pv=document.getElementById('cal-prev'); if(pv) pv.onclick=()=>shift(-1);
  const nx=document.getElementById('cal-next'); if(nx) nx.onclick=()=>shift(1);
}

async function viewHealth(){
  const h = await api('/api/health');
  const pill=(ok,s)=> ok ? '<span class="pill st-approved">ok</span>' : '<span class="pill st-rejected">'+esc(s)+'</span>';
  const rows = h.map(x=>'<tr><td><code>'+esc(x.provider_id)+'</code></td><td>'+x.accounts+'</td><td class="text-slate-500 mono text-xs">'+esc(String(x.last_success||'—').slice(0,16))+'</td><td class="text-slate-500 mono text-xs">'+esc(String(x.last_run||'—').slice(0,16))+'</td><td>'+x.failed+'/'+x.total+'</td><td>'+pill(x.healthy,x.last_status)+'</td></tr>').join('');
  return panel('Scraper health', '<p class="text-slate-500 text-sm mb-3">Last successful retrieval per portal. Red = the last run failed — the portal may have changed or credentials expired.</p>'+tbl([{h:'Provider'},{h:'Accounts'},{h:'Last success'},{h:'Last run'},{h:'Failed/Total'},{h:'Status'}], rows));
}

async function viewAlerts(){
  const obs = await api('/api/obligations?status=overdue');
  const total = obs.reduce((s,o)=>s+Number(o.current_balance||0),0);
  const rows = obs.map(o=>'<tr class="cursor-pointer hover:bg-slate-50" data-obl="'+o.id+'"><td><code>'+esc(o.provider_id)+'</code></td><td>'+esc(o.account_ref)+'</td><td class="text-slate-500">'+esc(o.property_name||'—')+'</td><td class="text-right font-semibold">USD '+Number(o.current_balance||0).toFixed(2)+'</td><td class="text-slate-500">'+esc(o.current_due_date||'—')+'</td></tr>').join('');
  return panel('Alerts — overdue',
    '<div class="card p-5 mb-4" style="border-color:#fecaca;background:#fef2f2"><div class="text-xs uppercase tracking-widest" style="color:#b91c1c">Overdue total</div><div class="text-3xl font-bold mt-1" style="color:#b91c1c">USD '+total.toFixed(2)+'</div><div class="text-slate-500 text-sm mt-1">'+obs.length+' account(s) past due</div></div>'+
    tbl([{h:'Provider'},{h:'Account'},{h:'Property'},{h:'Owed',r:1},{h:'Due'}], rows));
}

async function viewProperties(){
  const ps = await api('/api/properties');
  const grand = ps.reduce((s,p)=>s+Number(p.total_balance||0),0);
  const rows = ps.map(p=>'<tr class="cursor-pointer hover:bg-slate-50" data-prop="'+p.id+'" data-name="'+esc(p.name)+'"><td><b>'+esc(p.name)+'</b></td><td class="text-slate-500">'+esc(p.type||'—')+'</td><td class="text-slate-500">'+esc(p.address||'—')+'</td><td>'+p.obligation_count+'</td><td class="text-right font-semibold">USD '+Number(p.total_balance||0).toFixed(2)+'</td></tr>').join('');
  const form = can('accounts.create') ? '<div class="card p-4 mb-4 flex flex-wrap gap-2 items-end"><div><div class="text-xs text-slate-500 mb-1">New property</div><input id="prop-name" class="field" placeholder="Name"></div><div><input id="prop-type" class="field" placeholder="Type"></div><div><input id="prop-addr" class="field" placeholder="Address"></div><button class="btn" id="prop-add">Add property</button></div>' : '';
  return panel('Properties',
    '<div class="card p-5 mb-4"><div class="text-xs uppercase tracking-widest text-slate-500">Total currently owed</div><div class="text-3xl font-bold mt-1">USD '+grand.toFixed(2)+'</div><div class="text-slate-500 text-sm mt-1">'+ps.length+' properties · click a row to see its accounts</div></div>'+
    form + tbl([{h:'Property'},{h:'Type'},{h:'Address'},{h:'Accounts'},{h:'Owed',r:1}], rows));
}
function bindProperties(){
  const add=document.getElementById('prop-add');
  if(add) add.onclick=async()=>{ try{ await api('/api/properties','POST',{name:document.getElementById('prop-name').value,type:document.getElementById('prop-type').value,address:document.getElementById('prop-addr').value}); show('properties'); }catch(e){ alert(e.message); } };
  document.querySelectorAll('[data-prop]').forEach(r=>r.onclick=()=>{ window.__oblProp={id:r.dataset.prop,name:r.dataset.name}; show('obligations'); });
}

async function viewObligations(){
  const filt = window.__oblProp;
  const params=[]; if(filt) params.push('property='+filt.id); if(window.__oblSearch) params.push('search='+encodeURIComponent(window.__oblSearch));
  const obs = await api('/api/obligations'+(params.length?('?'+params.join('&')):''));
  const grand = obs.reduce((s,o)=>s+Number(o.current_balance||0),0);
  const gmode = window.__oblGroup || (filt?'none':'property'); // property | category | none
  const cell = (o)=>'<td><code>'+esc(o.provider_id)+'</code></td><td>'+esc(o.account_ref)+'</td><td class="text-slate-500">'+esc(o.property_name||'—')+'</td><td class="text-right font-semibold">'+(o.current_balance==null?'—':'USD '+Number(o.current_balance).toFixed(2))+'</td><td class="text-slate-500">'+esc(o.current_due_date||'—')+'</td><td>'+oblPill(o.status)+oblBadges(o)+'</td>';
  var body;
  if(gmode==='none'){
    body = obs.map(o=>'<tr class="cursor-pointer hover:bg-slate-50" data-obl="'+o.id+'">'+cell(o)+'</tr>').join('');
  } else {
    const keyFn = gmode==='category' ? (o=>o.utility_type||'(uncategorized)') : (o=>o.property_name||'(unassigned)');
    const groups={}; obs.forEach(o=>{const k=keyFn(o); (groups[k]=groups[k]||[]).push(o);});
    body = Object.keys(groups).sort().map(k=>{
      const sub=groups[k].reduce((s,o)=>s+Number(o.current_balance||0),0);
      return '<tr style="background:#f1f5f9"><td colspan="5" class="font-semibold">'+esc(k)+' <span class="text-slate-400">('+groups[k].length+')</span></td><td class="text-right font-semibold">USD '+sub.toFixed(2)+'</td></tr>'+
        groups[k].map(o=>'<tr class="cursor-pointer hover:bg-slate-50" data-obl="'+o.id+'">'+cell(o)+'</tr>').join('');
    }).join('');
  }
  const hdr = filt?'<div class="mb-3 text-sm"><button class="btn-ghost" id="obl-clear">← All properties</button> <b>'+esc(filt.name)+'</b></div>':'';
  const tog = (m,l)=>'<button class="btn-ghost'+(gmode===m?' nav active':'')+'" data-group="'+m+'">'+l+'</button>';
  return panel('Accounts & balances',
    hdr+'<div class="card p-4 mb-4 flex gap-4 items-end"><div><div class="text-xs text-slate-500 uppercase">Owed'+(filt?' (this property)':'')+'</div><div class="text-2xl font-bold">USD '+grand.toFixed(2)+'</div></div><div class="flex-1"></div><div class="flex gap-1 items-center"><span class="text-xs text-slate-500 mr-1">Group:</span>'+tog('property','Property')+tog('category','Category')+tog('none','None')+'</div><a class="btn-ghost" href="/api/export.csv">CSV</a><div><div class="text-xs text-slate-500 mb-1">Search</div><input id="obl-search" class="field" placeholder="provider / account / property" value="'+esc(window.__oblSearch||'')+'"></div></div>'+
    tbl([{h:'Provider'},{h:'Account'},{h:'Property'},{h:'Owed',r:1},{h:'Due'},{h:'Status'}], body));
}
function bindObligations(){
  const clr=document.getElementById('obl-clear'); if(clr) clr.onclick=()=>{ window.__oblProp=null; show('obligations'); };
  const s=document.getElementById('obl-search'); if(s) s.onchange=()=>{ window.__oblSearch=s.value; show('obligations'); };
  document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{ window.__oblGroup=b.dataset.group; show('obligations'); });
  document.querySelectorAll('[data-obl]').forEach(r=>r.onclick=()=>showObligation(r.dataset.obl));
}

async function showObligation(id){
  const main=document.getElementById('main'); main.innerHTML='<div class="text-slate-500">Loading…</div>';
  try{
    const res=await Promise.all([api('/api/obligations/'+id), api('/api/properties')]);
    const o=res[0], props=res[1];
    const hist=(o.history||[]).map(h=>'<tr><td class="text-slate-500 mono text-xs">'+esc(String(h.started_at||'').slice(0,16))+'</td><td class="text-right">'+(h.amount_due==null?'—':'USD '+Number(h.amount_due).toFixed(2))+'</td><td class="text-slate-500">'+esc(h.due_date||'—')+'</td><td class="text-slate-500">'+esc(h.status)+'</td></tr>').join('');
    const pays=(o.payments||[]).map(p=>'<tr><td>'+esc(p.payment_date)+'</td><td class="text-right">USD '+Number(p.amount).toFixed(2)+'</td><td class="text-slate-500">'+esc(p.payment_method||'—')+'</td><td class="text-slate-500">'+esc(p.source)+'</td></tr>').join('');
    const opts='<option value="">— unassigned —</option>'+props.map(p=>'<option value="'+p.id+'"'+(o.property_id==p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('');
    main.innerHTML = panel(esc(o.provider_id)+' · '+esc(o.account_ref),
      '<button class="btn-ghost mb-4" id="o-back">← Back</button>'+
      '<div class="grid grid-cols-3 gap-3 mb-4">'+
        '<div class="card p-4"><div class="text-xs text-slate-500 uppercase">Current balance</div><div class="text-2xl font-bold mt-1">'+(o.current_balance==null?'—':'USD '+Number(o.current_balance).toFixed(2))+'</div></div>'+
        '<div class="card p-4"><div class="text-xs text-slate-500 uppercase">Due</div><div class="text-lg font-semibold mt-1">'+esc(o.current_due_date||'—')+'</div></div>'+
        '<div class="card p-4"><div class="text-xs text-slate-500 uppercase">Status</div><div class="mt-2">'+oblPill(o.status)+'</div></div>'+
      '</div>'+
      '<div class="card p-4 mb-4 flex flex-wrap gap-3 items-end">'+
        '<div><div class="text-xs text-slate-500 mb-1">Property</div><select id="o-prop" class="field">'+opts+'</select></div>'+
        (can('accounts.create')?'<button class="btn-ghost" id="o-save">Save</button>':'')+
        '<div class="flex-1"></div>'+
        (can('bills.review')?'<div><div class="text-xs text-slate-500 mb-1">Record payment</div><input id="o-amt" class="field" placeholder="Amount" style="width:120px"></div><button class="btn" id="o-pay">Add payment</button>':'')+
      '</div>'+
      '<div class="grid grid-cols-2 gap-4">'+
        '<div><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Statement history</div>'+tbl([{h:'Run'},{h:'Amount',r:1},{h:'Due'},{h:'Status'}],hist)+'</div>'+
        '<div><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Payments</div>'+tbl([{h:'Date'},{h:'Amount',r:1},{h:'Method'},{h:'Source'}],pays)+'</div>'+
      '</div>');
    document.getElementById('o-back').onclick=()=>show('obligations');
    const sv=document.getElementById('o-save'); if(sv) sv.onclick=async()=>{ try{ await api('/api/obligations/'+id,'POST',{property_id:document.getElementById('o-prop').value||null}); showObligation(id); }catch(e){ alert(e.message); } };
    const pay=document.getElementById('o-pay'); if(pay) pay.onclick=async()=>{ const amt=Number(document.getElementById('o-amt').value); if(!(amt>0)){alert('Enter a positive amount');return;} try{ await api('/api/payments','POST',{obligationId:Number(id),amount:amt}); showObligation(id); }catch(e){ alert(e.message); } };
  }catch(e){ main.innerHTML='<div class="text-red-600">'+esc(e.message)+'</div>'; }
}

async function viewReports(){
  const o = await api('/api/overview');
  const statusRows = o.byStatus.map(s=>'<tr><td>'+stPill(s.status)+'</td><td>'+s.count+'</td><td>USD '+Number(s.total).toFixed(2)+'</td></tr>').join('');
  const provRows = o.byProvider.map(p=>'<tr><td><code>'+esc(p.provider_id)+'</code></td><td>'+p.count+'</td><td>USD '+Number(p.total).toFixed(2)+'</td></tr>').join('');
  return panel('Reports',
   '<div class="grid grid-cols-2 gap-4"><div><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Bills by status</div>'+tbl([{h:'Status'},{h:'Count'},{h:'Total'}],statusRows)+'</div><div><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Cost by provider</div>'+tbl([{h:'Provider'},{h:'Count'},{h:'Total'}],provRows)+'</div></div>');
}

boot();
</script>
</body></html>`;
