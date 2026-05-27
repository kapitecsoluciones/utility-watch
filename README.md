# Utility Watch

Open-source infrastructure for retrieving, normalizing, validating, and auditing utility bills from fragmented provider portals.

Utility Watch is designed around a stable core and installable provider plugins. Each plugin knows how to work with one utility portal. The core handles execution, scheduling, credentials, artifacts, database records, review states, and exports.

## Why It Exists

Utility bill retrieval is usually handled as one-off scraping code. That works for a few portals, but it breaks down when teams need to maintain many providers across countries, customers, anti-bot systems, PDF formats, and accounting workflows.

Utility Watch turns portal-specific knowledge into installable plugins:

- One core runtime
- One plugin contract
- One registry of providers
- One normalized bill model
- One audit trail per run
- Optional Bright Data execution for blocked or JavaScript-heavy portals

## Project Goals

- Open-source core under Apache-2.0.
- Provider plugins that can be published, installed, reviewed, updated, and deprecated independently.
- MySQL-first deployment for simple VPS installs.
- Local browser execution by default, Bright Data escalation only when needed.
- No customer credentials, real bills, or private client logic in the public repo.

## Early Shape

\`\`\`txt
packages/core/          Core runtime, CLI, API, plugin loader
plugins/                Provider plugins
registry/               Provider registry metadata
docs/                   Architecture and plugin documentation
\`\`\`

## MVP Target

The first MVP should prove the whole pattern with a small surface:

- Core CLI
- MySQL schema
- Plugin manifest validation
- Run logs and artifacts
- One normal provider
- One blocked-provider flow using Bright Data
- One mock provider for documentation
- Minimal review/export workflow

See [PLAN.md](./PLAN.md) for the build plan.

## Public/Private Boundary

This repository should contain framework code, example plugins, sanitized fixtures, and documentation only.

It must not contain:

- Customer credentials
- Real utility bills
- Private the client-specific logic
- OAuth tokens or API keys
- Screenshots with customer data
- Any secrets

## License

Apache-2.0.

