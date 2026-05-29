# Demo Script

The hackathon demo (under 5 minutes), **Finance & Market Intelligence** track. It proves the platform lifecycle and the agent-native interface — not broad provider coverage. Everything below runs against synthetic data; no real credentials or bills.

## The one-sentence framing

Utility costs are financial data locked behind fragmented provider portals. Utility Watch turns that into evidence-backed, auditable, exportable records — and exposes it to **AI agents** through an MCP server, governed and audited, with the Bright Data Scraping Browser as the live-web execution path.

## Setup (once, off camera)

```bash
git clone https://github.com/kapitecsoluciones/utility-watch.git && cd utility-watch
cp .env.example .env
docker compose up -d mysql mcp     # migrates, seeds 3 providers + 3 bills, serves MCP
curl localhost:8089/health         # {"ok":true,...}
```

## Act 1 — the platform (CLI, ~90s)

```bash
utility-watch providers:list       # mock-provider, sce-us, socalgas-us, example-provider
utility-watch bills:list           # 3 normalized bills across electricity + gas
utility-watch bills:show 3         # SoCalGas: normalized JSON + per-field confidence (1.0, JSON source)
utility-watch runs:show 3          # the audit trail: adapter, artifact sha256, structured log
```

Point made: each provider is an installable plugin; every bill is evidence-backed with a confidence score and a full audit trail. SCE parses PDF-style text (confidence 0.9); SoCalGas parses an intercepted JSON API (confidence 1.0) — same contract, different portals.

## Act 2 — the agent (MCP, ~150s) ★ the headline

Connect any MCP client (Claude Code, ChatGPT, the bundled smoke client) to the server and let the agent work:

```
list_providers                      → the registry, what's installed
list_bills { "due_before": "2026-06-01" }
                                    → "what's due across the portfolio this week"
run_retrieval { "account_id": 2 }   → the agent pulls a fresh bill on demand
get_bill { "bill_id": 3 }           → normalized record + evidence + confidence
diagnose_run { "run_id": 3 }        → AI diagnosis note
export_bill { "bill_id": 1 }        → ✗ DENIED: the agent token lacks bills.export
```

Point made: an agent runs financial ops over live web data — **but agent-native is not agent-omnipotent.** The default token can read, run retrievals, and draft reviews; finalizing exports/reviews or spending Bright Data budget is fail-closed and requires a human or an explicit policy grant. Every tool call is audited.

Quick smoke client (drives the server end to end):

```bash
MCP_URL=http://localhost:8089/mcp node --import tsx packages/core/scripts/mcp-smoke.ts
```

## Act 3 — Bright Data + the human gate (~60s)

```bash
utility-watch bills:review 1 --approve   # the human decision
utility-watch bills:export 1             # now it exports: deterministic JSON for accounting
```

Then explain the Bright Data boundary: for JavaScript-heavy, geo-sensitive portals (SoCalGas's SPA, SCE's portal) the same plugin runs through the **Bright Data Scraping Browser** — opt-in per account, fail-closed, budget-bounded, and **not** a captcha/MFA bypass (MFA routes to human review). See [`bright-data-policy.md`](./bright-data-policy.md).

## What the judges should take away

- **Web data access:** real portals reached via the Bright Data Scraping Browser, behind a policy boundary.
- **Agent value:** the platform is an MCP server an agent plugs into — provider logic is reusable plugins, not hardcoded.
- **Trust:** every field points back to an artifact + confidence; nothing exports without approval.
- **Maintainability:** a broken provider is a registry/plugin problem, not a core rewrite.
- **It generalizes:** three providers, three bill formats (text, US-dated text, JSON), one contract.

## Must not show

Real customer credentials, real bills, real account numbers, or any private deployment detail. The public demo is synthetic end to end.
