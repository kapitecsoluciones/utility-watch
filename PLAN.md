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

## 5. MVP Scope

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
- Bright Data browser/unlocker implementation behind explicit opt-in.
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
   - Later maps to accounting systems.

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

Each plugin must include `plugin.json`.

Required fields:

- `id`: stable provider ID, for example `sce-us`.
- `name`: human-readable provider name.
- `version`: semantic version.
- `country`: ISO country code.
- `utilityTypes`: electricity, gas, water, waste, internet, telecom, other.
- `entrypoint`: compiled plugin entrypoint.
- `domains`: allowed domains.
- `permissions`: browser, network, fileDownload, pdfRead, brightData, etc.
- `secrets`: required secret handles, not values.
- `execution`: supported adapters and default adapter.
- `artifacts`: artifact types the plugin may produce.
- `limitations`: known limitations, MFA notes, unsupported account types.
- `maintainer`: maintainer metadata.

Example:

```json
{
  "id": "example-electric-us",
  "name": "Example Electric",
  "version": "0.1.0",
  "country": "US",
  "utilityTypes": ["electricity"],
  "entrypoint": "dist/index.js",
  "domains": ["example.test"],
  "permissions": ["browser", "fileDownload", "pdfRead"],
  "secrets": [
    { "name": "username", "type": "string", "required": true },
    { "name": "password", "type": "password", "required": true }
  ],
  "execution": {
    "defaultAdapter": "local-playwright",
    "allowedAdapters": ["local-playwright", "brightdata-browser"],
    "brightData": {
      "allowed": false,
      "requiresExplicitAccountOptIn": true
    }
  },
  "artifacts": ["screenshot", "html", "pdf"],
  "limitations": ["Synthetic demo provider only"],
  "maintainer": {
    "name": "Utility Watch",
    "url": "https://github.com/kapitecsoluciones/utility-watch"
  }
}
```

### Required Lifecycle Methods

- `healthcheck(context)`
- `login(context, credentials)`
- `listAccounts(context)`
- `fetchBills(context, account)`
- `normalizeBill(context, rawBill)`
- `validateBill(context, normalizedBill)`

### Optional Lifecycle Methods

- `beforeRun(context)`
- `afterRun(context)`
- `onBlocked(context, error)`
- `onPortalChanged(context, evidence)`
- `exportBill(context, bill)`

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

### `brightdata-browser`

Adapter for blocked, geo-sensitive, or JavaScript-heavy portals.

Responsibilities:

- Use Bright Data only when plugin and account policy permit it.
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

## 10. Data Model v0

### Tables

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

## 11. Normalized Bill Schema v0

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

## 12. Run States

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

## 13. Error Taxonomy

- `AUTH_INVALID`: credentials rejected.
- `MFA_REQUIRED`: human MFA step required.
- `CAPTCHA_REQUIRED`: captcha encountered.
- `PORTAL_CHANGED`: expected UI or response changed.
- `NETWORK_BLOCKED`: network or IP access blocked.
- `RATE_LIMITED`: provider throttled execution.
- `PDF_PARSE_FAILED`: bill file was found but parsing failed.
- `NO_BILL_FOUND`: login worked but no bill was available.
- `LOW_CONFIDENCE`: normalized fields did not meet confidence threshold.
- `ARTIFACT_MISSING`: expected screenshot/PDF/HTML artifact missing.
- `POLICY_BLOCKED`: account or provider policy disallowed action.
- `UNKNOWN`: fallback for unclassified failures.

Each error must include:

- provider ID
- plugin version
- account ID
- run ID
- adapter
- retryable flag
- operator action hint

## 14. CLI v0

Required commands:

- `utility-watch doctor`
- `utility-watch providers:list`
- `utility-watch providers:install <provider-id>`
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

## 15. API v0

Minimal endpoints:

- `GET /health`
- `GET /providers`
- `GET /providers/:id`
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

API v0 is local/developer oriented. Public authentication and RBAC are not MVP goals.

## 16. Registry And Plugin Governance

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

## 17. Security And Privacy

### Secret Handling

- Public examples use placeholder secret handles only.
- Local development may use env variables.
- Runtime logs must never print raw secrets.
- Database stores secret references, not secret values, unless explicitly running local demo mode.
- Future production deployments should integrate with a secret manager.

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

## 18. Hackathon Demo Plan

### Demo Story

"A property operator needs recurring bills from many fragmented utility portals. Instead of writing one-off scripts, they install provider plugins into Utility Watch. The core runs the provider, stores evidence, normalizes the bill, routes uncertain data to review, and exports approved JSON. When a portal blocks normal browser execution, the same plugin can escalate to Bright Data under explicit budget and policy controls."

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

1. The web has valuable operational data locked behind fragmented provider portals.
2. One-off scrapers are hard to maintain and hard to trust.
3. Utility Watch turns portal automation into installable, reviewable, governed plugins.
4. Bright Data makes the architecture viable for blocked or high-friction portals.
5. The output is not just scraped data; it is evidence-backed bill data ready for review and export.

### Demo Scorecard

The demo should make these points visible without explanation-heavy slides:

- **Web data access:** a blocked-provider path uses Bright Data under explicit policy.
- **Agent/tooling value:** provider logic is packaged as a reusable plugin, not hardcoded into the core.
- **Fresh data:** a run creates a current retrieval record rather than relying only on static samples.
- **Trust:** normalized fields point back to artifacts and confidence metadata.
- **Maintainability:** provider failure becomes a registry/status/update problem, not a core rewrite.
- **Open-source potential:** outside developers can add providers using a documented contract.

