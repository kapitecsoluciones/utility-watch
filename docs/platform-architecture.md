# Utility Watch Platform Architecture

Utility Watch should be designed as an extension platform, not as a folder of scrapers.

The core idea is simple: the platform owns the stable operating system for bill retrieval, while provider plugins own the unstable, provider-specific knowledge required to interact with individual utility portals.

This document defines the architecture principles that should guide the MVP and prevent the project from becoming a pile of one-off automation scripts.

## 1. Architecture Thesis

Utility Watch has three durable layers:

1. Core runtime
   - Owns users, accounts, jobs, runs, storage, audit logs, plugin loading, event dispatch, review states, and exports.
   - Does not contain provider-specific portal logic.
2. Provider plugins
   - Own portal-specific behavior: authentication, account discovery, bill retrieval, parsing, evidence capture, and recovery hints.
   - Declare capabilities and permissions before they can run.
3. Provider registry
   - Owns discovery metadata: provider identity, country, service type, supported capabilities, maintenance status, version, quality score, limitations, and install source.
   - Helps operators decide whether a provider is safe to install and realistic to automate.

The MVP should prove the contract among these layers. It does not need broad provider coverage.

## 2. Core Responsibilities

The core is the trusted platform boundary. It should be boring, stable, and provider-agnostic.

Core responsibilities:

- Load provider metadata from registry entries.
- Validate plugin manifests before execution.
- Install and activate plugins.
- Store account configuration and secret references.
- Schedule and run retrieval jobs.
- Dispatch lifecycle events.
- Select the execution adapter for a run.
- Persist run records and state transitions.
- Store artifacts through a controlled artifact interface.
- Redact logs before persistence.
- Normalize plugin output into a common bill model.
- Route low-confidence results to review.
- Export approved results.
- Track provider health, failure modes, and maintenance status.

Core non-responsibilities:

- Knowing how to log in to a specific provider portal.
- Hardcoding provider URLs or selectors.
- Holding raw credentials in public config.
- Bypassing captchas or access controls.
- Embedding customer-specific accounting rules.
- Guaranteeing full automation for every provider.

## 3. Provider Plugin Responsibilities

A provider plugin is a controlled adapter for one provider portal or provider family.

Plugin responsibilities:

- Declare identity and compatibility.
- Declare required secrets.
- Declare required permissions.
- Declare domains it may access.
- Declare supported capabilities.
- Implement provider-specific lifecycle methods.
- Return structured results, not arbitrary side effects.
- Capture evidence through the core artifact API.
- Report clear failure reasons.
- Provide synthetic fixtures for parser tests.
- Document limitations and manual fallback paths.

Plugins should not:

- Read arbitrary local files.
- Write directly to the database.
- Store credentials.
- Export data to external systems.
- Call Bright Data directly unless routed through the core adapter.
- Modify other plugins.
- Modify core runtime behavior outside declared hooks.

## 4. Plugin Manifest

Every plugin should ship with a machine-readable manifest. The manifest is the public contract before code runs.

Recommended manifest fields:

~~~json
{
  "id": "sce-us",
  "name": "Southern California Edison",
  "version": "0.1.0",
  "coreVersion": ">=0.1.0 <1.0.0",
  "schemaVersion": "uw-plugin-v1",
  "country": "US",
  "serviceTypes": ["electricity"],
  "homepage": "https://www.sce.com/",
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
    "artifacts": ["pdf", "html", "screenshot"],
    "brightData": "optional"
  },
  "quality": {
    "status": "experimental",
    "fixtureCoverage": "parser-only",
    "lastVerified": null
  }
}
~~~

The core should reject plugins that omit required metadata or request undeclared permissions at runtime.

## 5. Plugin Lifecycle

The platform needs a complete plugin lifecycle from day one, even if the MVP implements only a CLI version.

### Discover

An operator searches or lists available providers from the registry.

Required output:

- Provider name.
- Country.
- Service type.
- Status.
- Capabilities.
- Required auth method.
- Whether Bright Data is required, optional, or unsupported.
- Known limitations.

