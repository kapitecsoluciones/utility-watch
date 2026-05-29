import type { Pool } from "mysql2/promise";
import { readRegistry, listInstalled } from "../services/providers.ts";
import { listBills } from "../services/bills.ts";
import { listAccounts } from "../services/accounts.ts";

export interface DashboardViewer {
  name: string;
  capabilities: Set<string>;
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const STATUS_CLASS: Record<string, string> = {
  needs_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  exported: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
};

/** Stitch-styled, server-rendered dashboard. Read-only when not signed in;
 *  capability-gated action buttons appear for an authenticated operator. */
export async function renderDashboard(pool: Pool, viewer: DashboardViewer | null): Promise<string> {
  const registry = await readRegistry();
  let installed = new Set<string>();
  let bills: Awaited<ReturnType<typeof listBills>> = [];
  let accountByProvider = new Map<string, number>();
  try {
    installed = new Set((await listInstalled(pool)).map((p) => p.id));
    bills = await listBills(pool, {});
    for (const a of await listAccounts(pool)) if (!accountByProvider.has(a.provider_id)) accountByProvider.set(a.provider_id, a.id);
  } catch {
    /* db not ready */
  }

  const canRun = viewer?.capabilities.has("jobs.run") ?? false;
  const canReview = viewer?.capabilities.has("bills.review") ?? false;
  const canExport = viewer?.capabilities.has("bills.export") ?? false;

  const providerRows = registry
    .map((p) => {
      const on = installed.has(p.id);
      const acct = accountByProvider.get(p.id);
      const runBtn =
        canRun && on && acct
          ? `<button onclick="act('run',{accountId:${acct}})" class="btn-accent">Run retrieval</button>`
          : `<span class="text-slate-600 text-xs">—</span>`;
      return `<tr class="border-t border-[#1f2937]">
        <td class="py-2.5 px-3"><code>${esc(p.id)}</code></td>
        <td class="py-2.5 px-3">${esc(p.name)}</td>
        <td class="py-2.5 px-3 text-slate-400">${esc(p.serviceTypes.join(", "))}</td>
        <td class="py-2.5 px-3 text-slate-400">${esc(p.brightData)}</td>
        <td class="py-2.5 px-3"><span class="pill ${on ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-[#1f2937] text-slate-500"}">${on ? "installed" : "registry"}</span></td>
        <td class="py-2.5 px-3 text-right">${runBtn}</td>
      </tr>`;
    })
    .join("");

  const billRows = bills.length
    ? bills
        .map((b) => {
          const conf = b.confidence_score == null ? "—" : Number(b.confidence_score).toFixed(2);
          const cls = STATUS_CLASS[b.status] ?? "border-[#1f2937] text-slate-400";
          let actions = `<span class="text-slate-600 text-xs">—</span>`;
          if (viewer) {
            const parts: string[] = [];
            if (canReview && b.status === "needs_review") {
              parts.push(`<button onclick="act('review',{billId:${b.id},decision:'approve'})" class="btn-ghost text-emerald-400">Approve</button>`);
              parts.push(`<button onclick="act('review',{billId:${b.id},decision:'reject'})" class="btn-ghost text-red-400">Reject</button>`);
            }
            if (canExport) {
              const dis = b.status === "approved" ? "" : "opacity-30 pointer-events-none";
              parts.push(`<button onclick="act('export',{billId:${b.id}})" class="btn-ghost text-cyan-300 ${dis}">Export</button>`);
            }
            if (parts.length) actions = parts.join(" ");
          }
          return `<tr class="border-t border-[#1f2937]">
            <td class="py-2.5 px-3 text-slate-400">#${b.id}</td>
            <td class="py-2.5 px-3"><code>${esc(b.provider_id)}</code></td>
            <td class="py-2.5 px-3">${esc(b.currency ?? "")} ${esc(b.amount_due ?? "?")}</td>
            <td class="py-2.5 px-3 text-slate-400">${esc(b.due_date ?? "—")}</td>
            <td class="py-2.5 px-3 font-mono text-cyan-300">${conf}</td>
            <td class="py-2.5 px-3"><span class="pill ${cls}">${esc(b.status)}</span></td>
            <td class="py-2.5 px-3 text-right space-x-2">${actions}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="7" class="py-4 px-3 text-slate-500">No bills yet.</td></tr>`;

  const authControl = viewer
    ? `<div class="flex items-center gap-3 text-sm">
         <span class="text-slate-400">Signed in as <b class="text-slate-200">${esc(viewer.name)}</b></span>
         <button onclick="logout()" class="btn-ghost">Sign out</button>
       </div>`
    : `<form onsubmit="event.preventDefault();login()" class="flex items-center gap-2">
         <input id="email" type="email" placeholder="operator@email" class="field" autocomplete="username">
         <input id="password" type="password" placeholder="password" class="field" autocomplete="current-password">
         <button class="btn-accent">Operator login</button>
         <span id="loginerr" class="text-red-400 text-xs"></span>
       </form>`;

  return `<!doctype html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Utility Watch — Agent-Native Infrastructure</title>
<script src="https://cdn.tailwindcss.com?plugins=forms"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  body{background:#0a0f1c;color:#e5e7eb;font-family:Inter,system-ui,sans-serif}
  h1,h2,.head{font-family:'Space Grotesk',Inter,sans-serif}
  code,.mono{font-family:'JetBrains Mono',monospace}
  .card{background:#111827;border:1px solid #1f2937;border-radius:14px}
  .pill{display:inline-block;font-size:11px;padding:2px 9px;border-radius:999px;border:1px solid}
  code{background:#0b1220;border:1px solid #1f2937;border-radius:6px;padding:1px 6px;font-size:12.5px;color:#22d3ee}
  .field{background:#0b1220;border:1px solid #1f2937;border-radius:8px;padding:6px 10px;font-size:13px;color:#e5e7eb;outline:none}
  .field:focus{border-color:#22d3ee}
  .btn-accent{background:#22d3ee;color:#06222a;font-weight:600;font-size:12.5px;padding:6px 12px;border-radius:8px;border:none;cursor:pointer}
  .btn-accent:hover{background:#67e8f9}
  .btn-ghost{background:transparent;border:1px solid #1f2937;font-size:12.5px;padding:5px 11px;border-radius:8px;cursor:pointer;color:#cbd5e1}
  .btn-ghost:hover{border-color:#334155}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:600;text-align:left;padding:8px 12px}
  table{width:100%;border-collapse:collapse;font-size:14px}
</style></head>
<body>
<div class="max-w-6xl mx-auto px-5 py-8">
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Utility Watch<span class="text-cyan-400">.</span></h1>
      <p class="text-slate-400 mt-1 max-w-2xl text-sm">Agent-native platform for retrieving, normalizing, reviewing, and exporting
      utility bills from fragmented provider portals — Bright Data hackathon, <b class="text-slate-300">Finance &amp; Market Intelligence</b>. Synthetic demo data.</p>
    </div>
    ${authControl}
  </header>

  <div class="flex flex-wrap gap-2 mt-5">
    <span class="pill border-[#1f2937] text-slate-300"><b>${registry.length}</b> providers</span>
    <span class="pill border-[#1f2937] text-slate-300"><b>${installed.size}</b> installed</span>
    <span class="pill border-[#1f2937] text-slate-300"><b>${bills.length}</b> bills</span>
    <span class="pill border-[#1f2937] text-slate-300">governance: <b class="text-cyan-300">capability-scoped</b></span>
  </div>

  <section class="card p-5 mt-5">
    <h2 class="text-xs uppercase tracking-widest text-slate-500 mb-3">Agent Interface (MCP)</h2>
    <p class="text-slate-400 text-sm mb-2">Connect any MCP client (Claude Code, ChatGPT, …) to:</p>
    <div class="mono text-cyan-300 text-sm break-all">https://utilitywatch.kapitec.pro/mcp</div>
    <p class="text-slate-500 text-sm mt-3">Tools: list_providers · list_bills · run_retrieval · get_bill · diagnose_run ·
    <span class="text-slate-300">export_bill / propose_review (gated, fail-closed)</span></p>
  </section>

  <section class="card p-5 mt-5">
    <h2 class="text-xs uppercase tracking-widest text-slate-500 mb-3">Providers</h2>
    <table><thead><tr><th>ID</th><th>Name</th><th>Service</th><th>Bright Data</th><th>State</th><th class="text-right">Action</th></tr></thead>
    <tbody>${providerRows}</tbody></table>
  </section>

  <section class="card p-5 mt-5">
    <h2 class="text-xs uppercase tracking-widest text-slate-500 mb-3">Bills</h2>
    <table><thead><tr><th>Bill</th><th>Provider</th><th>Amount</th><th>Due</th><th>Confidence</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
    <tbody>${billRows}</tbody></table>
    ${viewer ? "" : `<p class="text-slate-500 text-xs mt-3">Read-only view. Sign in as an operator to run retrievals, review, and export.</p>`}
  </section>

  <footer class="text-slate-500 text-xs mt-7">Read-only view is public; actions require operator login.
  <a class="text-cyan-400" href="https://github.com/kapitecsoluciones/utility-watch">Source on GitHub</a> · Apache-2.0</footer>
</div>
<script>
  async function login(){
    const r = await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});
    const j = await r.json().catch(()=>({}));
    if(!r.ok){document.getElementById('loginerr').textContent=j.error||'login failed';return;}
    location.reload();
  }
  async function logout(){ await fetch('/logout',{method:'POST'}); location.reload(); }
  async function act(action,payload){
    const r = await fetch('/api/actions/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const j = await r.json().catch(()=>({}));
    if(!r.ok){ alert(j.error||'action failed'); return; }
    location.reload();
  }
</script>
</body></html>`;
}
