# Utility Watch Plan

Utility Watch is an open-source platform for utility bill retrieval, normalization, review, and export.

The project should not be a collection of scripts. It should be a stable retrieval runtime with installable provider plugins, a public provider registry, a reviewable audit trail, and a clear path for contributors to add support for new utility portals without changing the core.

## 1. Product Positioning

### One-Line Description

Utility Watch is an open plugin platform that turns utility provider portals into reusable bill retrieval connectors.

### Product Thesis

Utility bill retrieval is fragmented across provider portals, countries, login flows, bill formats, anti-bot systems, PDF layouts, and accounting workflows. Most teams solve this with one-off scrapers. Those scripts work until a portal changes, a provider adds friction, a customer asks for evidence, or a new market needs 20 more utilities.

Utility Watch separates the stable parts from the provider-specific parts:

- The core handles execution, scheduling, credentials, database records, artifacts, logs, review states, exports, and governance.
- Provider plugins handle portal-specific behavior: login, account discovery, bill retrieval, parsing, validation, and recovery hints.
- The registry makes providers discoverable, versioned, installable, testable, and deprecable.
- Bright Data is available as an execution adapter for blocked or JavaScript-heavy portals, but the core must remain useful without it.

The valuable MVP is not "one scraper works." The valuable MVP is "a new provider can be installed, configured, run, audited, reviewed, exported, updated, and replaced without changing the platform."

### What Utility Watch Is

- A plugin-based retrieval runtime for utility bills.
- A provider registry with metadata, health, quality, and support status.
- A normalized data model for bills and retrieval evidence.
- A controlled execution system with local and Bright Data-backed adapters.
- A review workflow for accounting teams and operators.
- A foundation for managed bill retrieval operations.

### What Utility Watch Is Not

- Not a repository of customer-specific scripts.
- Not a credential vault for public examples.
- Not a captcha bypass product.
- Not an accounting system.
- Not a payment processor.
- Not a marketplace with payments in the MVP.
- Not a guarantee that every provider portal can be automated.

## 2. Public/Private Boundary

This repo is public. It must stay clean enough for external contributors, hackathon judges, and potential customers to inspect.

### Public Repo May Contain

- Core framework code.
- Plugin contract definitions.
- Example plugins.
- Synthetic fixtures.
- Sanitized parser samples.
- Provider registry metadata.
- Documentation.
- Test harnesses.
- Mock portal examples.
- Bright Data adapter interfaces and safe configuration examples.

### Public Repo Must Not Contain

- Customer credentials.
- Customer account numbers.
- Real utility bills.
- Private screenshots.
- Production traces.
- OAuth tokens.
- API keys.
- Client-specific naming or workflows.
- Private client-specific business logic.
- Any copied code that cannot be safely open sourced.

### Migration Rule For Existing Knowledge

Existing private scraper knowledge may inform the public architecture, but public code must be rewritten cleanly:

1. Extract patterns, not private implementation.
2. Replace real fixtures with synthetic fixtures.
3. Remove account identifiers, addresses, balances, names, and portal session details.
4. Keep private jobs, credentials, and customer workflows outside this repo.
5. Add a note when a plugin is a sanitized demo rather than production coverage.

## 3. Target Users

### Operators

Operators need to run recurring bill retrieval jobs, inspect failures, review evidence, and know when a provider changed.

Success means:

- They can see what ran, what failed, why it failed, and what action is needed.
- They can approve or reject extracted bills before export.
- They can rerun a job without reading source code.

### Accounting Teams

Accounting users need evidence-backed bill data, not raw scraper output.

Success means:

- Every bill includes provider, account, period, due date, amount, currency, source URL, artifact references, and confidence metadata.
- Low-confidence results go to review instead of export.
- Approved results can be exported as JSON and later mapped to accounting systems.

### Plugin Developers

Developers need a clear provider contract and test harness.

Success means:

- They can build a plugin using a template.
- They can validate the manifest locally.
- They can run parser tests without live credentials.
- They can submit a plugin with a predictable checklist.

### Managed Service Teams

Managed-service teams need a core that can power private operations without leaking private data into the public project.

Success means:

- The open-source core can be used in a private deployment.
- Customer credentials live in private infrastructure.
- Provider plugins can be public, private, or mixed.
- Private deployments can pin provider versions and audit changes.

## 4. MVP Outcome

The MVP is complete when a clean developer can:

1. Clone the repo.
2. Start MySQL and the app with Docker Compose.
3. Run `utility-watch doctor`.
4. Install or enable a mock provider plugin.
5. Configure a synthetic account.
6. Run a retrieval job.
7. See run logs and artifacts.
8. Review a normalized bill.
9. Export the approved bill as JSON.
10. Switch the same run model from local execution to a Bright Data-backed adapter for a blocked-provider demo.

The MVP should be demoable in under 5 minutes and understandable from the repo without a live customer account.

### MVP Success Metrics

The MVP should be judged by repeatability, safety, and clarity rather than provider count.

- **Setup time:** a new developer can run the demo path in under 15 minutes from a clean clone.
- **Demo time:** the planned demo can be shown in under 5 minutes.
- **Provider onboarding:** a mock provider can be installed, validated, run, reviewed, and exported without changing core code.
- **Audit completeness:** every run produces database records, logs, artifacts, adapter metadata, status transitions, and normalized output.
- **Safety:** public repo scans show no secrets, real bills, real account numbers, or private customer artifacts.
- **Bright Data discipline:** Bright Data is disabled by default, opt-in per provider/account, and every usage path records the reason and budget guardrail.
- **Contributor clarity:** an external developer can identify how to add a provider and what will block acceptance.

### MVP Non-Goals That Must Stay Visible

These non-goals should stay visible during implementation because they are the easiest ways to lose focus:

- Do not chase many live providers before the plugin lifecycle works.
- Do not build a paid marketplace before the registry and verification model work.
- Do not build accounting-system integrations before JSON export is stable.
- Do not add production multi-tenancy before the local single-tenant workflow is reliable.
- Do not depend on a fragile live portal for the main demo path.

### MVP Decision Rules

When implementation choices compete, use these rules in order:

1. **Demo reliability beats provider realism.** The primary demo path must work without live credentials or fragile portals.
2. **Platform boundary beats feature count.** A small core with one clean plugin is more valuable than many hardcoded providers.
3. **Auditability beats automation depth.** A run that explains what happened is better than a silent automated fetch.
4. **Policy-first Bright Data usage beats hidden escalation.** Bright Data must be visible, intentional, bounded, and explainable.
5. **Contributor clarity beats internal cleverness.** External developers should understand provider development without private context.
6. **Security defaults beat convenience.** If a setting could expose secrets, spend budget, or export low-confidence data, default to off or review.

### MVP Definition Of Done

The MVP is done only when all of these are true:

- A new developer can run the documented demo from a fresh clone.
- The demo proves the full lifecycle: discover, install, configure, run, review, export.
- At least one provider is implemented as a plugin, not as core logic.
- Every persisted bill points to evidence and confidence metadata.
- Bright Data appears as an optional adapter with opt-in and budget metadata.
- The public repository contains no private customer data, private portal screenshots, credentials, tokens, or client names.
- The next provider can be started from a template and validated with documented commands.

## 5. MVP Scope

### Toolchain (Pinned For v0)

A pinned toolchain is part of the "clone to demo in under 15 minutes" promise (§4). v0 targets:

- **Node.js 22 LTS** (declared via `.nvmrc` and `engines` in `package.json`).
- **Package manager: npm** (lockfile committed). No pnpm/yarn in v0 to keep contributor setup trivial.
- **TypeScript 5.x**, strict mode.
- **MySQL 8** via Docker Compose.
- **Migrations:** a single lightweight SQL-file migration runner invoked by `utility-watch db:migrate` (no heavy ORM in v0; Knex or `node-pg-migrate`-style plain SQL).
- **Browser automation:** Playwright (local adapter) and the Bright Data Scraping Browser (remote adapter) through the same interface.
- **Tests:** Node's built-in test runner or Vitest; fixture tests must run without a browser or live credentials.

### In Scope

