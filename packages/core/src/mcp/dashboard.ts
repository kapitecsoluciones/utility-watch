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

const SECTIONS = [['overview','Overview'],['providers','Providers'],['accounts','Accounts'],['bills','Bills'],['history','History'],['users','Users'],['audit','Audit'],['reports','Reports']];

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
    if(id==='audit'){ main.innerHTML = await viewAudit(); return; }
    if(id==='reports'){ main.innerHTML = await viewReports(); return; }
  }catch(e){ main.innerHTML = '<div class="text-red-600">'+esc(e.message)+'</div>'; }
}

async function viewOverview(){
  const o = await api('/api/overview'); const t=o.totals;
  var tok=null; if(can('users.manage')){ try{ tok=await api('/api/mcp-token'); }catch(_){} }
  const card=(label,val)=>'<div class="card p-4"><div class="text-slate-500 text-xs uppercase tracking-wide">'+label+'</div><div class="text-2xl font-bold mt-1">'+val+'</div></div>';
  var tokHtml='';
  if(tok){ tokHtml = tok.enabled
    ? '<div class="mt-3 text-sm"><span class="text-slate-500">Agent token (Authorization: Bearer):</span> <code>'+esc(tok.token)+'</code></div>'
    : '<div class="mt-3 text-sm text-slate-500">Agent token: <b>not set</b> — the /mcp endpoint is open. Set <code>MCP_AUTH_TOKEN</code> to require a bearer token.</div>'; }
  return panel('Overview',
   '<div class="grid grid-cols-3 gap-3">'+card('Providers',t.providers)+card('Accounts',t.accounts)+card('Bills',t.bills)+card('Runs',t.runs)+card('Users',t.users)+card('Total due','USD '+Number(t.total_due).toFixed(2))+'</div>'+
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
