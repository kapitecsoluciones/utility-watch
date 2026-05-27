# Utility Watch MVP Plan

## Product Thesis

Utility Watch is an open plugin platform for utility bill retrieval. The core should be boring and stable: it installs plugins, runs jobs, stores evidence, normalizes bill data, tracks review states, and exposes a predictable API. Provider-specific behavior belongs in plugins.

The MVP should not attempt broad coverage. It should prove that the architecture works end to end.

## Non-Negotiables

- Public repo contains no customer data, credentials, private screenshots, or the client-specific business logic.
- Core is open-source and Apache-2.0 licensed.
- Provider plugins declare permissions before running.
- Bright Data is an execution adapter, not a hard dependency.
- Every run produces an audit trail: status, timestamps, plugin version, logs, artifacts, and normalized result.
- Every extracted bill has evidence and confidence metadata.

## Target Users

- Operators who need recurring bill retrieval across many utility portals.
- Accounting teams that need evidence-backed statements before export.
- Developers who can publish or maintain provider plugins.
- Managed-service teams that operate retrieval workflows for customers.

## MVP Definition

The MVP is complete when a clean developer can clone the repo, run Docker Compose, install a provider plugin, run a retrieval job, see artifacts, review normalized bill data, and export a JSON payload.

## Scope

### In Scope