### Install

The platform downloads or enables a plugin package.

MVP install can be local-path based. The architecture should still model install as a distinct step.

Install checks:

- Manifest is valid.
- Package checksum is present when remote install exists.
- Core version is compatible.
- Plugin ID does not collide.
- Declared permissions pass policy.

### Activate

Activation makes the plugin available for account configuration and jobs.

Activation should:

- Register provider capabilities.
- Register plugin event handlers.
- Run plugin migrations if allowed.
- Store activation metadata.
- Keep activation separate from account credentials.

### Configure

Configuration connects a provider plugin to a customer account or test account.

Configuration should:

- Store account metadata.
- Store secret references, not secret values.
- Validate required fields.
- Optionally run a safe connectivity test.
- Mark account readiness.

### Run

A run executes one job for one configured account.

The core owns run state. The plugin owns provider-specific behavior inside the allowed execution context.

### Review

Review is required when extraction confidence is low or when policy requires human approval.

Review should show:

- Normalized bill fields.
- Raw evidence references.
- Confidence scores.
- Warnings.
- Plugin version.
- Run logs.
- Failure or recovery hints.

### Update

Plugins change because portals change.

Update checks:

- Version compatibility.
- Migration availability.
- Changelog.
- Test status.
- Rollback path.
- Whether active accounts are affected.

### Deactivate

Deactivation disables future jobs without deleting historical records.

Deactivation should:

- Stop scheduled jobs for that provider.
- Keep runs, artifacts, and reviews.
- Preserve account configuration unless explicitly archived.

### Uninstall

Uninstall removes plugin code and optionally archived plugin metadata.

Uninstall must not silently delete:

- Historical runs.
- Audit logs.
- Approved bill exports.
- Artifacts needed for audit.
- Account configuration without an explicit archive/delete policy.

## 6. Hook And Event System

The platform needs an explicit event system so plugins and internal modules can extend behavior without modifying core.

There are two event types:

1. Actions
   - Fire-and-forget lifecycle notifications.
   - Used to perform additional work after something happens.
2. Filters
   - Transform or validate a value before it moves forward.
   - Used when the platform expects a returned value.

### Core Lifecycle Events

Recommended action events:

- platform.boot
- plugin.discovered
- plugin.installed
- plugin.activated
- plugin.deactivated
- plugin.updated
- account.configured
- run.created
- run.started
- run.adapter.selected
- run.completed
- run.failed
- bill.normalized
- bill.review_requested
- bill.approved
- bill.rejected
- export.completed

Recommended filter events:

- provider.manifest.validate
- account.config.validate
- run.options.resolve
- adapter.selection.resolve
- artifact.metadata.redact
- log.entry.redact
- bill.normalized.validate
- bill.confidence.calculate
- export.payload.transform

### Event Rules

- Events must be typed.
- Event handlers must be ordered deterministically.
- Event handlers must be bounded by timeout.
- Filter handlers must return typed values.
- Event failures must be visible in run logs.
- Plugins can subscribe only to allowed events.
- Security-sensitive filters should be core-only unless explicitly allowed.

## 7. Execution Adapters

The core should expose execution adapters behind a stable interface.

Recommended adapters:

- local-http: simple HTTP requests for static or API-like portals.
- local-browser: local browser automation for JavaScript-heavy portals.
- brightdata-browser: remote browser execution for blocked flows.
- brightdata-unlocker: HTTP retrieval through Web Unlocker where appropriate.
- fixture: deterministic test execution without external network calls.

Adapter selection should be policy-driven:

1. Prefer fixture for tests.
2. Prefer local HTTP when possible.
3. Use local browser when JavaScript is required.
4. Escalate to Bright Data only when the provider or account policy allows it.
5. Stop with a clear failure when automation becomes unsafe, too expensive, or blocked by policy.

## 8. Bright Data Boundary

Bright Data should be an optional platform capability, not a plugin dependency.

Rules:

