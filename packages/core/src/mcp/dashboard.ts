import type { Pool } from "mysql2/promise";
import { readRegistry, listInstalled } from "../services/providers.ts";
import { listBills } from "../services/bills.ts";

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const STATUS_COLOR: Record<string, string> = {
  needs_review: "#f59e0b",
  approved: "#22d3ee",
  exported: "#34d399",
  rejected: "#f87171",
};

/** Read-only HTML status dashboard, rendered live from the database. No deps. */
export async function renderDashboard(pool: Pool): Promise<string> {
  const registry = await readRegistry();
  let installed = new Set<string>();
  let bills: Awaited<ReturnType<typeof listBills>> = [];
  try {
    installed = new Set((await listInstalled(pool)).map((p) => p.id));
  } catch {
    /* db not ready */
  }
  try {
    bills = await listBills(pool, {});
  } catch {
    /* db not ready */
  }

  const providerRows = registry
    .map((p) => {
      const on = installed.has(p.id);
      return `<tr>
        <td><code>${esc(p.id)}</code></td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.serviceTypes.join(", "))}</td>
        <td>${esc(p.brightData)}</td>
        <td><span class="pill ${on ? "ok" : "off"}">${on ? "installed" : "registry"}</span></td>
      </tr>`;
    })
    .join("");

  const billRows = bills.length
    ? bills
        .map((b) => {
          const conf = b.confidence_score == null ? "—" : Number(b.confidence_score).toFixed(2);
          const color = STATUS_COLOR[b.status] ?? "#94a3b8";
          return `<tr>
            <td>#${b.id}</td>
            <td><code>${esc(b.provider_id)}</code></td>
            <td>${esc(b.currency ?? "")} ${esc(b.amount_due ?? "?")}</td>
            <td>${esc(b.due_date ?? "—")}</td>
            <td>${conf}</td>
            <td><span class="status" style="color:${color}">${esc(b.status)}</span></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="muted">No bills yet — an agent or the CLI can run a retrieval.</td></tr>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Utility Watch</title>
<style>
  :root{--bg:#0a0f1c;--panel:#111827;--line:#1f2937;--text:#e5e7eb;--muted:#94a3b8;--cyan:#22d3ee;--accent:#34d399}
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#10243a 0,var(--bg) 55%);color:var(--text);
    font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:1000px;margin:0 auto;padding:40px 20px 80px}
  header h1{font-size:30px;margin:0 0 6px;letter-spacing:-.02em}
  header h1 .dot{color:var(--cyan)}
  .tag{color:var(--muted);max-width:680px}
  .badges{margin:18px 0 28px;display:flex;gap:8px;flex-wrap:wrap}
  .badge{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-size:12.5px;color:var(--muted)}
  .badge b{color:var(--text)}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:16px 0}
  .card h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 12px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);font-size:14px}
  th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
  tr:last-child td{border-bottom:none}
  code{background:#0b1220;border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:12.5px;color:var(--cyan)}
  .pill{font-size:11.5px;padding:2px 9px;border-radius:999px;border:1px solid var(--line)}
  .pill.ok{color:var(--accent);border-color:#14532d;background:#06281b}
  .pill.off{color:var(--muted)}
  .status{font-weight:600}
  .muted{color:var(--muted)}
  .mcp{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:var(--cyan);word-break:break-all}
  a{color:var(--cyan)}
  footer{color:var(--muted);font-size:12.5px;margin-top:26px}
</style></head>
<body><div class="wrap">
  <header>
    <h1>Utility Watch<span class="dot">.</span></h1>
    <p class="tag">Agent-native platform for retrieving, normalizing, reviewing, and exporting utility bills from
    fragmented provider portals. Built for the Bright Data hackathon — <b>Finance &amp; Market Intelligence</b>.
    All data shown is synthetic.</p>
    <div class="badges">
      <span class="badge"><b>${registry.length}</b> providers</span>
      <span class="badge"><b>${installed.size}</b> installed</span>
      <span class="badge"><b>${bills.length}</b> normalized bills</span>
      <span class="badge">governance: <b>capability-scoped</b></span>
    </div>
  </header>

  <div class="card">
    <h2>Agent interface (MCP)</h2>
    <p class="muted" style="margin:0 0 8px">Connect any MCP client (Claude Code, ChatGPT, …) to:</p>
    <div class="mcp">https://utilitywatch.kapitec.pro/mcp</div>
    <p class="muted" style="margin:10px 0 0">Tools: list_providers · list_bills · run_retrieval · get_bill · diagnose_run ·
    <span style="color:var(--text)">export_bill / propose_review (gated, fail-closed)</span></p>
  </div>

  <div class="card">
    <h2>Providers</h2>
    <table><thead><tr><th>ID</th><th>Name</th><th>Service</th><th>Bright Data</th><th>State</th></tr></thead>
    <tbody>${providerRows}</tbody></table>
  </div>

  <div class="card">
    <h2>Bills</h2>
    <table><thead><tr><th>Bill</th><th>Provider</th><th>Amount</th><th>Due</th><th>Confidence</th><th>Status</th></tr></thead>
    <tbody>${billRows}</tbody></table>
  </div>

  <footer>Read-only status view · <a href="https://github.com/kapitecsoluciones/utility-watch">source on GitHub</a> · Apache-2.0</footer>
</div></body></html>`;
}