- Node.js and TypeScript core.
- MySQL database.
- Docker Compose local environment.
- CLI-first workflow.
- Minimal HTTP API.
- Minimal dashboard or static run report.
- Plugin manifest schema.
- Plugin loader and lifecycle.
- Registry v0 as static JSON.
- Local filesystem artifact storage.
- Structured logs with redaction.
- Local Playwright execution adapter.
- Bright Data execution adapter interface.
- Bright Data Scraping Browser implementation behind explicit opt-in.
- Mock provider plugin.
- One normal-provider demo using synthetic or safely sanitized fixtures.
- One blocked-provider demo path showing Bright Data escalation.
- JSON export for approved bills.
- Provider submission checklist.
- Public/private boundary documentation.

### Out of Scope For MVP

- Paid marketplace.
- Plugin revenue sharing.
- Enterprise tenant billing.
- Full QuickBooks production integration.
- Production secret-manager integration beyond secret handles and environment-backed local development.
- Automatic MFA solving.
- Captcha bypass flows that violate portal terms.
- Bulk scraping of providers without permission or clear operational basis.
- Unlimited provider coverage.
- Distributed workers.
- Kubernetes deployment.
- Mobile app.

### Maybe Later Scope

- S3-compatible artifact storage.
- Accounting adapters.
- Email bill ingestion.
- Manual bill upload and normalization.
- Provider health monitoring.
- Plugin signing.
- Private provider registry.
- Version pinning policies per tenant.
- Role-based access control.
- Multi-tenant SaaS packaging.

### Installation Model

The platform should support three installation shapes over time, but the MVP should implement only the first one.

1. **Local developer install**
   - Docker Compose for MySQL and local services.
   - Environment variables for non-secret config.
   - Placeholder secret handles for examples.
   - File-based artifacts under a local data directory.
   - CLI-first operation.

2. **Private managed install**
   - Same core runtime.
   - Private credentials and customer data outside the public repo.
   - Optional private plugins.
   - Optional private registry overlay.
   - Stronger artifact retention and backup policy.

3. **Hosted product install**
   - Future SaaS or managed control plane.
   - Tenant isolation, hosted registry, role-based access, billing, and support workflows.
   - Not part of the MVP.

The MVP should not pretend to be production-hosted. It should prove that the install path, config model, plugin lifecycle, and audit trail are coherent.

### First-Run Installation Experience

The installation story must be explicit enough that a developer, coding agent, or infrastructure operator can start from an empty container or VPS and reach a working admin session without private context.

Target first-run path:

1. Provision a Linux container, VPS, or local machine with Docker available.
2. Clone the public repository.
3. Copy `.env.example` to `.env`.
4. Run `docker compose up -d mysql`.
5. Run `utility-watch setup` or `npm run setup`.
6. The setup command validates Node, package manager, database connectivity, writable artifact storage, and registry files.
7. Run migrations.
8. Start the API/dashboard process.
9. Open the local setup URL.
10. Complete the first-use wizard.
11. Create the first administrator account.
12. Confirm baseline security settings.
13. Install or activate the mock provider.
14. Create a synthetic account.
15. Run the demo job.

This should feel like a normal product installation, not like manually wiring scripts together. The first-use wizard can be minimal in the MVP, but the architecture must reserve the states and data model for it.

### Setup Wizard v0

The setup wizard should be the guided path for non-core contributors and first-time operators.

Wizard steps:

1. **Environment check**
   - database reachable
   - migrations pending/applied
   - artifact path writable
   - app URL configured
   - registry file readable
   - Bright Data disabled or configured intentionally

2. **System profile**
   - install type: local demo, private managed install, hosted/future
   - site name
   - base URL
   - default timezone
   - default currency
   - artifact retention policy

3. **First administrator**
   - name
   - email or username
   - password
   - recovery warning
   - forced first login after creation

4. **Security defaults**
   - require review before export
   - keep Bright Data disabled unless explicitly enabled
   - disable live-provider credentials in demo mode
   - redact logs by default
   - block plugin installation from unknown sources unless allowlisted

5. **Provider bootstrap**
   - enable mock provider
   - validate example provider manifest
   - create synthetic demo account
   - show the next command or button to run the first job

6. **Completion**
   - show admin dashboard URL
   - show CLI health command
   - show demo script command
   - show where artifacts and logs are stored

The setup wizard must be idempotent. If the first admin already exists, the wizard should not allow a second bootstrap admin without an explicit recovery command.

### Bootstrap And Recovery Commands

The CLI should include installation-specific commands, even if some are thin wrappers in v0:

- `utility-watch setup`: interactive or guided first-run setup.
- `utility-watch setup:check`: non-interactive environment validation for coding agents and CI.
- `utility-watch db:migrate`: apply pending migrations.
- `utility-watch admin:create`: create the first admin only when no admin exists.
- `utility-watch admin:reset`: recovery-only password reset command with local shell access.
- `utility-watch config:show --redacted`: inspect effective config safely.
- `utility-watch demo:seed`: install mock provider and synthetic account.
- `utility-watch doctor`: full health check after setup.

Recovery must be local-shell based in the MVP. Public docs should not ask users to paste secrets or passwords into issues, chat, or public logs.

### Configuration Model

Configuration should be separated by sensitivity and ownership.

| Config Type | Example | Storage In MVP | Public Repo Allowed |
|---|---|---|---|
| Runtime config | DB host, artifact path, log level | `.env` / env vars | `.env.example` only |
| Provider policy | allowed adapters, domains, Bright Data mode | manifest + registry | yes |
| Account config | account display name, provider ID, secret handle | database | synthetic only |
| Secrets | portal username/password, API key | env-backed handles for local dev | no |
| Budget policy | per-run and monthly Bright Data caps | env + database policy | safe defaults only |
| Review policy | confidence threshold, export requirement | config + database | yes |
| Site profile | site name, base URL, timezone, currency | database + env | safe examples only |
| User auth policy | password rules, session lifetime | database + env | safe defaults only |

Rules:

- Public examples show handles, never values.
- Provider manifests declare what is needed; deployments decide whether to supply it.
- Account-level policy can be stricter than provider policy.
- Missing config should fail during `doctor` or validation, not halfway through a run.
- Setup must distinguish demo mode from private managed mode so sample data cannot be confused with real customer data.

### Roles And Capabilities

The MVP can be single-user locally, but the architecture should already know which roles will exist.

| Role | Capabilities | MVP Treatment |
|---|---|---|
| Owner | first administrator, recovery authority, can manage all settings | created during setup |
| Admin | configure system, install providers, manage policies | first real UI role |
| Operator | run jobs, inspect failures, rerun, add notes | CLI and dashboard role |
| Reviewer | approve/reject bills, request provider fix | review queue role |
| Plugin developer | create plugins, run fixture tests, submit metadata | documented workflow |
| Registry maintainer | verify providers, mark broken/deprecated | repo maintainer workflow |
| Auditor | inspect runs, artifacts, exports, decisions | read-only report/log view |

Capability names should be designed before the UI exists:

- `providers.install`
- `providers.activate`
- `providers.deactivate`
- `providers.validate`
- `accounts.create`
- `jobs.run`
- `runs.inspect`
- `bills.review`
- `bills.export`
- `registry.publish`
- `policies.manage`
- `users.manage`
- `settings.manage`
- `setup.complete`
- `ai.diagnose`

This avoids baking admin-only assumptions into the core.

## 6. Core Architecture

### System Components

1. **CLI**
   - Primary MVP interface.
   - Used for local setup, provider install, account setup, job execution, bill review, and export.
   - Must call the same service layer as the API.

2. **HTTP API**
   - Minimal JSON API for dashboard/report integration.
   - Must not expose raw secrets.
   - Should be small enough to keep the MVP focused.

3. **Plugin Loader**
   - Discovers plugin packages.
   - Validates `plugin.json`.
   - Registers capabilities, domains, required secrets, supported countries, and execution policies.
   - Rejects undeclared domains, runtimes, permissions, and secret names.

4. **Provider Registry**
   - Static JSON in v0.
   - Tracks provider ID, display name, country, utility type, plugin package, verification level, health, support status, and known limitations.
   - Enables discovery without reading plugin source.

5. **Job Runner**
   - Creates job and run records.
   - Loads account configuration.
   - Resolves secret handles.
   - Chooses execution adapter.
   - Calls plugin lifecycle methods.
   - Stores artifacts and logs.
   - Normalizes and validates bill data.
   - Creates review items.

