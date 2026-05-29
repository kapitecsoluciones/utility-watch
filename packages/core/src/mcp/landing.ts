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
  h1,h2,h3,.head{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.01em}
  .mono{font-family:'JetBrains Mono',monospace}
  .hero{background:radial-gradient(1100px 540px at 75% -10%, #ecfeff 0, #ffffff 60%)}
  .card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
  .btn{background:#0891b2;color:#fff;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none;display:inline-block}
  .btn:hover{background:#0e7490}
  .btn2{border:1px solid #cbd5e1;color:#334155;font-weight:600;padding:11px 20px;border-radius:10px;text-decoration:none;display:inline-block}
  .btn2:hover{border-color:#94a3b8}
  .pill{display:inline-block;font-size:12px;padding:3px 11px;border-radius:999px;border:1px solid #e2e8f0;color:#64748b}
  .glow{box-shadow:0 24px 70px -24px rgba(8,145,178,.45)}
  a{color:#0891b2}
  .grad{background:linear-gradient(90deg,#0891b2,#059669);-webkit-background-clip:text;background-clip:text;color:transparent}
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

  <header class="max-w-6xl mx-auto px-6 pt-14 pb-20 grid md:grid-cols-2 gap-10 items-center">
    <div>
      <span class="pill">Open-source · Apache-2.0 · Agent-native</span>
      <h1 class="text-5xl font-bold mt-5 leading-[1.05]">Utility bills,<br><span class="grad">built for agents.</span></h1>
      <p class="text-slate-600 text-lg mt-5 max-w-xl">Retrieve, normalize, review, and export utility bills from fragmented
      provider portals — through one stable core, installable provider plugins, and an MCP server your AI agents plug into.
      Governed, audited, evidence-first.</p>
      <div class="flex flex-wrap gap-3 mt-7">
        <a class="btn" href="/console">Open the console</a>
        <a class="btn2" href="#agents">Connect an agent</a>
        <a class="btn2" href="${GH}">View source</a>
      </div>
      <div class="mono text-sm text-cyan-700 mt-6">MCP · https://utilitywatch.kapitec.pro/mcp</div>
    </div>
    <div class="flex justify-center">
      <img src="/logo.png?v=2" width="260" height="260" class="rounded-3xl glow" alt="Utility Watch logo">
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