- Plugins declare whether Bright Data is unsupported, optional, or required.
- Core selects the Bright Data adapter.
- Core owns budget limits.
- Core owns usage logging.
- Core owns redaction.
- Plugins receive an adapter abstraction, not raw Bright Data credentials.
- Runs should fail closed when Bright Data is not configured or budget is exceeded.

Recommended policy controls:

- Per-run max cost.
- Per-provider monthly budget.
- Per-account opt-in.
- Domain allowlist.
- Artifact retention limits.
- Debug artifact redaction.

## 9. Registry And Marketplace Model

The registry is the trust and discovery layer.

MVP registry can be JSON in the repo. Later it can become a hosted service.

Registry fields should include:

- Provider ID.
- Provider name.
- Country.
- Region.
- Service type.
- Homepage.
- Plugin package source.
- Latest version.
- Core compatibility.
- Auth method.
- Capabilities.
- Execution adapters supported.
- Bright Data requirement.
- Maintenance status.
- Last verified date.
- Known limitations.
- Required review level.
- Quality gate status.
- Support channel or maintainer.

Marketplace features to model but not build in MVP:

- Ratings.
- Usage counts.
- Paid plugins.
- Revenue share.
- Maintainer profiles.
- Private provider listings.
- Hosted update service.

MVP should focus on trust metadata and installability, not monetization.

## 10. Quality Gates

Plugins should pass checks before they become visible as recommended providers.

Minimum gates:

- Manifest schema validation.
- Unique plugin ID.
- License present.
- No obvious secrets in repo.
- Declared domains only.
- Declared permissions only.
- Synthetic fixtures included.
- Parser tests included.
- Readme included.
- Limitations documented.
- Failure taxonomy mapped.
- Artifact types declared.
- No private customer data in fixtures.

Recommended gates after MVP:

- Static analysis.
- Dependency audit.
- Network call instrumentation.
- Sandbox compatibility.
- Browser flow recording review.
- Maintainer verification.
- Signed releases.

## 11. Permission And Sandbox Model

Provider plugins handle sensitive workflows. Permissions should be explicit.

Permission categories:

- Network domains.
- Secret references.
- Artifact types.
- Browser access.
- Bright Data access.
- Filesystem access.
- Hook subscriptions.
- Export access.

Default posture:

- Deny undeclared network domains.
- Deny undeclared secret access.
- Deny arbitrary filesystem writes.
- Deny direct database writes.
- Deny export access from plugins.
- Deny raw Bright Data credentials.

The MVP may run plugins in-process for speed, but the architecture should preserve a path to stronger isolation.

Future isolation options:

- Worker processes.
- Containerized plugin runs.
- Restricted browser contexts.
- Signed plugin packages.
- Policy engine for runtime permissions.

## 12. Data Model Boundaries

Utility Watch has three data classes:

1. Public metadata
   - Provider names.
   - Plugin metadata.
   - Synthetic fixtures.
   - Docs.
2. Operational metadata
   - Run IDs.
   - Job states.
   - Plugin versions.
   - Adapter used.
   - Failure categories.
3. Private customer data
   - Credentials.
   - Account numbers.
   - Bills.
   - Addresses.
   - Screenshots.
   - PDFs.
   - Portal HTML.

Public repo content must stay in class 1.

Runtime systems may handle classes 2 and 3, but must redact logs and isolate artifacts.

## 13. Admin And Operator UX

The platform should eventually support both CLI and web admin flows.

MVP CLI flows:

- utility-watch doctor
- utility-watch providers:list
- utility-watch providers:show <provider>
- utility-watch plugins:validate <path>
- utility-watch accounts:create
- utility-watch runs:start
- utility-watch runs:show
- utility-watch bills:review
- utility-watch export:json

Future admin flows:

- Browse provider registry.
- Install provider.
- Configure account.
- Test credentials.
- Schedule retrieval.
- Inspect run timeline.
- Review normalized bill.
- Approve or reject bill.
- Export approved bill.
- Update provider plugin.
- See provider health and last successful run.