6. **Execution Adapters**
   - Provide a stable interface for browser or fetch execution.
   - Keep Bright Data-specific code out of provider business logic where possible.
   - Record why an adapter was selected.

7. **Artifact Store**
   - Local filesystem in MVP.
   - Stores screenshots, HTML snapshots, PDFs, downloaded files, traces, and generated run summaries.
   - Uses redaction and retention policies.

8. **Review Layer**
   - Assigns confidence.
   - Blocks low-confidence export.
   - Supports human approval/rejection.
   - Stores reviewer notes.

9. **Export Layer**
   - Produces JSON v0.
   - v0 destination: writes a deterministic JSON file under the configured exports directory (`<data>/exports/<bill-id>.json`) and echoes the same payload to stdout for the CLI; an `exports` row records format, payload, destination, and status. No external accounting side effects in v0.
   - Later maps to accounting systems.

### Module Responsibility Matrix

| Module | Owns | Must Not Own |
|---|---|---|
| CLI | commands, local operator workflow, validation output | provider-specific portal logic |
| API | local JSON interface, dashboard/report access | public SaaS auth in MVP |
| Config | environment loading, policy defaults, validation | raw secret storage |
| Database | durable records, migrations, state transitions | binary artifacts |
| Registry | provider discovery, status, metadata, verification | credentials or account configuration |
| Plugin loader | manifest validation, permissions, lifecycle binding | runtime business decisions outside the manifest |
| Runner | run orchestration, status transitions, error mapping | portal selectors or provider-specific parsing |
| Adapters | browser/fetch capabilities, Bright Data integration, usage metadata | bill normalization rules |
| Artifact store | files, hashes, retention metadata, redaction status | review decisions |
| Review | confidence thresholds, approval/rejection, notes | parser implementation |
| Export | deterministic output contracts | accounting-system side effects in MVP |

### Core Design Invariants

- Core never imports provider-specific selectors.
- Providers never receive raw global config.
- Providers request capabilities through context objects instead of constructing infrastructure directly.
- Every run has exactly one selected adapter and a recorded selection reason.
- Every state transition is explicit, persisted, and inspectable.
- Every export is derived from an approved bill record.
- Artifacts are sensitive by default, even in local development.

### Preferred Runtime Shape

```txt
packages/core/
  src/
    cli/
    api/
    config/
    db/
    registry/
    plugins/
    runner/
    adapters/
    artifacts/
    review/
    export/

plugins/
  example-provider/
  mock-provider/

registry/
  providers.json

docs/
  public-private-boundary.md
  provider-submission-checklist.md
  plugin-contract.md
  bright-data-policy.md
```

## 7. Plugin Contract

### Manifest

Each plugin must include `plugin.json`. The authoritative manifest specification is [`docs/plugin-contract.md`](./docs/plugin-contract.md) §3 (schema `uw-plugin-v1`); this section is a summary and must not diverge from it or from the committed `plugins/example-provider/plugin.json`.

Required fields (`uw-plugin-v1`):

- `id`: stable lowercase provider ID, for example `sce-us`.
- `name`: human-readable provider name.
- `version`: semantic plugin version.
- `license`: plugin license.
- `schemaVersion`: manifest schema version (`uw-plugin-v1`).
- `coreVersion`: compatible core version range.
- `country`: ISO country code.
- `serviceTypes`: utility categories (electricity, gas, water, waste, internet, telecom, other).
- `homepage`: provider or plugin homepage.
- `entrypoint`: compiled plugin entrypoint.
- `capabilities`: declared operations (`auth.login`, `accounts.list`, `bills.list`, `bills.download`, `bills.normalize`, ...).
- `auth`: authentication shape (`type`, `secretRefs` — handles, never values).
- `permissions`: requested runtime permissions (`network` allowed domains, `artifacts` types, `filesystem` scope, `brightData` mode).
- `quality`: verification and maintenance metadata (`status`, `verification`, `lastVerified`, `limitations`).
- `tests`: fixture path and healthcheck command.
- `support`: maintainer and issue metadata.

Example (matches the committed `example-provider`):

```json
{
  "id": "sce-us",
  "name": "Southern California Edison",
  "version": "0.1.0",
  "license": "Apache-2.0",
  "schemaVersion": "uw-plugin-v1",
  "coreVersion": ">=0.1.0 <1.0.0",
  "country": "US",
  "serviceTypes": ["electricity"],
  "homepage": "https://www.sce.com",
  "entrypoint": "./dist/index.js",
  "capabilities": [
    "auth.login",
    "accounts.list",
    "bills.list",
    "bills.download",
    "bills.normalize"
  ],
  "auth": {
    "type": "username-password",
    "secretRefs": ["username", "password"]
  },
  "permissions": {
    "network": ["sce.com", "*.sce.com"],
    "artifacts": ["html", "pdf", "screenshot", "json"],
    "filesystem": "artifacts-only",
    "brightData": "supported"
  },
  "quality": {
    "status": "draft",
    "verification": "fixture-only",
    "lastVerified": null,
    "limitations": [
      "MFA challenges route to human review",
      "Synthetic fixtures only in the public repo"
    ]
  },
  "tests": {
    "fixtures": "./fixtures",
    "healthcheck": "npm run test:plugin"
  },
  "support": {
    "maintainer": "Utility Watch Maintainers",
    "url": "https://github.com/kapitecsoluciones/utility-watch/issues"
  }
}
```

### Lifecycle Methods

The TypeScript lifecycle interface is defined in [`docs/plugin-contract.md`](./docs/plugin-contract.md) §5. Method names must match that contract exactly:

- `healthcheck(ctx)`
- `login(ctx)`
- `listAccounts(ctx)`
- `listBills(ctx, account)`
- `downloadBill(ctx, bill)`
- `normalizeBill(ctx, artifact)`

The MVP may implement only the methods a given provider needs, but the names above are the contract. (Earlier drafts used `fetchBills`/`validateBill`; those names are retired — `listBills` + `downloadBill` replace `fetchBills`, and validation is part of `normalizeBill` and the core review layer, not a separate plugin method.)

### Optional Hooks

- `beforeRun(ctx)`
- `afterRun(ctx)`
- `onBlocked(ctx, error)`
- `onPortalChanged(ctx, evidence)`

### Plugin Rules

- Plugins must not read undeclared secrets.
- Plugins must not navigate to undeclared domains.
- Plugins must not write outside their artifact sandbox.
- Plugins must not log raw passwords, tokens, account numbers, or full bill PDFs.
- Plugins must return structured errors from the shared error taxonomy.
- Plugins must include parser tests for normalized bill output.
- Plugins must include fixture tests that do not require live credentials.

## 8. Execution Adapters

### `local-playwright`

Default adapter for development and low-friction portals.

Responsibilities:

- Launch browser locally.
- Capture screenshots and HTML snapshots.
- Download PDFs.
- Expose a controlled browser/page interface to plugins.
- Enforce declared domains where feasible.

### `brightdata-scraping-browser`

The chosen Bright Data product for v0 is the **Scraping Browser** (a remote, Playwright-compatible browser on Bright Data infrastructure). It is the adapter for JavaScript-heavy single-page portals, portals that require a stable US residential vantage point, and reliable execution across many providers at scale.

This adapter is **not** a captcha or MFA bypass. Utility portals like Southern California Edison (Okta-based login) and SoCalGas (React SPA) are demanding because of heavy client-side JavaScript, session/geo sensitivity, and the operational cost of keeping many portals working at once — not because we defeat human-verification steps. MFA and captcha always route to `auth.mfa_required` / human review.

Responsibilities:

- Use Bright Data only when plugin and account policy permit it.
- Drive the remote browser through the same adapter interface as `local-playwright`, so provider plugins are adapter-agnostic.
- Record Bright Data usage by run.
- Enforce per-run and per-provider budget limits.
- Store adapter selection reason.
- Surface cost warnings before retries.

### Future Adapters

- `http-fetch`: for simple APIs or static downloads.
- `email-ingest`: for bills delivered by email.
- `manual-upload`: for human-uploaded PDFs.
- `remote-worker`: for isolated execution in private infrastructure.

## 9. Bright Data Policy

Bright Data is a retrieval reliability layer, not the product itself.

### Use Bright Data When

- Local execution is blocked.
- A provider needs stable geography.
- A portal is JavaScript-heavy and unreliable locally.
- A provider returns inconsistent results from normal data center IPs.
- The plugin explicitly declares Bright Data support.
- The account explicitly allows Bright Data execution.