- Node/TypeScript core.
- MySQL database.
- Docker Compose local environment.
- CLI commands:
  - \`utility-watch doctor\`
  - \`utility-watch providers:list\`
  - \`utility-watch providers:install\`
  - \`utility-watch accounts:create\`
  - \`utility-watch jobs:run\`
  - \`utility-watch bills:list\`
  - \`utility-watch bills:export\`
- Plugin manifest validation.
- Plugin lifecycle:
  - discover
  - install
  - enable
  - configure
  - run
  - review
  - update
  - disable
- Local Playwright execution adapter.
- Bright Data execution adapter interface.
- Artifact storage on local filesystem.
- Sanitized logs.
- Minimal JSON API.
- Minimal dashboard or generated HTML report.
- Example provider plugin.
- One real provider plugin derived from existing knowledge, sanitized.
- One blocked-provider demo path using Bright Data.

### Out of Scope

- Paid marketplace.
- Enterprise multi-tenant billing.
- Full QuickBooks production integration.
- MFA/captcha bypass that violates portal terms.
- Real customer data.
- Auto-discovery of every utility portal.
- Production-grade secret manager integration beyond env/secret-handle abstractions.

## Architecture

### Core Modules

1. **CLI**
   - Human-friendly commands for local development and demos.
   - Calls the same services as the API.

2. **Plugin Loader**
   - Reads plugin package.
   - Validates \`plugin.json\`.
   - Registers capabilities.
   - Blocks undeclared domains, runtimes, and permissions.

3. **Job Runner**
   - Creates run record.
   - Loads account config.
   - Chooses execution adapter.
   - Calls plugin lifecycle methods.
   - Stores logs and artifacts.
   - Normalizes result.
   - Produces review item.

4. **Execution Adapters**
   - \`local-playwright\`: default path.
   - \`brightdata-browser\`: blocked or high-friction portals.
   - Future: \`http-fetch\`, \`email-ingest\`, \`manual-upload\`.

5. **Storage**
   - MySQL for records.
   - Local filesystem for MVP artifacts.
   - S3-compatible storage later.

6. **Review and Export**
   - Confidence score.
   - Human review state.
   - JSON export.
   - Accounting-system adapter later.

## Plugin Contract

Each plugin must include:

- \`plugin.json\`
- typed entrypoint
- fixture tests
- parser tests
- health check
- support metadata
- declared permissions
- declared domains
- declared secrets
- explicit Bright Data policy

Required lifecycle methods:

- \`healthcheck(context)\`
- \`login(context, credentials)\`
- \`listAccounts(context)\`
- \`fetchBills(context, account)\`
- \`normalizeBill(context, rawBill)\`
- \`validateBill(context, normalizedBill)\`

Optional lifecycle methods:

- \`beforeRun(context)\`
- \`afterRun(context)\`
- \`onBlocked(context, error)\`
- \`exportBill(context, bill)\`

## Database v0

Tables:

- \`providers\`
- \`provider_versions\`
- \`accounts\`
- \`credentials\`
- \`jobs\`
- \`runs\`
- \`run_logs\`
- \`bill_files\`
- \`bills\`
- \`reviews\`
- \`exports\`

Important fields:

- provider id
- plugin version
- account id
- utility type
- country
- run status
- error code
- artifact paths
- confidence score
- review status
- checksum
- source URL

## Run States

- \`queued\`
- \`running\`
- \`blocked\`
- \`failed\`
- \`needs_review\`
- \`approved\`
- \`exported\`
- \`skipped\`

## Error Taxonomy

- \`AUTH_INVALID\`
- \`MFA_REQUIRED\`
- \`CAPTCHA_REQUIRED\`
- \`PORTAL_CHANGED\`
- \`NETWORK_BLOCKED\`
- \`PDF_PARSE_FAILED\`
- \`NO_BILL_FOUND\`
- \`LOW_CONFIDENCE\`
- \`RATE_LIMITED\`
- \`UNKNOWN\`

## Bright Data Policy

Bright Data should be used only when needed:

- Portal blocks local Playwright.
- Portal requires stable geography.
- Portal is JavaScript-heavy and unreliable locally.
- Proxy/browser execution materially improves success rate.

Cost controls:

- per-run budget limit
- per-provider daily limit
- max retry count
- dry-run mode
- explicit plugin opt-in
- execution logs showing adapter choice

## Milestones

### Milestone 0 — Repository Foundation

- [ ] Create public GitHub repo.
- [ ] Add Apache-2.0 license.
- [ ] Add README.
- [ ] Add PLAN.md.
- [ ] Add plugin manifest example.
- [ ] Add public/private boundary documentation.

Exit criteria:

- Repo is public.
- No private code or secrets.
- Plan is readable by a collaborator.

### Milestone 1 — Core Skeleton

- [ ] Initialize Node/TypeScript project.
- [ ] Add CLI entrypoint.
- [ ] Add Docker Compose with MySQL.
- [ ] Add migration system.
- [ ] Add database schema v0.
- [ ] Add structured logging.
- [ ] Add config loading from env.

Exit criteria:

- \`utility-watch doctor\` validates runtime and DB.
- Fresh clone can start local DB.

### Milestone 2 — Plugin Loader

- [ ] Define \`plugin.json\` schema.
- [ ] Validate provider metadata.
- [ ] Validate declared domains.
- [ ] Validate secrets and capabilities.
- [ ] Add plugin install/list commands.
- [ ] Add example provider package.

Exit criteria:

- A provider can be installed and listed.
- Invalid manifests fail with clear errors.

### Milestone 3 — Runner and Artifacts

- [ ] Implement run records.
- [ ] Implement local Playwright adapter.
- [ ] Store screenshots, HTML snapshots, PDFs, and logs.
- [ ] Add run status transitions.
- [ ] Add error taxonomy.

Exit criteria:

- A provider run creates a complete audit trail.

### Milestone 4 — Bill Normalization

- [ ] Define normalized bill schema.
- [ ] Store bill records.
- [ ] Add confidence score.
- [ ] Add review queue.
- [ ] Add JSON export.

Exit criteria:

- A run can produce a normalized bill and export JSON.

### Milestone 5 — Bright Data Adapter

- [ ] Add adapter interface.
- [ ] Add Bright Data browser adapter implementation.
- [ ] Add per-run budget controls.
- [ ] Add adapter selection policy.
- [ ] Add blocked-provider demo.

Exit criteria:

- One provider can run through Bright Data by explicit opt-in.

### Milestone 6 — Registry v0

- [ ] Add registry JSON format.
- [ ] Add provider cards.
- [ ] Add health status fields.
- [ ] Add verification levels:
  - draft
  - community
  - verified
  - broken
  - deprecated
- [ ] Add publishing checklist.

Exit criteria:

- Users can discover providers without reading source folders.

### Milestone 7 — Demo Package

- [ ] Add sample data.
- [ ] Add one normal provider demo.
- [ ] Add one blocked-provider demo.
- [ ] Add one mock provider for docs.
- [ ] Add demo script.
- [ ] Add screenshots or terminal recording.

Exit criteria:

- Demo can be shown in under 5 minutes.

## First Plugin Candidates

Recommended sequence:

1. **Mock provider**
   - deterministic
   - no external dependencies
   - useful for documentation

2. **SCE or SoCalGas-style provider**
   - real utility pattern
   - common bill format
   - easier than Long Beach

3. **Long Beach-style provider**
   - blocked/JS-heavy case
   - demonstrates Bright Data value
   - should use sanitized fixtures and no customer credentials

## Repository Guardrails

- Add \`.gitignore\` for env files, artifacts, screenshots, downloaded bills, traces, and Playwright output.
- Add secret scanning note.
- Add contribution rules requiring sanitized fixtures.
- Add issue template for broken portals.
- Add provider submission checklist.
- Keep public examples generic.

## Open Questions

- Final name: Utility Watch vs Utilitual.
- First real provider for demo.
- Whether dashboard is required for hackathon or CLI + generated HTML is enough.
- Whether plugin packages live in monorepo for v0 or separate repos.
- How strict the plugin sandbox should be in v0.
- Whether registry should be static JSON first or npm package metadata first.

## Recommendation

Build the plugin system before adding many providers. The valuable demo is not that one scraper works. The valuable demo is that a provider can be installed, run, audited, reviewed, exported, and updated without changing the core.

