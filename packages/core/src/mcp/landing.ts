/** Public marketing landing page. Static; sells the platform and routes to the console, MCP, and GitHub. Light theme. */
export function renderLanding(): string {
  return LANDING;
}

const GH = "https://github.com/kapitecsoluciones/utility-watch";

const LANDING = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Utility Watch — agent-native utility bill retrieval</title>
<meta name="description" content="Open-source, agent-native platform that retrieves, normalizes, reviews, and exports utility bills from fragmented provider portals. Built for AI agents and humans, governed and audited.">
<link rel="icon" href="/logo.png?v=2">
<meta property="og:title" content="Utility Watch — agent-native utility bill retrieval">
<meta property="og:description" content="Turn utility costs locked behind fragmented portals into evidence-backed, exportable financial records — for AI agents and humans.">
<meta property="og:image" content="/logo.png?v=2">
<script src="https://cdn.tailwindcss.com?plugins=forms"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  body{background:#ffffff;color:#0f172a;font-family:Inter,system-ui,sans-serif;margin:0}
  h1,h2,h3,.head{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em}
  .mono{font-family:'JetBrains Mono',monospace}
  .hero{background:radial-gradient(1100px 560px at 80% -12%, #ecfeff 0, #ffffff 62%)}
  .card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
  .btn{background:#0891b2;color:#fff;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none;display:inline-block}
  .btn:hover{background:#0e7490}
  .btn2{border:1px solid #cbd5e1;color:#334155;font-weight:600;padding:11px 20px;border-radius:10px;text-decoration:none;display:inline-block}
  .btn2:hover{border-color:#94a3b8}
  .pill{display:inline-block;font-size:12px;padding:4px 12px;border-radius:999px;border:1px solid #cffafe;background:#f0fdff;color:#0e7490;font-weight:500}
  a{color:#0891b2}
  .grad{background:linear-gradient(90deg,#0891b2,#059669);-webkit-background-clip:text;background-clip:text;color:transparent}
  /* Hero mark: framed product panel with a soft cyan halo */
  .mark{position:relative;display:flex;align-items:center;justify-content:center}
  .mark::before{content:"";position:absolute;width:340px;height:340px;border-radius:9999px;background:radial-gradient(circle,rgba(8,145,178,.28) 0,rgba(8,145,178,0) 70%);filter:blur(8px);z-index:0}
  .panel{position:relative;z-index:1;background:linear-gradient(160deg,#ffffff,#f0fdff);border:1px solid #cffafe;border-radius:28px;padding:34px;box-shadow:0 30px 80px -30px rgba(8,145,178,.5)}
  .panel img{display:block;border-radius:20px}
  .panel-cap{margin-top:18px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:#0e7490}
  .dot{width:7px;height:7px;border-radius:9999px;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.15)}
  /* Terminal-style snippet card */
  .term{background:#0b1220;border:1px solid #1e293b;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px -24px rgba(15,23,42,.5)}
  .term-bar{display:flex;align-items:center;gap:7px;padding:11px 15px;background:#111c2e;border-bottom:1px solid #1e293b}
  .tb{width:11px;height:11px;border-radius:9999px}
  .term-body{padding:18px 20px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.85;color:#e2e8f0;overflow-x:auto}
  .term-body .c{color:#64748b}
  .term-body .p{color:#22d3ee}
  .term-body .o{color:#94a3b8}
  .term-body .g{color:#34d399}
</style></head>
<body>
<div class="hero">
  <nav class="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/logo.png?v=2" width="34" height="34" class="rounded-lg" alt="Utility Watch">
      <span class="head font-bold text-lg">Utility Watch</span>
    </div>
    <div class="flex items-center gap-3 text-sm">
      <a class="btn2" href="${GH}">GitHub</a>
      <a class="btn" href="/console">Open console</a>
    </div>
  </nav>

  <header class="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
    <div>
      <span class="pill">Open-source · Apache-2.0 · Agent-native</span>
      <h1 class="text-5xl md:text-6xl font-bold mt-5 leading-[1.03]">Utility bills,<br><span class="grad">built for agents.</span></h1>
      <p class="text-slate-600 text-lg mt-6 max-w-xl">Retrieve, normalize, review, and export utility bills from fragmented
      provider portals — one stable core, installable provider plugins, and an MCP server your AI agents connect to directly.
      Governed, audited, evidence-first.</p>
      <div class="flex flex-wrap gap-3 mt-8">
        <a class="btn" href="/console">Open the console</a>
        <a class="btn2" href="#agents">Connect an agent</a>
        <a class="btn2" href="${GH}">View source</a>
      </div>
      <div class="mono text-sm text-cyan-700 mt-6">MCP · https://utilitywatch.kapitec.pro/mcp</div>
    </div>
    <div class="mark">
      <div class="panel">
        <img src="/logo.png?v=2" width="280" height="280" alt="Utility Watch logo">
        <div class="panel-cap"><span class="dot"></span> MCP server · live &amp; agent-ready</div>
      </div>
    </div>
  </header>
</div>

<section class="max-w-6xl mx-auto px-6 py-16">
  <h2 class="text-3xl font-bold text-center">The problem</h2>
  <p class="text-slate-600 text-center mt-3 max-w-2xl mx-auto">Utility cost is real financial data — locked behind dozens of provider
  portals, each with its own login, layout, anti-bot defenses, and PDF format. One-off scrapers rot the moment a portal changes.</p>
  <div class="grid md:grid-cols-3 gap-4 mt-10">
    <div class="card p-6"><div class="text-cyan-700 head text-xl font-bold">1 · Install</div><p class="text-slate-600 mt-2">Add a utility company as an installable <b class="text-slate-900">plugin</b>. Each plugin knows one portal; the core stays stable.</p></div>
    <div class="card p-6"><div class="text-cyan-700 head text-xl font-bold">2 · Retrieve</div><p class="text-slate-600 mt-2">An <b class="text-slate-900">agent</b> or operator runs a retrieval. Hard portals escalate to the Bright Data Scraping Browser, opt-in and budgeted.</p></div>
    <div class="card p-6"><div class="text-cyan-700 head text-xl font-bold">3 · Review &amp; export</div><p class="text-slate-600 mt-2">Every bill is normalized with a <b class="text-slate-900">confidence score</b> and evidence, routed to review, then exported as clean JSON.</p></div>
  </div>
</section>

<section id="agents" class="max-w-6xl mx-auto px-6 py-10">
  <h2 class="text-3xl font-bold text-center">One platform, three faces</h2>
  <div class="grid md:grid-cols-3 gap-4 mt-10">
    <div class="card p-6"><h3 class="head font-bold text-lg">For agents — MCP</h3><p class="text-slate-600 mt-2">Connect Claude Code, ChatGPT, or any MCP client. Tools to list providers, run retrievals, query bills, and diagnose runs.</p><div class="mono text-xs text-cyan-700 mt-3 break-all">/mcp</div></div>
    <div class="card p-6"><h3 class="head font-bold text-lg">For humans — Console</h3><p class="text-slate-600 mt-2">A management console: providers, accounts, bills, run history, users, and reports. Sign in to act.</p><a class="text-sm" href="/console">Open console →</a></div>
    <div class="card p-6"><h3 class="head font-bold text-lg">For systems — API + CLI</h3><p class="text-slate-600 mt-2">A service layer behind every surface, plus a CLI for setup, doctor, and operations. No logic duplicated.</p></div>
  </div>

  <div class="grid md:grid-cols-2 gap-8 items-center mt-12">
    <div>
      <h3 class="head text-2xl font-bold">How an agent uses it</h3>
      <p class="text-slate-600 mt-3 max-w-lg">Register the MCP endpoint once, then your agent discovers and calls tools
      directly — list providers, run retrievals, and query normalized bills with per-field confidence. No glue code.</p>
      <a class="text-sm font-semibold mt-4 inline-block" href="${GH}">Read the tool reference →</a>
    </div>
    <div class="term">
      <div class="term-bar"><span class="tb" style="background:#f87171"></span><span class="tb" style="background:#fbbf24"></span><span class="tb" style="background:#34d399"></span></div>
      <div class="term-body"><span class="c"># 1 · register the MCP server with your agent</span>
<span class="p">$</span> claude mcp add --transport http utility-watch https://utilitywatch.kapitec.pro/mcp

<span class="c"># 2 · the agent calls a tool</span>
<span class="p">&gt;</span> list_bills <span class="o">{ "provider": "mock-power", "limit": 2 }</span>

<span class="g">✓</span> <span class="o">[</span>
  <span class="o">{ "id": "bill_8f2", "amount": 142.50, "currency": "USD", "confidence": 0.98 },</span>
  <span class="o">{ "id": "bill_8f3", "amount": 137.10, "currency": "USD", "confidence": 0.95 }</span>
<span class="o">]</span></div>
    </div>
  </div>
</section>

<section class="max-w-6xl mx-auto px-6 py-10">
  <div class="card p-8 grid md:grid-cols-2 gap-8 items-center">
    <div>
      <h2 class="text-2xl font-bold">Agent-native, not agent-omnipotent</h2>
      <p class="text-slate-600 mt-3">Agents and operators carry <b class="text-slate-900">capability-scoped</b> tokens. Reading and running retrievals is open;
      finalizing exports, approving bills, or spending Bright Data budget is <b class="text-slate-900">fail-closed</b> — it needs a human or an explicit grant.
      Every action is audited.</p>
    </div>
    <div class="space-y-2 text-sm text-slate-700">
      <div class="flex items-center gap-2"><span class="text-emerald-600">✓</span> Per-field confidence + evidence on every bill</div>
      <div class="flex items-center gap-2"><span class="text-emerald-600">✓</span> Human review gate before export</div>
      <div class="flex items-center gap-2"><span class="text-emerald-600">✓</span> Full audit trail per run</div>
      <div class="flex items-center gap-2"><span class="text-emerald-600">✓</span> Synthetic fixtures — no private data in the open repo</div>
      <div class="flex items-center gap-2"><span class="text-emerald-600">✓</span> Bright Data Scraping Browser, opt-in &amp; budgeted</div>
    </div>
  </div>
</section>

<section class="max-w-6xl mx-auto px-6 py-16 text-center">
  <h2 class="text-3xl font-bold">Stop maintaining scrapers. Start installing providers.</h2>
  <div class="flex flex-wrap gap-3 justify-center mt-7">
    <a class="btn" href="/console">Open the console</a>
    <a class="btn2" href="${GH}">Star on GitHub</a>
  </div>
  <p class="text-slate-500 text-sm mt-8">Open-source under Apache-2.0 · Built for the Bright Data "Web Data UNLOCKED" hackathon · Finance &amp; Market Intelligence</p>
</section>

<footer class="border-t border-slate-200 mt-6">
  <div class="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-slate-500 text-sm">
    <div class="flex items-center gap-2"><img src="/logo.png?v=2" width="22" height="22" class="rounded" alt=""> Utility Watch</div>
    <div><a href="${GH}">GitHub</a> · <a href="/console">Console</a> · <span class="mono">/mcp</span></div>
  </div>
</footer>
</body></html>`;