### Do Not Use Bright Data When

- The mock provider or fixture tests are enough.
- Local Playwright works reliably.
- The provider terms or customer policy prohibit this type of access.
- The run lacks budget configuration.
- A captcha or MFA step requires human action.

### Cost Controls

- Per-run maximum spend.
- Per-provider daily maximum spend.
- Per-account monthly maximum spend.
- Retry limit by error code.
- Dry-run mode that estimates adapter use without executing.
- Adapter choice logged in every run.
- Default to local execution unless policy says otherwise.

### MVP Budget Defaults

- `BRIGHTDATA_ENABLED=false` by default.
- Bright Data adapter requires explicit environment configuration.
- Any provider using Bright Data must declare it in the manifest.
- Any account using Bright Data must opt in.
- Demo scripts should use tiny, bounded runs.

## 10. AI-Assisted Improvement Model

AI is not the product and should not be framed as a magic retrieval agent. Utility Watch should remain a governed utility bill retrieval platform. AI can be valuable as an optional improvement layer around maintenance, diagnosis, and operator clarity.

### Good AI Use Cases

- **Run diagnosis:** summarize why a run failed using error taxonomy, adapter metadata, screenshots, redacted HTML, plugin version, and prior failure history.
- **Portal change triage:** compare new artifacts against previous successful artifacts and suggest likely selector, text, or flow changes.
- **Parser assistance:** propose parser updates and fixture tests from synthetic or redacted samples.
- **Registry quality scoring:** explain provider health using deterministic signals like verification age, failure rate, fixture coverage, known limitations, and maintainer activity.
- **Operator assistant:** draft action hints for failures, review notes, and maintainer issues.

### AI Must Not Do In MVP

- Hold or request raw credentials.
- Approve bills or exports without human action.
- Decide to spend Bright Data budget without policy.
- Browse undeclared provider domains.
- Commit generated plugin changes without review.
- Replace deterministic validation, schemas, tests, or audit logs.

### Suggested MVP AI Feature

The best first AI feature is **Run Diagnosis Notes**:

1. A run fails or enters `blocked`, `failed`, or `needs_review`.
2. Core collects redacted logs, error code, adapter metadata, and safe artifact snippets.
3. AI produces a short diagnosis, likely cause, suggested next action, and confidence.
4. The note is stored as run metadata.
5. The operator can accept, ignore, or convert it into a maintainer issue.

This feature helps the platform improve itself operationally without giving AI authority over retrieval, security, spending, review, or export.

## 11. Data Model v0

### Tables

#### `installations`

- `id`
- `site_name`
- `base_url`
- `install_type`
- `timezone`
- `default_currency`
- `setup_completed_at`
- `created_at`
- `updated_at`

#### `users`

- `id`
- `name`
- `email`
- `password_hash`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

#### `roles`

- `id`
- `name`
- `description`
- `created_at`
- `updated_at`

#### `user_roles`

- `user_id`
- `role_id`
- `created_at`

#### `role_capabilities`

- `role_id`
- `capability`

#### `settings`

- `key`
- `value_json`
- `sensitivity`
- `updated_by`
- `updated_at`

#### `providers`

- `id`
- `name`
- `country`
- `utility_type`
- `registry_status`
- `current_version`
- `created_at`
- `updated_at`

#### `provider_versions`

- `id`
- `provider_id`
- `version`
- `manifest_json`
- `verification_level`
- `checksum`
- `released_at`

#### `accounts`

- `id`
- `provider_id`
- `display_name`
- `external_account_ref`
- `country`
- `utility_type`
- `secret_handle`
- `brightdata_allowed`
- `status`
- `created_at`
- `updated_at`

#### `jobs`

- `id`
- `account_id`
- `schedule_kind`
- `schedule_config_json`
- `enabled`
- `created_at`
- `updated_at`

#### `runs`

- `id`
- `job_id`
- `account_id`
- `provider_id`
- `provider_version`
- `adapter`
- `adapter_reason`
- `status`
- `started_at`
- `finished_at`
- `error_code`
- `error_message`
- `cost_estimate_usd`
- `cost_actual_usd`

#### `run_logs`

- `id`
- `run_id`
- `level`
- `event`
- `message`
- `metadata_json`
- `created_at`

#### `artifacts`

- `id`
- `run_id`
- `type`
- `path`
- `mime_type`
- `sha256`
- `redaction_status`
- `created_at`

#### `bills`

- `id`
- `run_id`
- `account_id`
- `provider_id`
- `statement_date`
- `period_start`
- `period_end`
- `due_date`
- `amount_due`
- `currency`
- `normalized_json`
- `confidence_score`
- `source_url`
- `primary_artifact_id`
- `status`
- `created_at`

#### `reviews`

- `id`
- `bill_id`
- `status`
- `reviewer`
- `notes`
- `created_at`
- `updated_at`

#### `exports`

- `id`
- `bill_id`
- `format`
- `payload_json`
- `destination`
- `status`
- `created_at`

## 12. Normalized Bill Schema v0

Required fields:

- `providerId`
- `providerName`
- `accountRef`
- `statementDate`
- `periodStart`
- `periodEnd`
- `dueDate`
- `amountDue`
- `currency`
- `lineItems`
- `sourceUrl`
- `evidence`
- `confidence`

Example:

```json
{
  "providerId": "example-electric-us",
  "providerName": "Example Electric",
  "accountRef": "demo-account",
  "statementDate": "2026-05-01",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-30",
  "dueDate": "2026-05-21",
  "amountDue": 128.44,
  "currency": "USD",
  "lineItems": [
    { "label": "Electric usage", "amount": 100.12 },
    { "label": "Taxes and fees", "amount": 28.32 }
  ],
  "sourceUrl": "https://example.test/bills",
  "evidence": {
    "primaryArtifact": "artifact_123",
    "parser": "example-electric-us@0.1.0",
    "fields": {
      "amountDue": { "confidence": 0.98, "source": "pdf-text" },
      "dueDate": { "confidence": 0.96, "source": "pdf-text" }
    }
  },
  "confidence": 0.97
}
```

### Confidence Scoring v0

Confidence is deterministic in v0 — no model, no heuristics that cannot be explained. It is a per-field score combined into an overall score, so a reviewer can always see why a bill needs review.

Per-field score is assigned by extraction method:

- `1.0` — value came from a structured source (intercepted JSON API, labeled table cell).
- `0.9` — value parsed from PDF text with an anchored label match.
- `0.7` — value parsed by a looser positional/regex fallback.
- `0.0` — required field missing.

Overall `confidence` is the minimum of the required-field scores (`amountDue`, `dueDate`, `statementDate`). A bill scoring below the configured threshold (default `0.85`) is created with status `needs_review` and error `bill.low_confidence`; it cannot be exported until a human approves it. Mock and fixture providers set scores explicitly so tests are deterministic.

## 13. Run States

### Job-Level States

- `enabled`
- `disabled`
- `paused`

### Run-Level States

- `queued`
- `running`
- `blocked`
- `failed`
- `needs_review`
- `approved`
- `exported`
- `skipped`

### Review States

- `pending`
- `approved`
- `rejected`
- `needs_provider_fix`
- `duplicate`

## 14. Error Taxonomy

The canonical error taxonomy is defined once in [`docs/plugin-contract.md`](./docs/plugin-contract.md) §7 and must not be duplicated or forked here. Plugins and the runner map every failure to one of those dotted, lowercase codes (for example `auth.invalid_credentials`, `auth.mfa_required`, `portal.layout_changed`, `portal.blocked`, `portal.timeout`, `portal.rate_limited`, `provider.unsupported_account`, `bill.not_found`, `bill.parse_failed`, `bill.low_confidence`, `policy.denied`, `adapter.failed`, `artifact.missing`, `error.unknown`).

`auth.mfa_required` always routes to human action (the run enters `needs_review`); the platform never attempts to defeat MFA or captcha automatically.

Each error must include:

- provider ID
- plugin version
- account ID
- run ID
- adapter
- retryable flag
- operator action hint

## 15. CLI v0

Required commands:

- `utility-watch setup`
- `utility-watch setup:check`
- `utility-watch db:migrate`
- `utility-watch admin:create`
- `utility-watch admin:reset`
- `utility-watch config:show --redacted`
- `utility-watch doctor`
- `utility-watch providers:list`
- `utility-watch providers:install <provider-id>`
- `utility-watch providers:activate <provider-id>`
- `utility-watch providers:deactivate <provider-id>`
- `utility-watch providers:validate <path>`
- `utility-watch accounts:create`
- `utility-watch jobs:create`
- `utility-watch jobs:run <job-id>`
- `utility-watch runs:show <run-id>`
- `utility-watch bills:list`
- `utility-watch bills:review <bill-id>`
- `utility-watch bills:export <bill-id>`

Nice-to-have commands:

- `utility-watch providers:test <provider-id>`
- `utility-watch artifacts:list <run-id>`
- `utility-watch demo`
- `utility-watch demo:seed`
- `utility-watch users:list`

## 16. API v0

Minimal endpoints:

- `GET /health`
- `GET /setup/status`
- `POST /setup/complete`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /users`
- `POST /users`
- `GET /roles`
- `GET /settings`
- `PATCH /settings`
- `GET /providers`
- `GET /providers/:id`
- `POST /providers/:id/install`
- `POST /providers/:id/activate`
- `POST /providers/:id/deactivate`
- `GET /accounts`
- `POST /accounts`
- `POST /jobs`
- `POST /jobs/:id/run`
- `GET /runs/:id`
- `GET /runs/:id/logs`
- `GET /runs/:id/artifacts`
- `GET /bills`
- `GET /bills/:id`
- `POST /bills/:id/review`
- `POST /bills/:id/export`

API v0 is local/developer oriented. Hosted/public authentication is not an MVP goal, but first-admin bootstrap and role/capability modeling are MVP architecture requirements so the product does not need to be redesigned after the demo.

## 17. Registry And Plugin Governance

### Verification Levels

- `draft`: plugin exists but has not been reviewed.
- `community`: basic manifest and tests pass.
- `verified`: reviewed by maintainers, fixtures pass, documented limitations.
- `broken`: known to fail against current provider portal.
- `deprecated`: replaced, unsupported, or unsafe to use.

### Provider Card Fields

- Provider name.
- Country.
- Utility type.
- Plugin ID.
- Latest version.
- Verification level.
- Last successful fixture test.
- Last known live check, if available.
- Bright Data requirement.
- Known limitations.
- Maintainer.
- Support channel.

### Submission Checklist

A provider submission should include:

- Valid `plugin.json`.
- Fixture tests.
- Parser tests.
- Sanitized artifacts.
- No real credentials.
- No real customer data.
- Error taxonomy mapping.
- Declared domains.
- Declared secret names.
- Bright Data policy.
- Known limitations.
- Maintainer contact.

## 18. Security And Privacy

### Secret Handling

- Public examples use placeholder secret handles only.
- Local development may use env variables.
- Runtime logs must never print raw secrets.
- Database stores secret references, not secret values, unless explicitly running local demo mode.
- Future production deployments should integrate with a secret manager.

### User Authentication

The MVP does not need enterprise identity, but it does need a credible local admin model.

Minimum rules:

- The first admin is created only through setup when no admin exists.
- Passwords are hashed with a modern password hashing function.
- Sessions are HTTP-only when dashboard/API auth exists.
- CLI recovery commands require local shell access.
- Setup endpoints are disabled after setup completion.
- Role checks use capabilities, not hardcoded role names.
- Audit logs record admin creation, login failures, provider activation, settings changes, exports, and Bright Data enablement.

Future auth can add SSO, MFA, invite flows, and hosted-tenant isolation, but the MVP should not leave first-use access ambiguous.

### Data Redaction

Logs and artifacts should redact:

- passwords
- tokens
- session cookies
- account numbers where possible
- customer names
- addresses
- full bill PDFs in public fixtures

### Plugin Isolation

MVP isolation is policy-based and test-enforced. Stronger sandboxing can come later.

Minimum controls:

- declared domains
- declared permissions
- artifact directory sandbox
- structured secret access
- log redaction
- no unrestricted shell execution from plugins

### Compliance Notes

Utility Watch should support legitimate account-owner retrieval workflows. It should not be positioned as unauthorized access tooling. Provider terms, customer authorization, and local laws remain deployment responsibilities.

### Threat Model v0

The MVP threat model should be explicit even if sandboxing is not fully mature.

| Threat | Example | MVP Control | Later Control |
|---|---|---|---|
| Secret leakage | Plugin logs password or session cookie | redaction, structured secret handles, fixture-only public tests | external secret manager, secret-scoped runtime |
| Data leakage | Real bill committed to public fixture | public/private checklist, PR review, secret scanning | automated artifact classifier |
| Plugin exfiltration | Plugin sends data to undeclared domain | declared domains, manifest validation, review | network sandbox, signed plugins |
| Cost runaway | Bright Data retries loop on blocked portal | disabled by default, budget caps, retry caps | account-level spend dashboard |
| Portal drift | Provider UI changes silently | error taxonomy, artifacts, broken status | provider health checks and alerts |
| Unauthorized usage | Plugin used without account-owner permission | documentation and policy checks | deployment-level authorization records |

### Privacy Design Principles

- Store the minimum needed to prove retrieval and support review.
- Prefer references to secrets over stored secret values.
- Keep raw artifacts local/private by default.
- Make redaction a core service, not a plugin responsibility.
- Treat public fixtures as synthetic unless explicitly marked otherwise.
- Fail closed when confidence, authorization, or adapter policy is unclear.

## 19. Hackathon Demo Plan

### Hackathon Track: Finance & Market Intelligence

Utility Watch is submitted under **Finance & Market Intelligence**. The framing is not "we scrape bills" — it is **utility cost intelligence across a property portfolio**: turning data locked behind fragmented utility portals into evidence-backed, auditable, exportable financial records (accounts payable, due-date tracking, cost normalization across electricity, gas, water, waste, and telecom). Bright Data is the live-web data layer that makes this work reliably across many portals; the output is structured financial data, reviewed and ready for accounting.

To qualify for the Bright Data partner prize, the Scraping Browser adapter is integrated into this Finance & Market Intelligence submission as the execution path for JS-heavy, geo-sensitive portals.

### Demo Story

"A team manages utility accounts across a portfolio of properties, with bills spread across many fragmented provider portals (electricity, gas, water, waste). Instead of one-off scripts, they install provider plugins into Utility Watch. The core runs each provider, stores evidence, normalizes the bill into a financial record, routes uncertain data to review, and exports approved JSON for accounting. When a portal is a heavy JavaScript app or needs a stable US vantage point, the same plugin runs through the Bright Data Scraping Browser under explicit budget and policy controls."

### Demo Flow

1. Open repo and show provider registry.
2. Run `utility-watch doctor`.
3. List providers.
4. Install/enable mock provider.
5. Create demo account.
6. Run demo job locally.
7. Show artifacts and normalized bill.
8. Approve bill.
9. Export JSON.
10. Run blocked-provider demo with Bright Data adapter enabled.
11. Show adapter reason, cost guardrail, and resulting audit trail.

### Demo Must Show

- Plugin manifest.
- Registry entry.
- Run record.
- Artifact list.
- Normalized bill.
- Review state.
- Export payload.
- Bright Data opt-in, not hidden dependency.

### Demo Should Avoid

- Real customer credentials.
- Real bills.
- Any portal access that requires private authorization.
- Long-running live browser flows.
- Large Bright Data spend.

### Judge-Facing Narrative

The hackathon story should be simple:

1. Valuable financial data — utility costs across a property portfolio — is locked behind fragmented provider portals.
2. One-off scrapers are hard to maintain and hard to trust, especially when accounting depends on the numbers.
3. Utility Watch turns portal automation into installable, reviewable, governed plugins.
4. The Bright Data Scraping Browser makes the architecture viable for JS-heavy, geo-sensitive portals at portfolio scale.
5. The output is not just scraped data; it is evidence-backed, normalized bill data ready for review and accounting export.

### Demo Scorecard

The demo should make these points visible without explanation-heavy slides:

- **Web data access:** a blocked-provider path uses Bright Data under explicit policy.
- **Agent/tooling value:** provider logic is packaged as a reusable plugin, not hardcoded into the core.
- **Fresh data:** a run creates a current retrieval record rather than relying only on static samples.
- **Trust:** normalized fields point back to artifacts and confidence metadata.
- **Maintainability:** provider failure becomes a registry/status/update problem, not a core rewrite.
- **Open-source potential:** outside developers can add providers using a documented contract.

## 20. Milestone Plan

The milestone order is intentional. Do not start provider volume, marketplace polish, or live portal coverage before the vertical slice exists.

### Effort Estimate (agent-hours)

Rough build effort, in agent-hours of focused work (not calendar days):

| Milestone | Estimate |
|---|---|
| M0 Repository Foundation | ~0.5h (mostly done) |
| M1 Core Skeleton | 6–8h |
| M2 Plugin Loader | 3–4h |
| M3 Runner & Artifacts | 4–6h |
| M4 Bill Normalization & Review | 3–4h |
| M5 Bright Data Scraping Browser adapter | 3–5h |
| M6 Registry v0 | ~2h |
| M7 Demo Package | 3–4h |
| `sce-us` + `socalgas-us` real plugins | 6–10h |

Core platform (M1–M7) lands in ~24–33h; the two real providers add 6–10h. **Schedule risk lives almost entirely in the two live providers** (login flows, MFA handling, parser robustness against real portals) — the mock-based vertical slice is the safe path and must work first so there is always a demoable build. With a ~2-day submission window, the platform is feasible; treat live-provider polish as the cut line if time runs short.

### Dependency Map

```txt
Milestone 0 Repository Foundation
  -> Milestone 1 Core Skeleton
    -> Milestone 2 Plugin Loader
      -> Milestone 3 Runner And Artifacts
        -> Milestone 4 Bill Normalization And Review
          -> Milestone 7 Demo Package
    -> Milestone 5 Bright Data Adapter
    -> Milestone 6 Registry v0
