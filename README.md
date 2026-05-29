# Utility Watch

Open-source, **agent-native** platform for retrieving, normalizing, reviewing, and exporting utility bills from fragmented provider portals.

Think of it as **"WordPress for utility bill retrieval"**: a self-installable platform with a stable core, installable provider plugins, users/roles/security, and a public provider registry — exposed not only to humans (CLI) but to **AI agents through an MCP server** (Claude Code, ChatGPT, and others), with governance and a full audit trail.

Built for the Bright Data "Web Data UNLOCKED" hackathon under the **Finance & Market Intelligence** track: turning utility costs locked behind provider portals into evidence-backed, exportable financial records.

## Why It Exists

Utility bill retrieval is usually one-off scraping code. That works for a few portals but breaks down across many providers, countries, anti-bot systems, PDF formats, and accounting workflows. Utility Watch separates the stable parts (execution, records, artifacts, review, export, governance) from the provider-specific parts (login, navigation, parsing), which live in installable plugins.

## Architecture: one service layer, three heads

```txt
       CLI               MCP server            HTTP API
    (human ops)        (AI agents) *         (integrations)
       +--------------------+--------------------+
                      Service layer
   (providers · accounts · runs · bills · review · export · policy · audit)
                            |
                  MySQL  +  execution adapters (local / Bright Data)
```

All business logic lives in the service layer; transports are thin. The **MCP server is the primary, agent-native face**. See [`PLAN.md`](./PLAN.md) §16 and [`docs/plugin-contract.md`](./docs/plugin-contract.md).

## Quick start

Requirements: Docker (or Node 22 + a MySQL 8 you point `DATABASE_URL` at).

```bash
git clone https://github.com/kapitecsoluciones/utility-watch.git
cd utility-watch
cp .env.example .env

# Bring up MySQL + the MCP server (runs migrations, seeds the mock provider,
# creates a demo account and one bill, then serves MCP over Streamable HTTP):
docker compose up -d mysql mcp

curl localhost:8089/health   # -> {"ok":true,"service":"utility-watch-mcp",...}
```

Or run the CLI locally against your own MySQL:

```bash
npm install
npm run utility-watch -- doctor          # health check
npm run utility-watch -- db:migrate      # apply schema
npm run utility-watch -- demo:seed       # mock provider + demo account + one bill
```

## The bill lifecycle (works today with the mock provider)

```bash
utility-watch providers:install plugins/mock-provider
utility-watch accounts:create --provider mock-provider --name "Demo" --ref DEMO-0001
utility-watch run --account 1            # login → list → download → normalize
utility-watch bills:list                 # -> #1 mock-provider due 2026-05-21 USD 128.44 conf 0.900 needs_review
utility-watch bills:show 1               # normalized bill + evidence + per-field confidence
utility-watch bills:review 1 --approve   # human (or policy-granted) decision
utility-watch bills:export 1             # deterministic JSON (fails closed unless approved)
```

Every run records a run row, a hashed artifact, a normalized bill with confidence, a review, and a structured audit log.

## Agent-native: the MCP server

Start it: `utility-watch mcp` (Streamable HTTP, default `:8080`) or `utility-watch mcp:stdio` (local agents).

Tools: `list_providers`, `list_accounts`, `run_retrieval`, `get_run`, `list_bills`, `get_bill`, `diagnose_run`, and the gated `export_bill` / `propose_review`.

**Governance — agent-native is not agent-omnipotent.** Each agent connects with a capability-scoped token (`AGENT_CAPABILITIES`). The default token can read, run retrievals, and draft reviews, but **cannot** finalize exports/reviews or enable Bright Data spend without an explicit grant — gated tools fail closed. Every tool call is audited. For a public deployment, set `MCP_ALLOWED_HOSTS` to enable DNS-rebinding/Origin protection.

## Bright Data

Bright Data's **Scraping Browser** is the execution adapter for JavaScript-heavy, geo-sensitive portals at portfolio scale — behind a clean adapter boundary, disabled by default, opt-in per provider and account. It is **not** a captcha/MFA bypass; MFA routes to human review. See [`docs/bright-data-policy.md`](./docs/bright-data-policy.md).

## Repository layout

```txt
packages/core/          Core runtime: config, db + migrations, CLI, services, runner, MCP server
  src/services/         providers · accounts · bills · runs · review · export · admin
  src/mcp/              MCP server (tools + governance) + Streamable HTTP transport
plugins/                Provider plugins (mock-provider, example-provider)
registry/providers.json Public provider registry
docs/                   Architecture, plugin contract, Bright Data policy, demo script
```

## Public/private boundary

This repo contains framework code, example plugins, **synthetic** fixtures, and docs only. It must never contain customer credentials, real bills, real account numbers, tokens, or private client logic. See [`docs/public-private-boundary.md`](./docs/public-private-boundary.md).

## Status

Working and verified end-to-end with the mock provider: install → account → run → normalized bill → review → export, plus the MCP server (HTTP + stdio) with capability governance. CI runs typecheck + unit/plugin tests on every push. Real provider plugins (SCE, SoCalGas, …) and the Bright Data adapter are the next milestones; the registry roadmap is in [`PLAN.md`](./PLAN.md) §22.

## License

Apache-2.0.