The core UX principle: an operator should not need to read plugin code to understand what happened.

## 14. Run State Machine

The run state machine should be controlled by core.

Recommended states:

- queued
- starting
- authenticating
- discovering_accounts
- retrieving
- capturing_artifacts
- normalizing
- validating
- needs_review
- approved
- exported
- failed
- cancelled

Plugins can report progress, but core decides state transitions.

## 15. Installation Model

The installation model should feel like installing a small operating system for bill retrieval, not like copying scripts to a server.

Installation should create four clean boundaries:

1. Application code
   - Core runtime.
   - CLI.
   - API service.
   - Admin UI when it exists.
   - Installed plugin packages.
2. Runtime configuration
   - Database connection.
   - Artifact storage path or bucket.
   - Adapter settings.
   - Retention policy.
   - Security policy.
3. Private secrets
   - Provider credentials.
   - Bright Data credentials.
   - Export credentials.
   - Encryption keys.
4. Operational data
   - Accounts.
   - Jobs.
   - Runs.
   - Artifacts.
   - Reviews.
   - Exports.

The MVP installation should be Docker Compose first:

- MySQL.
- Core API.
- CLI container or local CLI.
- Artifact volume.
- Optional Bright Data configuration through environment variables.

Required install-time checks:

- Database reachable.
- Migrations current.
- Artifact storage writable.
- Encryption key configured.
- No default admin password.
- No production mode without configured secret backend.
- Bright Data disabled unless explicitly configured.

## 16. User, Role, And Capability Model

Users and roles are platform-level concepts. Provider plugins should not own user authorization.

Recommended roles:

- Owner: full system administration, plugin installation, security policy, adapter budget policy, and user management.
- Administrator: provider configuration, account management, job scheduling, and plugin activation where policy allows it.
- Operator: run jobs, inspect failures, retry jobs, and collect evidence.
- Reviewer: approve or reject normalized bills, request reruns, and annotate evidence.
- Developer: validate plugins, run fixtures, inspect technical logs, and develop provider packages without default access to live secrets.
- Auditor: read-only access to approved bills, run history, artifacts, and export records.

Authorization should be capability-based internally, even if the UI shows friendly roles.

Example capabilities:

- users.manage
- plugins.install
- plugins.activate
- plugins.update
- plugins.deactivate
- providers.configure
- accounts.create
- accounts.view
- accounts.update
- secrets.reference
- secrets.rotate
- jobs.schedule
- runs.start
- runs.retry
- runs.cancel
- artifacts.view
- bills.review
- bills.approve
- exports.create
- audit.view
- policies.manage

Critical rule: plugin code must never decide whether a user is allowed to do something. The core checks authorization before plugin execution, artifact access, review approval, and export.

## 17. Configuration Hierarchy

Configuration should be explicit and layered so operators know where a behavior came from.

Recommended hierarchy, highest priority last:

1. Core defaults.
2. Environment config.
3. System policy.
4. Provider policy.
5. Account config.
6. Run overrides.

Examples:

- Bright Data is globally disabled by default.
- A provider can declare Bright Data as optional.
- A deployment owner can allow Bright Data for selected providers.
- An account can remain local-only even if the provider allows escalation.
- A single run can request escalation only if all higher policies allow it.

Configuration values should be inspectable. A run record should show the resolved effective config that mattered for that run, redacted where necessary.

## 18. Plugin Package Anatomy

A plugin should be a package with predictable files.

Recommended layout:

~~~txt
provider-sce-us/
  plugin.json
  README.md
  CHANGELOG.md
  LICENSE
  src/
    index.ts
    parser.ts
    flow.ts
  fixtures/
    sample-bill.html
    sample-bill.pdf.txt
    expected-bill.json
  tests/
    parser.test.ts
    manifest.test.ts
  docs/
    limitations.md
    troubleshooting.md
~~~

Required package expectations:

- plugin.json declares identity, compatibility, capabilities, permissions, auth, adapter support, and quality status.
- README explains what the plugin supports and does not support.
- Fixtures are synthetic or sanitized.
- Tests can run without live credentials.
- Limitations are explicit.
- Troubleshooting describes known portal failure modes.