```

Critical path for the hackathon demo:

```txt
doctor -> manifest validation -> mock provider run -> artifact trail -> normalized bill -> review -> export -> Bright Data escalation
```

### Milestone 0 - Repository Foundation

Status: mostly complete.

- [x] Create public GitHub repo.
- [x] Add Apache-2.0 license.
- [x] Add README.
- [x] Add PLAN.md.
- [x] Add plugin manifest example.
- [x] Add public/private boundary documentation.
- [x] Add `CLAUDE.md` or equivalent project instructions for coding agents.
- [ ] Add issue templates.
- [ ] Add pull request template.

Exit criteria:

- Repo is public.
- No private code or secrets.
- Plan is clear enough for a collaborator to execute.

### Milestone 1 - Core Skeleton

- [ ] Initialize Node/TypeScript workspace.
- [ ] Add package manager config.
- [ ] Add CLI entrypoint.
- [ ] Add Docker Compose with MySQL.
- [ ] Add migration system.
- [ ] Add schema v0 migrations.
- [ ] Add installation profile and settings tables.
- [ ] Add user, role, and capability tables.
- [ ] Add first-admin bootstrap flow.
- [ ] Add setup wizard API/CLI path.
- [ ] Add structured logging.
- [ ] Add config loading from env.
- [ ] Add `utility-watch doctor`.

Exit criteria:

- Fresh clone can start MySQL.
- First-run setup can create exactly one initial admin.
- Setup status is visible and idempotent.
- `utility-watch doctor` validates runtime, config, and DB.
- CI runs typecheck and tests.

### Milestone 2 - Plugin Loader

- [ ] Define `plugin.json` JSON schema.
- [ ] Add manifest validator.
- [ ] Add provider install/list/validate commands.
- [ ] Validate domains, permissions, secrets, adapters, and artifact types.
- [ ] Add example provider package.
- [ ] Add mock provider package.

Exit criteria:

- Valid provider installs.
- Invalid provider fails with clear errors.
- Registry can list installed and available providers.

### Milestone 3 - Runner And Artifacts

- [ ] Implement job/run records.
- [ ] Implement local Playwright adapter.
- [ ] Implement artifact directory layout.
- [ ] Capture screenshots, HTML snapshots, PDFs, and run summaries.
- [ ] Add run status transitions.
- [ ] Add error taxonomy mapping.

Exit criteria:

- A mock provider run creates database records and artifacts.
- Failure states are inspectable through CLI.

### Milestone 4 - Bill Normalization And Review

- [ ] Define normalized bill schema.
- [ ] Store bill records.
- [ ] Add confidence scoring.
- [ ] Add review state.
- [ ] Add bill list/show/review commands.
- [ ] Add JSON export.

Exit criteria:

- A run can produce a normalized bill.
- Low-confidence bills require review.
- Approved bills export deterministic JSON.

### Milestone 5 - Bright Data Adapter

- [ ] Define adapter interface.
- [ ] Implement Bright Data adapter behind env flag.
- [ ] Add account-level Bright Data opt-in.
- [ ] Add per-run budget controls.
- [ ] Add adapter selection policy.
- [ ] Add blocked-provider demo using synthetic target or safe public test target.

Exit criteria:

- One demo provider can run through Bright Data by explicit opt-in.
- Run record shows adapter choice and budget metadata.

### Milestone 6 - Registry v0

- [ ] Finalize `registry/providers.json` schema.
- [ ] Add provider cards.
- [ ] Add verification levels.
- [ ] Add known limitations fields.
- [ ] Add registry validation in CI.
- [ ] Add publishing checklist docs.

Exit criteria:

- Users can discover provider support without reading source folders.
- Broken/deprecated status is visible.

### Milestone 7 - Demo Package

- [ ] Add demo fixtures.
- [ ] Add demo script.
- [ ] Add generated HTML report or minimal dashboard.
- [ ] Add screenshots or terminal recording.
- [ ] Add hackathon README section.

Exit criteria:

- Demo completes in under 5 minutes.
- Demo uses no private data.
- Demo clearly shows why the plugin model matters.

### Milestone Definition Of Ready

A milestone is ready to start when:

- The previous dependency milestone has met exit criteria.
- Required schemas or interfaces are documented before implementation.
- Test or verification commands are known.
- Public/private data boundaries are clear for any fixture or artifact.
- The milestone can be completed without needing private credentials.

### Milestone Definition Of Done

A milestone is done when:

- Its exit criteria pass from a clean checkout.
- New commands are documented.
- Tests or validation checks run in CI where practical.
- Any new public artifact is synthetic or sanitized.
- The plan or docs are updated if implementation changed the architecture.

## 21. Acceptance Criteria

### Technical Acceptance

- Fresh clone works from README instructions.
- Docker Compose starts required services.
- First-run setup guides the user through environment check, site profile, first admin creation, security defaults, and demo provider bootstrap.
- Setup cannot create multiple first admins accidentally.
- CLI doctor passes.
- Manifest validation catches invalid plugins.
- Mock provider run completes.
- Bill normalization test passes.
- JSON export is deterministic.
- Logs are structured and redact secrets.
- CI passes.

### Product Acceptance

- A collaborator can explain the platform without private context.
- A new operator understands how to install, log in, add users, install plugins, configure an account, run a job, review a bill, and export data.
- The plugin model is clear.
- Bright Data integration is clearly bounded.
- The MVP demonstrates a repeatable provider lifecycle.
- The repo is safe to share publicly.

### Demo Acceptance

- Demo can be run without customer credentials.
- Demo shows local execution and Bright Data escalation.
- Demo output includes bill data, evidence, review, and export.
- Demo does not depend on fragile live portals unless explicitly optional.

### Developer Experience Acceptance

- The first provider template is understandable without reading core internals.
- Invalid manifests fail with actionable errors.
- Parser tests can run without browser automation.
- A contributor can run one command to validate a provider package.
- The repository clearly separates core, plugins, registry, fixtures, docs, and generated artifacts.

### Operations Acceptance

- The first administrator can manage users, roles, provider activation, settings, and policies.
- A failed run tells the operator what happened and what to do next.
- A blocked provider can be marked broken without deleting it from the registry.
- A run can be retried without losing the original audit trail.
- Artifact retention is documented.
- Bright Data spend is visible per run and can be capped.

## 22. Provider Roadmap

Utility Watch is not a hypothetical platform: it is the open implementation of a real, multi-portal bill-retrieval need across a US (California) property portfolio. The registry roadmap below is that real provider set. This is what makes the plugin model credible — the fragmentation problem is concrete, not invented for a demo.

### Build Sequence

1. **Mock provider** — deterministic, no external dependencies, best for docs and tests.
2. **`sce-us` (Southern California Edison, electricity)** — first real provider. Username/password + Okta login, JS-heavy portal, an interceptable internal billing API. The most battle-tested pattern and the strongest case for the Scraping Browser adapter.
3. **`socalgas-us` (SoCalGas, gas)** — second real provider. React SPA where amounts are resolved through network API interception. A deliberately different shape from SCE, to prove the contract generalizes.
4. Remaining providers below ship incrementally as plugins, each landing in the registry with an honest verification level.

### Production Registry Roadmap

| Plugin ID | Provider | Service | Status |
|---|---|---|---|
| `sce-us` | Southern California Edison | electricity | demo (draft) |
| `socalgas-us` | SoCalGas | gas | demo (draft) |
| `sdge-us` | San Diego Gas & Electric | electricity, gas | planned |
| `ladwp-us` | LA Dept. of Water and Power | electricity, water | planned |
| `cvwd-us` | Coachella Valley Water District | water | planned |
| `fontana-water-us` | Fontana Water | water | planned |
| `athens-us` | Athens Services | waste | planned |
| `burrtec-us` | Burrtec | waste | planned |
| `riverside-us` | City of Riverside utilities | water, waste | planned |
| `ontario-us` | City of Ontario CA utilities | water, waste | planned |
| `victorville-us` | City of Victorville utilities | water, waste | planned |
| `redlands-us` | City of Redlands utilities | water | planned |
| `longbeach-us` | City of Long Beach utilities | water, waste | planned |
| `spectrum-us` | Spectrum | internet, telecom | planned |

A recurring secondary pattern is the **billing aggregator** (one login fronting many municipal accounts). It will be modeled as its own plugin shape once the two demo providers are stable.

### Boundary Discipline (non-negotiable)

These public plugins are clean reimplementations, not copied private code. Per §2 and the project `CLAUDE.md`:

- Public artifacts: provider names (public utilities), domains, and rewritten technical patterns only.
- Never public: customer/property identifiers, real account numbers, real amounts or due dates, credentials, session data, or any production fixture. Public fixtures are synthetic.

Long-term, additional providers across more service types and countries can be added by contributors, but the MVP does not promise coverage before a plugin exists and is verified.

## 23. Risks

### Scope Creep

Risk: the project becomes a large scraper suite before the platform exists.

Mitigation: build mock provider, plugin loader, run model, and review/export first.

### Private Data Leakage

Risk: existing client context leaks into public repo.

Mitigation: synthetic fixtures only, public/private docs, secret scanning, and strict PR review.

### Provider Fragility

Risk: live portals change during demo.

Mitigation: demo must work with mock/synthetic providers; live providers are optional.

### Bright Data Cost Drift

Risk: browser retries consume budget.

Mitigation: opt-in only, hard budgets, retry caps, dry-run mode, cost logging.

### Legal/Terms Risk

Risk: contributors submit plugins that violate provider terms.

Mitigation: plugin policy, maintainer review, documented authorization assumptions, and ability to reject providers.

### Plugin Trust

Risk: arbitrary community plugins can exfiltrate data.

Mitigation: v0 uses review and policy controls; future versions should add signing, sandboxing, and permission enforcement.

### Weak Open-Source Story

Risk: judges or contributors see the repo as a private scraper extraction rather than a reusable platform.

Mitigation: lead with mock/synthetic providers, clear plugin contract, registry governance, and documented public/private boundary.

### Over-Abstracted Core

Risk: the platform becomes abstract before one complete retrieval path works.

Mitigation: implement a thin vertical slice first: mock provider, run record, artifact, normalized bill, review, export.

### Under-Specified Provider Quality

Risk: low-quality plugins enter the registry and make the platform look unreliable.

Mitigation: require fixture tests, parser tests, declared limitations, verification levels, and broken/deprecated statuses.

## 24. Decisions

### Resolved For v0

- **Project name:** Utility Watch (public). "Utilitual" retired.
- **Hackathon demo providers:** mock provider + two real providers — `sce-us` (Southern California Edison, electricity, Okta login) and `socalgas-us` (SoCalGas, gas, React SPA). Two distinct portal patterns prove the plugin model generalizes; the remaining real providers ship as registry entries in `planned` status (see §22).
- **Bright Data product:** the **Scraping Browser** is the v0 adapter (`brightdata-scraping-browser`). Web Unlocker / SERP / MCP are documented as later adapter options only.
- **v0 dashboard:** generated HTML run report first; full web app later.
- **Plugin location:** monorepo plugins under `plugins/` for v0; external package support later.
- **Registry:** static JSON in-repo for v0; hosted/package registry later.
- **Private plugins:** supported as a documented deployment pattern; no private registry mechanics in the MVP.
- **Browser access:** plugins receive adapter-provided browser capabilities; they never construct a browser or call Bright Data directly.
- **AI/OCR parsing:** optional and policy-gated; deterministic parsers are the first path.

### Still Open (do not block the MVP)

- How strict plugin sandboxing must be before accepting external community plugins.
- Whether managed deployments should support private registries in v1.
- Final plugin publishing mechanism (npm packages vs registry manifests vs git subdirectories vs hybrid) once external contribution opens.

All v0 defaults are now captured under "Resolved For v0" above. The remaining open items are listed under "Still Open"; they do not block the MVP.

## 25. Delivery Tracks

Utility Watch needs two different tracks: a hackathon track that proves the idea quickly, and a product track that prevents the prototype from becoming throwaway code.

### Hackathon Track

Goal: prove the platform concept in a short, judge-friendly demo.

Must deliver:

- Public repo with clear README and plan.
- CLI demo path.
- Mock provider.
- Provider manifest validation.
- Run record and artifact trail.
- Normalized bill output.
- Review and JSON export.
- Bright Data escalation demo with strict opt-in and budget metadata.
- Demo script that works without private credentials.

Can fake or simplify:

- Scheduler.
- Full API.
- Rich dashboard.
- Live provider coverage.
- Production secret manager.
- Advanced sandboxing.

Must not fake:

- Plugin boundary.
- Run audit trail.
- Normalized bill schema.
- Public/private data boundary.
- Bright Data opt-in policy.

### Product Track

Goal: make the project credible after the hackathon.

Must deliver:

- Repeatable local install.
- Migration-backed MySQL schema.
- Stable plugin contract.
- Provider registry validation.
- Fixture and parser test harness.
- Artifact retention policy.
- Redaction service.
- Structured error taxonomy.
- Provider verification workflow.
- Contribution guide and issue templates.

Can wait:

- Paid marketplace.
- Multi-tenant SaaS.
- Accounting integrations.
- Plugin signing.
- Advanced isolation.
- Hosted registry.

## 26. Marketplace And Registry Model

The MVP should avoid payments, but it should model provider publishing from day one.

### Registry v0

Registry v0 is a static JSON index in the repo.

It should answer:

- Which providers exist?
- Which country and utility type do they support?
- Which plugin package implements them?
- What is the verification level?
- Is Bright Data required, optional, or unsupported?
- What are the known limitations?
- Who maintains the provider?
- Is it active, broken, deprecated, or draft?

### Marketplace Later

A future marketplace can add:

- provider search
- install buttons
- maintainer profiles
- support tiers
- private provider listings
- premium maintenance
- compatibility badges
- security review badges
- usage analytics

MVP should not implement marketplace payments. It should only make the registry shape compatible with a future marketplace.

### Provider Quality Gates

No provider should be considered usable unless it has:

- valid manifest
- declared domains
- declared permissions
- declared secret handles
- fixture tests
- parser tests
- known limitations
- error taxonomy mapping
- synthetic or sanitized artifacts
- Bright Data policy
- maintainer metadata

## 27. Testing Strategy

Testing must prove the platform boundaries, not just happy-path scraping.

### Unit Tests

- manifest schema validation
- registry schema validation
- normalized bill schema validation
- error taxonomy mapping
- redaction helpers
- budget policy helpers

### Plugin Fixture Tests

- parse synthetic PDF or text fixture
- normalize expected bill fields
- reject incomplete bill data
- produce confidence metadata
- avoid live credentials

### Integration Tests

- start MySQL
- install mock provider
- create account
- run job
- create artifacts
- create normalized bill
- approve review
- export JSON

### Adapter Tests

- local Playwright adapter can run controlled target
- Bright Data adapter refuses to run when disabled
- Bright Data adapter refuses missing budget
- Bright Data adapter records selection reason
- adapter errors map to shared error taxonomy

### Security Tests

- logs redact secrets
- artifacts directory is isolated
- undeclared provider domains fail validation
- undeclared secret access fails validation
- fixture scan blocks obvious private data patterns

## 28. Documentation Inventory

The repo should grow documentation only when it supports execution.

Required docs before MVP demo:

- `README.md`: clone-to-demo path and project overview.
- `PLAN.md`: product and implementation plan.
- `docs/platform-architecture.md`: core, plugin lifecycle, registry, hooks/events, permissions, and adapter architecture.
- `docs/installation-and-onboarding.md`: install states, first-use wizard, first admin creation, roles, setup recovery, and provider onboarding.
- `docs/perspective-review.md`: product, install, operator, security, plugin developer, registry, Bright Data, AI, open-source, hackathon, and maintenance gates.
- `docs/public-private-boundary.md`: what can and cannot be public.
- `docs/provider-submission-checklist.md`: provider quality gate.
- `docs/plugin-contract.md`: manifest and lifecycle reference.
- `docs/bright-data-policy.md`: adapter, opt-in, budget, and cost rules.
- `docs/ai-assisted-improvement.md`: diagnosis, maintenance, parser assistance, registry quality, and AI governance.
- `docs/demo-script.md`: exact hackathon demo steps.

Recommended after MVP:

- `docs/architecture.md`
- `docs/security.md`
- `docs/registry.md`
- `docs/operations.md`
- `docs/accounting-export.md`

## 29. Immediate Next Steps

### P0 - Make The Repo Runnable

1. Add Node/TypeScript workspace skeleton.
2. Add package manager config and scripts.
3. Add Docker Compose with MySQL.
4. Add config loader and validation.
5. Implement setup state detection, migrations, and first-admin bootstrap.
6. Implement `utility-watch doctor`.
7. Add CI for typecheck, tests, JSON validation, and `git diff --check` equivalent.

### P1 - Prove The Plugin Boundary

1. Define schemas first: `plugin.json`, registry provider card, normalized bill, run record.
2. Implement manifest and registry validation.
3. Add provider install/list/validate commands.
4. Add mock provider and fixture test harness.
5. Add provider template documentation.

### P2 - Prove The Bill Lifecycle

1. Implement run records and state transitions.
2. Implement artifact storage and redacted logging.
3. Implement normalized bill creation.
4. Implement review state.
5. Implement deterministic JSON export.
6. Add generated HTML run report or minimal dashboard.

### P3 - Prove Web Retrieval And Escalation

1. Add local Playwright adapter.
2. Add controlled demo portal or safe public target.
3. Add Bright Data adapter behind explicit env flag and account/provider opt-in.
4. Add blocked-provider demo with strict budget and synthetic/safe target.
5. Show adapter metadata in run output and demo report.

### P4 - Package The Demo

1. Keep the main demo under 5 minutes.
2. Add terminal-friendly demo script.
3. Add screenshots or a generated report for judges.
4. Add failure-path example that shows action hints.
5. Confirm the repo remains free of private terms, secrets, real bills, and private artifacts.

## 30. Perspective Review

This section is the second-pass critique. It exists to keep the project balanced across product, installation, operations, engineering, security, demo quality, and open-source credibility.

The full review matrix lives in `docs/perspective-review.md`. Implementation should use that document as a gate before starting broad provider coverage.

### Product Perspective

The core product is not bill scraping. The core product is provider lifecycle management:

- discover provider
- install provider
- configure account
- run retrieval
- collect evidence
- normalize bill
- review uncertainty
- export approved data
- update or deprecate provider

The page, README, demo, and code should all reinforce that lifecycle. If the implementation only shows one scraper, the concept will look too small.

### Installation Perspective

The install path is part of the product, not a setup chore.

Installation priorities:

- clean clone to running system
- Docker/MySQL local path
- setup state detection
- first administrator bootstrap
- idempotent setup
- setup endpoint lock after bootstrap
- demo mode separated from private managed mode

If setup feels unclear, the product will look unfinished even if the scraper demo works.

### Architecture Perspective

The architecture should optimize for boring core services and volatile provider plugins.

Architecture priorities:

- Keep provider-specific selectors, portal flows, and parsing in plugins.
- Keep database, artifacts, logs, review, export, and adapter policy in core.
- Keep Bright Data behind an adapter boundary.
- Keep registry metadata separate from installed plugin code.
- Keep tests fixture-first so providers can be validated without live accounts.

### Security Perspective

The public repo should assume contributors may be careless and plugins may be untrusted.

Security priorities:

- Redaction must be automatic where possible.
- Plugin permissions must be declared before runtime.
- Provider domains must be declared before runtime.
- Bright Data use must require both provider support and account opt-in.
- Artifacts must be treated as sensitive by default.
- Public fixtures must be synthetic or aggressively sanitized.

### Developer Experience Perspective

The first external contributor should not need private context.

DX priorities:

- One command to validate a plugin.
- One command to run a fixture test.
- Clear manifest errors.
- A documented provider template.
- A small mock portal or mock provider that explains the full lifecycle.
- README path from clone to demo.

### Operations Perspective

Operators need incident clarity, not just automation.

Operations priorities:

- Every failure should map to an error code and action hint.
- Every run should preserve artifacts even when it fails.
- Registry status should expose broken/deprecated providers.
- Retries should be controlled by error type.
- Adapter choice should be visible and explainable.
- Cost and retention should be configurable.

### Business Perspective

The open-source core creates trust and distribution. Managed operations can still be commercial later.

Business priorities:

- Keep the core useful without private infrastructure.
- Leave room for managed hosting, private registries, support, and premium provider maintenance later.
- Do not put paid marketplace mechanics in the MVP.
- Make the repo credible enough for customers to inspect and contributors to extend.

### Registry Perspective

The registry is the trust layer for provider scale.

Registry priorities:

- verification levels
- known limitations
- install source
- maintainer contact
- Bright Data requirement
- fixture verification date
- broken/deprecated states

A provider should be understandable before a user installs it.

### AI Perspective

AI should improve maintenance and operator clarity without becoming the authority.

AI priorities:

- redacted run diagnosis
- parser assistance from fixtures
- provider health explanation
- issue drafts for maintainers
- no credential handling
- no autonomous approval/export
- no autonomous Bright Data spend

### Hackathon Perspective

The demo should be built for judges who have limited time.

Hackathon priorities:

- Show the problem in one sentence.
- Show plugin installation quickly.
- Show one successful run.
- Show evidence and normalized output.
- Show Bright Data escalation as a controlled capability.
- Show why this becomes more valuable as provider count grows.

## 31. Recommended Build Sequence

Build one vertical slice before broadening the system.

### Slice A - Trustworthy Demo Core

1. TypeScript package.
2. CLI skeleton.
3. MySQL schema.
4. `doctor`.
5. Mock provider.
6. Run record.
7. Artifact record.
8. Normalized bill.
9. Review state.
10. JSON export.

Done means the full lifecycle works without live web access.

### Slice B - Provider Platform

1. Manifest schema.
2. Registry schema.
3. Provider install/list/validate.
4. Fixture tests.
5. Parser tests.
6. Provider template.
7. Submission checklist enforcement.

Done means a contributor can add a provider safely.

### Slice C - Web Retrieval

1. Local Playwright adapter.
2. Controlled demo portal or safe public target.
3. Screenshot/HTML/PDF artifacts.
4. Error taxonomy integration.
5. Portal-changed failure path.

Done means the platform can retrieve web data and preserve evidence.

### Slice D - Bright Data Escalation

1. Adapter interface hardening.
2. Bright Data adapter behind env flag.
3. Provider-level opt-in.
4. Account-level opt-in.
5. Per-run budget.
6. Blocked-provider demo.

Done means Bright Data is valuable but not a hidden dependency.

## 32. Recommendation

Build the platform path before adding provider volume.

The first usable release should make one thing undeniable: provider-specific retrieval logic can live in plugins while the core reliably handles jobs, evidence, normalization, review, export, governance, and execution policy. Once that foundation works, adding providers becomes a repeatable process instead of a pile of fragile scripts.
