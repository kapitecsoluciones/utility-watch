import type { Pool } from "mysql2/promise";

export interface DashboardViewer {
  name: string;
  capabilities: Set<string>;
}

/**
 * Server sends a static SPA shell; the client fetches /api/* (operator session
 * required) and renders the management console. All data and actions are gated
 * server-side; values are HTML-escaped client-side before insertion.
 */
export async function renderDashboard(_pool: Pool, _viewer: DashboardViewer | null): Promise<string> {
  return SHELL;
}

const SHELL = `<!doctype html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Utility Watch — Console</title>
<script src="https://cdn.tailwindcss.com?plugins=forms"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  body{background:#0a0f1c;color:#e5e7eb;font-family:Inter,system-ui,sans-serif;margin:0}
  h1,h2,.head{font-family:'Space Grotesk',Inter,sans-serif}
  code,.mono{font-family:'JetBrains Mono',monospace}
  .card{background:#111827;border:1px solid #1f2937;border-radius:14px}
  .pill{display:inline-block;font-size:11px;padding:2px 9px;border-radius:999px;border:1px solid #1f2937}
  code{background:#0b1220;border:1px solid #1f2937;border-radius:6px;padding:1px 6px;font-size:12px;color:#22d3ee}
  .field{background:#0b1220;border:1px solid #1f2937;border-radius:8px;padding:7px 10px;font-size:13px;color:#e5e7eb;outline:none}
  .field:focus{border-color:#22d3ee}
  .btn{background:#22d3ee;color:#06222a;font-weight:600;font-size:12.5px;padding:7px 13px;border-radius:8px;border:none;cursor:pointer}
  .btn:hover{background:#67e8f9}
  .btn-ghost{background:transparent;border:1px solid #1f2937;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer;color:#cbd5e1}
  .btn-ghost:hover{border-color:#334155}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;text-align:left;padding:8px 12px}
  td{padding:8px 12px;border-top:1px solid #1f2937}
  .nav{display:block;width:100%;text-align:left;padding:9px 12px;border-radius:9px;color:#94a3b8;font-size:14px;cursor:pointer;border:none;background:transparent}
  .nav:hover{background:#0f172a;color:#e5e7eb}
  .nav.active{background:#0b1220;color:#22d3ee;font-weight:600}
  .st-needs_review{color:#f59e0b}.st-approved{color:#34d399}.st-exported{color:#22d3ee}.st-rejected{color:#f87171}.st-failed{color:#f87171}
  input,select{color-scheme:dark}
</style></head>
<body>
<div id="app" class="min-h-screen"></div>
<script>
const mk = (h) => { const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstChild; };
const esc = (s) => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let ME = { authenticated:false, capabilities:[] };
const can = (c) => ME.capabilities.indexOf(c) >= 0;

async function api(path, method, body){
  const r = await fetch(path,{method:method||'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
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
  app.appendChild(mk('<div class="flex items-center justify-center min-h-screen"><div class="card p-7" style="width:360px"><h1 class="text-2xl font-bold">Utility Watch<span style="color:#22d3ee">.</span></h1><p class="text-slate-400 text-sm mt-1 mb-5">Operator console. Sign in to manage providers, accounts, bills, users, and reports.</p><input id="email" class="field w-full mb-2" type="email" placeholder="operator@email" autocomplete="username"><input id="password" class="field w-full mb-3" type="password" placeholder="password" autocomplete="current-password"><button class="btn w-full" id="loginBtn">Sign in</button><p id="loginErr" class="text-red-400 text-xs mt-2"></p></div></div>'));
  document.getElementById('loginBtn').onclick = async () => {
    try{ await api('/login','POST',{email:document.getElementById('email').value,password:document.getElementById('password').value}); boot(); }
    catch(e){ document.getElementById('loginErr').textContent = e.message; }
  };
  document.getElementById('password').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('loginBtn').click(); });
}

const SECTIONS = [['overview','Overview'],['providers','Providers'],['accounts','Accounts'],['bills','Bills'],['history','History'],['users','Users'],['reports','Reports']];

function renderApp(){
  const app=document.getElementById('app'); app.replaceChildren();
  app.appendChild(mk('<div class="flex min-h-screen"><aside class="w-60 shrink-0 border-r border-[#1f2937] p-4 flex flex-col"><div class="px-2 mb-5"><div class="head text-xl font-bold">Utility Watch<span style="color:#22d3ee">.</span></div><div class="text-[11px] text-slate-500">operator console</div></div><nav id="nav" class="space-y-1 flex-1"></nav><div class="border-t border-[#1f2937] pt-3 text-sm text-slate-400"><div class="px-2">Signed in as <b class="text-slate-200" id="who"></b></div><button class="btn-ghost mt-2 w-full" id="logoutBtn">Sign out</button></div></aside><main id="main" class="flex-1 p-7 overflow-auto"></main></div>'));
  document.getElementById('who').textContent = ME.name||'operator';
  const nav = document.getElementById('nav');
  SECTIONS.forEach(s=>{ const b=mk('<button class="nav" data-sec="'+s[0]+'">'+s[1]+'</button>'); b.onclick=()=>show(s[0]); nav.appendChild(b); });
  document.getElementById('logoutBtn').onclick = async ()=>{ await fetch('/logout',{method:'POST'}); boot(); };
}

function setActive(id){ document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.sec===id)); }
function panel(title, bodyHtml){ return '<h1 class="text-2xl font-bold mb-1">'+title+'</h1><div class="mt-4">'+bodyHtml+'</div>'; }
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
    if(id==='reports'){ main.innerHTML = await viewReports(); return; }
  }catch(e){ main.innerHTML = '<div class="text-red-400">'+esc(e.message)+'</div>'; }
}

async function viewOverview(){
  const o = await api('/api/overview'); const t=o.totals;
  const card=(label,val)=>'<div class="card p-4"><div class="text-slate-500 text-xs uppercase tracking-wide">'+label+'</div><div class="text-2xl font-bold mt-1">'+val+'</div></div>';
  return panel('Overview',
   '<div class="grid grid-cols-3 gap-3">'+card('Providers',t.providers)+card('Accounts',t.accounts)+card('Bills',t.bills)+card('Runs',t.runs)+card('Users',t.users)+card('Total due','USD '+Number(t.total_due).toFixed(2))+'</div>'+
   '<div class="card p-5 mt-4"><div class="text-xs uppercase tracking-widest text-slate-500 mb-2">Agent Interface (MCP)</div><div class="mono text-cyan-300 text-sm">'+esc(location.origin)+'/mcp</div><div class="text-slate-500 text-sm mt-2">Tools: list_providers · list_bills · run_retrieval · get_bill · diagnose_run · export_bill/propose_review (gated)</div></div>');
}

async function viewProviders(){
  const ps = await api('/api/providers');
  const rows = ps.map(p=>'<tr><td><code>'+esc(p.id)+'</code></td><td>'+esc(p.name)+'</td><td class="text-slate-400">'+esc((p.serviceTypes||[]).join(', '))+'</td><td class="text-slate-400">'+esc(p.brightData)+'</td><td>'+(p.installed?'<span class="pill st-approved">installed</span>':'<span class="pill">registry</span>')+'</td><td class="text-right">'+((!p.installed && can('providers.install'))?'<button class="btn-ghost" data-install="'+esc(p.id)+'">Install</button>':'—')+'</td></tr>').join('');
  return panel('Providers (utility companies as plugins)', tbl([{h:'ID'},{h:'Name'},{h:'Service'},{h:'Bright Data'},{h:'State'},{h:'Action',r:1}], rows));
}
function bindProviders(){ document.querySelectorAll('[data-install]').forEach(b=>b.onclick=async()=>{ try{ await api('/api/providers/install','POST',{id:b.dataset.install}); show('providers'); }catch(e){ alert(e.message); } }); }

async function viewAccounts(){
  const res = await Promise.all([api('/api/accounts'), api('/api/providers')]);
  const accts=res[0], installed=res[1].filter(p=>p.installed);
  const rows = accts.map(a=>'<tr><td>#'+a.id+'</td><td><code>'+esc(a.provider)+'</code></td><td>'+esc(a.displayName)+'</td><td class="text-slate-400">'+esc(a.ref||'—')+'</td><td>'+esc(a.status)+'</td><td class="text-right">'+(can('jobs.run')?'<button class="btn-ghost" data-run="'+a.id+'">Run retrieval</button>':'—')+'</td></tr>').join('');
  const form = can('accounts.create') ? '<div class="card p-4 mb-4 flex flex-wrap gap-2 items-end"><div><div class="text-xs text-slate-500 mb-1">Provider</div><select id="acc-prov" class="field">'+installed.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></div><div><div class="text-xs text-slate-500 mb-1">Display name</div><input id="acc-name" class="field" placeholder="e.g. Main office"></div><div><div class="text-xs text-slate-500 mb-1">Account ref</div><input id="acc-ref" class="field" placeholder="optional"></div><button class="btn" id="acc-add">Add account</button></div>' : '';
  return panel('Accounts', form + tbl([{h:'ID'},{h:'Provider'},{h:'Name'},{h:'Ref'},{h:'Status'},{h:'Action',r:1}], rows));
}
function bindAccounts(){
  const add=document.getElementById('acc-add');
  if(add) add.onclick=async()=>{ try{ await api('/api/accounts','POST',{providerId:document.getElementById('acc-prov').value,displayName:document.getElementById('acc-name').value,ref:document.getElementById('acc-ref').value}); show('accounts'); }catch(e){ alert(e.message); } };
  document.querySelectorAll('[data-run]').forEach(b=>b.onclick=async()=>{ b.disabled=true; b.textContent='Running…'; try{ await api('/api/actions/run','POST',{accountId:Number(b.dataset.run)}); show('bills'); }catch(e){ alert(e.message); show('accounts'); } });
}

async function viewBills(){
  const bs = await api('/api/bills');
  const rows = bs.map(b=>{
    const parts=[];
    if(can('bills.review') && b.status==='needs_review'){ parts.push('<button class="btn-ghost" style="color:#34d399" data-rev="'+b.id+'" data-dec="approve">Approve</button>'); parts.push('<button class="btn-ghost" style="color:#f87171" data-rev="'+b.id+'" data-dec="reject">Reject</button>'); }
    if(can('bills.export')) parts.push('<button class="btn-ghost" style="color:#22d3ee'+(b.status==='approved'?'':';opacity:.3;pointer-events:none')+'" data-exp="'+b.id+'">Export</button>');
    const act = parts.length?parts.join(' '):'—';
    return '<tr><td>#'+b.id+'</td><td><code>'+esc(b.provider_id)+'</code></td><td>'+money(b.currency,b.amount_due)+'</td><td class="text-slate-400">'+esc(b.due_date||'—')+'</td><td class="mono text-cyan-300">'+(b.confidence_score==null?'—':Number(b.confidence_score).toFixed(2))+'</td><td>'+stPill(b.status)+'</td><td class="text-right space-x-1">'+act+'</td></tr>';
  }).join('');
  return panel('Bills', tbl([{h:'Bill'},{h:'Provider'},{h:'Amount'},{h:'Due'},{h:'Confidence'},{h:'Status'},{h:'Actions',r:1}], rows));
}
function bindActions(){
  document.querySelectorAll('[data-rev]').forEach(b=>b.onclick=async()=>{ try{ await api('/api/actions/review','POST',{billId:Number(b.dataset.rev),decision:b.dataset.dec}); show('bills'); }catch(e){ alert(e.message); } });
  document.querySelectorAll('[data-exp]').forEach(b=>b.onclick=async()=>{ try{ const r=await api('/api/actions/export','POST',{billId:Number(b.dataset.exp)}); alert('Exported: '+r.path); show('bills'); }catch(e){ alert(e.message); } });
}

async function viewHistory(){
  const rs = await api('/api/runs');
  const rows = rs.map(r=>'<tr><td>#'+r.id+'</td><td><code>'+esc(r.provider_id)+'</code></td><td>'+esc(r.account||'—')+'</td><td class="text-slate-400">'+esc(r.adapter)+'</td><td>'+stPill(r.status)+'</td><td class="text-slate-400">'+esc(r.error_code||'')+'</td><td class="text-slate-400">'+esc(r.started_at||'')+'</td></tr>').join('');
  return panel('Run history', tbl([{h:'Run'},{h:'Provider'},{h:'Account'},{h:'Adapter'},{h:'Status'},{h:'Error'},{h:'Started'}], rows));
}

async function viewUsers(){
  if(!can('users.manage')) return panel('Users','<div class="text-slate-500">You lack the users.manage capability.</div>');
  const us = await api('/api/users');
  const rows = us.map(u=>'<tr><td>#'+u.id+'</td><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td class="text-slate-400">'+esc(u.roles||'—')+'</td><td>'+esc(u.status)+'</td></tr>').join('');
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