## 19. Milestone Plan

### Milestone 0 - Repository Foundation

Status: mostly complete.

- [x] Create public GitHub repo.
- [x] Add Apache-2.0 license.
- [x] Add README.
- [x] Add PLAN.md.
- [x] Add plugin manifest example.
- [x] Add public/private boundary documentation.
- [ ] Add `CLAUDE.md` or equivalent project instructions for coding agents.
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
- [ ] Add structured logging.
- [ ] Add config loading from env.
- [ ] Add `utility-watch doctor`.

Exit criteria:

- Fresh clone can start MySQL.
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

## 20. Acceptance Criteria

### Technical Acceptance

- Fresh clone works from README instructions.
- Docker Compose starts required services.
- CLI doctor passes.
- Manifest validation catches invalid plugins.
- Mock provider run completes.
- Bill normalization test passes.
- JSON export is deterministic.
- Logs are structured and redact secrets.
- CI passes.

### Product Acceptance

- A collaborator can explain the platform without private context.
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

- A failed run tells the operator what happened and what to do next.
- A blocked provider can be marked broken without deleting it from the registry.
- A run can be retried without losing the original audit trail.
- Artifact retention is documented.
- Bright Data spend is visible per run and can be capped.

## 21. First Provider Candidates

Recommended sequence:

1. **Mock Provider**
   - deterministic
   - no external dependencies
   - best for docs and tests

2. **Synthetic Normal Provider**
   - browser flow against controlled local/static demo portal
   - proves plugin lifecycle without live risk

3. **Sanitized Real-Pattern Provider**
   - derived from general utility portal patterns
   - uses synthetic fixtures
   - proves parser and normalization realism

4. **Blocked-Provider Demo**
   - safe public or synthetic target that demonstrates adapter escalation
   - uses Bright Data with explicit budget controls

Long-term provider examples may include electricity, gas, water, waste, internet, and telecom utilities across countries, but MVP should avoid promising coverage before plugins exist.

## 22. Risks

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

## 23. Open Decisions

- Final project name: Utility Watch vs Utilitual.
- First non-mock provider for public demo.
- Whether v0 dashboard should be an HTML report or a small web app.
- Whether plugin packages live in monorepo for v0 or separate repos.
- How strict plugin sandboxing must be before external contributors.
- Whether registry should remain static JSON or move to package metadata.
- Whether managed deployments should support private registries in v1.
- Which Bright Data product should be the default adapter for hackathon demo: browser, unlocker, SERP, or MCP.
- Whether plugin publishing should use npm packages, registry manifests, git subdirectories, or a hybrid model.
- Whether the core should support private plugins in v0 or document them as a deployment pattern only.
- Whether browser automation should be allowed inside plugins directly or only through adapter-provided capabilities.
- Whether OCR/LLM parsing belongs in core as an optional parser adapter or remains provider-specific until v1.

## 24. Delivery Tracks

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

## 25. Marketplace And Registry Model

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

## 26. Testing Strategy

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

## 27. Documentation Inventory

The repo should grow documentation only when it supports execution.

Required docs before MVP demo:

- `README.md`: clone-to-demo path and project overview.
- `PLAN.md`: product and implementation plan.
- `docs/public-private-boundary.md`: what can and cannot be public.
- `docs/provider-submission-checklist.md`: provider quality gate.
- `docs/plugin-contract.md`: manifest and lifecycle reference.
- `docs/bright-data-policy.md`: adapter, opt-in, budget, and cost rules.
- `docs/demo-script.md`: exact hackathon demo steps.

Recommended after MVP:

- `docs/architecture.md`
- `docs/security.md`
- `docs/registry.md`
- `docs/operations.md`
- `docs/accounting-export.md`

## 28. Immediate Next Steps

1. Add project instructions file for coding agents.
2. Add Node/TypeScript workspace skeleton.
3. Add Docker Compose with MySQL.
4. Implement `utility-watch doctor`.
5. Define schemas first: `plugin.json`, registry provider card, normalized bill, run record.
6. Implement manifest and registry validation in CI.
7. Add mock provider and fixture test harness.
8. Implement run records, artifact storage, and redacted logging.
9. Implement normalized bill creation, review state, and deterministic JSON export.
10. Add generated HTML run report or minimal dashboard.
11. Add Bright Data adapter behind explicit env flag and account/provider opt-in.
12. Add blocked-provider demo with strict budget and synthetic/safe target.

## 29. Perspective Review

This section is the second-pass critique. It exists to keep the project balanced across product, engineering, security, demo quality, and open-source credibility.

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

### Hackathon Perspective

The demo should be built for judges who have limited time.

Hackathon priorities:

- Show the problem in one sentence.
- Show plugin installation quickly.
- Show one successful run.
- Show evidence and normalized output.
- Show Bright Data escalation as a controlled capability.
- Show why this becomes more valuable as provider count grows.

## 30. Recommended Build Sequence

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

## 31. Recommendation

Build the platform path before adding provider volume.

The first usable release should make one thing undeniable: provider-specific retrieval logic can live in plugins while the core reliably handles jobs, evidence, normalization, review, export, governance, and execution policy. Once that foundation works, adding providers becomes a repeatable process instead of a pile of fragile scripts.
