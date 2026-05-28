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
- A demonstrable Bright Data-backed execution path for blocked or JavaScript-heavy portals

## Project Goals

- Open-source core under Apache-2.0.
- Provider plugins that can be published, installed, reviewed, updated, and deprecated independently.
- MySQL-first deployment for simple VPS installs.
- Bright Data integration as a first-class execution adapter for the hackathon demo, with local execution retained as the baseline for providers that do not need web-data escalation.
- No customer credentials, real bills, or private client logic in the public repo.

## Early Shape

```txt
packages/core/          Core runtime, CLI, API, plugin loader
plugins/                Provider plugins
registry/               Provider registry metadata
docs/                   Architecture and plugin documentation
```

## Intended Install Flow

The product should be installable from a clean container, VPS, or local machine without private project context.

Target flow:

1. Clone this repository.
2. Copy `.env.example` to `.env`.
3. Start MySQL with Docker Compose.
4. Run setup checks and migrations.
5. Open the first-use setup wizard.
6. Create the first administrator account.
7. Confirm security defaults and demo mode.
8. Install or activate a provider plugin.
9. Configure an account with secret references.
10. Run a retrieval job, review the bill, and export approved JSON.

The MVP should make this flow work first with synthetic data and a mock provider. Live provider credentials and private deployments come after the installation and plugin lifecycle are reliable.

## MVP Target

The first MVP should prove the whole pattern with a small surface:

- Core CLI
- MySQL schema
- Plugin manifest validation
- Run logs and artifacts
- One mock provider for documentation
- One normal provider demo path
- One blocked-provider flow that demonstrably uses Bright Data
- Minimal review/export workflow
- A demo path that works without private credentials

See [PLAN.md](./PLAN.md) for the build plan, [Installation And Onboarding](./docs/installation-and-onboarding.md) for the first-use product flow, [Platform Architecture](./docs/platform-architecture.md) for the extension model, [Plugin Contract](./docs/plugin-contract.md) for provider package rules, [Bright Data Policy](./docs/bright-data-policy.md) for escalation boundaries, [Demo Script](./docs/demo-script.md) for the first public walkthrough, and [AI-Assisted Improvement Model](./docs/ai-assisted-improvement.md) for the optional intelligence layer.

## MVP Demo Flow

The intended first demo is:

1. Start local MySQL.
2. Run the core health check.
3. List providers from the registry.
4. Install or enable a mock provider.
5. Create a synthetic account.
6. Run a retrieval job.
7. Inspect logs and artifacts.
8. Review the normalized bill.
9. Export approved JSON.
10. Run a bounded Bright Data-backed escalation demo and show the adapter decision, policy reason, and run artifacts.

The demo should prove the provider lifecycle, not broad utility coverage.

## Architecture Principles

- Keep the core stable and provider-agnostic.
- Keep portal-specific behavior inside plugins.
- Treat provider plugins as lifecycle-managed extensions, not loose scripts.
- Route extension behavior through typed events, permissions, and adapter interfaces.
- Make Bright Data visible in the demo path while keeping it behind a clean adapter boundary.
- Keep raw artifacts private by default.
- Keep public fixtures synthetic or sanitized.
- Keep every run auditable.
- Keep plugin publishing governed by validation, verification, and known limitations.
- Use AI only as an optional maintenance and diagnosis layer, not as the authority for retrieval, security, approval, or export.

## Public/Private Boundary

This repository should contain framework code, example plugins, sanitized fixtures, and documentation only.

It must not contain:

- Customer credentials
- Real utility bills
- Private client-specific logic
- OAuth tokens or API keys
- Screenshots with customer data
- Any secrets

## License

Apache-2.0.