The platform should treat plugin code as replaceable. Historical runs must store plugin ID and version so old results remain explainable after updates.

## 19. Plugin Lifecycle Data

Lifecycle events should produce records, not just logs.

Suggested records:

- plugin_discoveries
- plugin_installs
- plugin_activations
- plugin_updates
- plugin_deactivations
- plugin_uninstalls
- plugin_policy_decisions
- plugin_health_checks

Each record should include plugin ID, version, actor, timestamp, decision, policy result, warnings, checksum when available, and compatibility result.

This matters because plugin platforms fail operationally when nobody knows what changed before a provider started failing.

## 20. Security Architecture

Security should be part of the platform model, not an afterthought.

Security boundaries:

- Public registry metadata is not trusted execution.
- Plugin manifest is data, not proof of safety.
- Plugin code is less trusted than core.
- Customer credentials are more sensitive than plugin config.
- Artifacts may contain regulated or confidential business information.
- Logs must be treated as possible data leaks.

Required security controls:

- Secret references instead of raw secrets in account config.
- Encryption at rest for secret-backed configuration.
- Strict log redaction.
- Domain allowlists per plugin.
- Adapter credentials never passed directly to plugin code.
- Artifact access controlled by core authorization.
- Retention policies for screenshots, HTML, PDFs, and debug traces.
- Dependency and secret scanning in CI.
- Explicit export permission.
- Audit trail for approval and export.

Threats to design against:

- Malicious plugin exfiltrates credentials.
- Careless plugin logs secrets or account numbers.
- Plugin accesses undeclared domains.
- Portal HTML artifact leaks private customer data into public issue reports.
- Operator installs an outdated plugin with known breakage.
- Bright Data usage runs uncontrolled cost.
- Normalized output is exported without review after low-confidence extraction.

The MVP can start with process-level isolation later, but the contracts should already express permissions, domains, artifacts, secrets, and adapter access.

## 21. Admin UI Concept

The first implementation can be CLI-first, but the architecture should anticipate an admin UI.

Primary admin areas:

- Dashboard: provider health, recent runs, bills needing review, failed providers, and adapter usage.
- Provider Registry: browse available providers, inspect capabilities, install or activate, see quality and limitations.
- Accounts: configure provider accounts, attach secret references, test connectivity, schedule retrieval.
- Runs: timeline, logs, artifacts, adapter selected, policy decisions, failure reason.
- Review Queue: normalized fields, evidence viewer, confidence, approve, reject, rerun.
- Settings: users, roles, security policy, retention, Bright Data budgets, export targets.

The key UX rule: a non-developer operator should be able to answer three questions quickly:

1. What happened?
2. Can I trust the extracted bill?
3. What do I do next?

## 22. Publishing And Governance

The registry should eventually behave like a trust layer for extensions.

Provider publishing states:

- draft
- submitted
- review_required
- experimental
- verified
- degraded
- deprecated
- removed

Submission checklist:

- Manifest valid.
- Package layout valid.
- License present.
- No secrets found.
- Fixtures included.
- Tests pass.
- Permissions are minimal.
- Domains are justified.
- Limitations documented.
- Maintainer identified.
- Adapter needs declared.
- Bright Data usage reason documented if applicable.

Governance should optimize for trust, not plugin count. A small number of honest, well-tested providers is better than a large registry of brittle packages.

## 23. Extension Points To Preserve

The platform should preserve extension points in predictable places.

Important extension points:

- Provider discovery.
- Authentication flow.
- Account discovery.
- Bill listing.
- Bill download.
- Artifact capture.
- Parser and normalization.
- Confidence scoring.
- Failure classification.
- Retry policy.
- Adapter selection.
- Export mapping.
- Review policy.
- Notifications.

Each extension point should have typed input, typed output, timeout, error type, logging rules, permission scope, and test fixture expectations.

## 24. Architecture Decisions Before Coding

Before implementing the core, decide:

- Whether plugins run in-process for MVP or in worker processes from day one.
- Whether the first admin experience is CLI-only or includes a minimal web report.
- Whether secrets are local encrypted records or references to an external vault in MVP.
- Whether plugin packages are local folders only or installable npm packages in MVP.
- Whether registry entries live only in repo JSON or are served by a small API.
- Whether the demo uses a real portal, a mock portal, or both.

Recommended MVP choices:

- In-process plugins with a permission contract documented now and worker isolation later.
- CLI plus static run report.
- Local encrypted secret references for development, external vault path documented.
- Local folder plugins plus registry JSON.
- Mock portal as the reliable demo, Bright Data flow as the escalation demo.

## 25. Artifact Strategy

Artifacts provide evidence and debugging context.

Artifact types:

- PDF.
- HTML snapshot.
- Screenshot.
- JSON response.
- Parsed text.
- Normalized bill JSON.
- Redacted run report.

Artifact rules:

- Artifacts are stored through core.
- Artifacts are linked to run IDs.
- Artifacts include redaction metadata.
- Public demos use synthetic artifacts.
- Private artifacts never enter the public repo.
- Retention policy should be explicit.

## 26. Update And Compatibility Strategy

Provider portals change often. Plugin update design is not optional.

Versioning rules:

- Core follows semantic versioning.
- Plugins declare compatible core ranges.
- Manifests declare schema version.
- Registry declares latest version and deprecation status.
- Updates should include changelog entries.

Compatibility checks:

- Core rejects incompatible plugins.
- Plugin updates should not erase historical run readability.
- Plugin version used for each run must be recorded.
- Normalized bill schema version must be recorded.

Rollback requirements:

- Keep previous plugin version metadata.
- Preserve run artifacts.
- Allow deactivation of broken plugin version.
- Allow pinning accounts to known working plugin version later.

## 27. MVP Architecture Decisions

Recommended MVP decisions:

- Node.js and TypeScript.
- MySQL as the primary database.
- File-based artifact storage.
- JSON registry in repo.
- Local plugin loading from repository path.
- In-process plugin execution with strict manifest validation.
- CLI-first operator experience.
- Synthetic fixtures for all public demos.
- Bright Data adapter behind env flag and explicit account/provider opt-in.
- No payments, ratings, or hosted marketplace in MVP.
- No private provider code copied into the public repo.

## 28. MVP Slice

The smallest credible MVP is:

1. Core package with typed models.
2. Manifest schema and validator.
3. Registry loader and validator.
4. Mock provider plugin.
5. Fixture adapter.
6. Run state machine.
7. Artifact writer.
8. Normalized bill validator.
9. Review/export JSON flow.
10. Bright Data adapter interface with a bounded demo path.

This proves the platform pattern without pretending to support many utilities on day one.

## 29. Design Risks

### Over-abstracting Too Early

Risk: designing for every provider before one complete flow works.

Mitigation: keep the first plugin contract small and evolve only after real runs expose repeated needs.

### Under-abstracting Into Scripts

Risk: implementing provider scripts directly and losing the platform.

Mitigation: force every provider through the manifest, registry, run state, artifact, and normalized bill interfaces.

### Unsafe Plugin Power

Risk: plugins become arbitrary code with access to secrets and storage.

Mitigation: manifest permissions, adapter boundaries, redaction, and future process isolation.

### Marketplace Without Trust

Risk: registry becomes a list of unverified scripts.

Mitigation: quality gates, maintenance status, known limitations, and clear support metadata.

### Bright Data Lock-In

Risk: platform becomes a Bright Data wrapper.

Mitigation: adapter interface and local-first execution policy.

## 30. Implementation Rule

Every MVP feature should answer one of these questions:

- Does it make provider plugins safer to install?
- Does it make runs easier to audit?
- Does it keep private data out of the public repo?
- Does it make provider behavior easier to update?
- Does it prove a complete install-to-export lifecycle?

If not, it probably belongs after MVP.
