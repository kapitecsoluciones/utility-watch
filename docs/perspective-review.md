# Perspective Review

This document reviews Utility Watch from the perspectives that matter before implementation starts.

The goal is to prevent a narrow scraper implementation. Utility Watch should become an installable plugin platform with a safe core, a provider registry, a clear operator workflow, and an optional AI-assisted improvement layer.

## 1. Product Perspective

Core question: would a non-core operator understand what the product does after installation?

Risk:

- The project looks like a technical scraper repo instead of a product.
- The demo proves one provider but not the platform model.
- Setup, users, plugins, and review workflow feel bolted on later.

MVP requirements:

- first-use setup wizard
- first administrator creation
- provider discovery
- plugin install and activation
- account configuration
- run execution
- bill review
- JSON export
- clear system status

Acceptance:

- A new operator can explain the lifecycle in one sentence: install the platform, activate a provider plugin, configure an account, run retrieval, review evidence, export approved data.

## 2. Installation Perspective

Core question: can a developer or coding agent deploy it into a clean container or VPS?

Risk:

- The repo contains plans but no clone-to-running-system path.
- Setup depends on hidden local assumptions.
- The first admin path is undefined.

MVP requirements:

- documented Docker/MySQL path
- `.env.example` with safe defaults
- `setup:check` command
- `db:migrate` command
- `setup` command or setup wizard
- idempotent setup states
- first-admin bootstrap
- `doctor` after setup

Acceptance:

- A clean clone reaches operational demo mode without private credentials.
- Running setup twice cannot create a second bootstrap administrator.

## 3. Operator Perspective

Core question: does the operator know what happened and what to do next?

Risk:

- Automation fails silently.
- Artifacts exist but are not tied to decisions.
- Run errors are too technical for daily operations.

MVP requirements:

- run states
- error taxonomy
- action hints
- artifact list
- retry policy
- review queue
- audit log
- adapter selection reason

Acceptance:

- A failed run shows provider, plugin version, account, adapter, error category, evidence, retryability, and next operator action.

## 4. Security Perspective

Core question: can public contributors and third-party plugins exist without compromising private data?

Risk:

- Plugin code sees too much system state.
- Logs or fixtures leak credentials, account numbers, or bill data.
- Setup leaves default credentials or open endpoints.

MVP requirements:

- no default admin password
- password hashing
- setup endpoint lock after bootstrap
- declared plugin domains
- declared plugin permissions
- secret references instead of secret values
- log redaction
- artifact sensitivity by default
- forbidden private-data checks in CI

Acceptance:

- A malicious or careless plugin cannot access undeclared domains, undeclared secrets, unrestricted filesystem paths, or raw global config through supported APIs.

## 5. Plugin Developer Perspective

Core question: can an outside developer add a provider without reading core internals?

Risk:

- Provider development requires tribal knowledge.
- Manifest fields are vague.
- Tests need live credentials.

MVP requirements:

- provider template
- manifest schema
- fixture parser tests
- plugin validation command
- domain and permission validation
- normalized bill example
- limitations document
- submission checklist

Acceptance:

- A contributor can create a draft provider from template, validate the manifest, run fixture tests, and submit it without live provider credentials.

## 6. Registry And Marketplace Perspective

Core question: can many providers be discovered, trusted, updated, and deprecated?

Risk:

- The registry becomes a static list without trust signals.
- Users install broken or unsafe plugins.
- Marketplace ideas distract from quality gates.

MVP requirements:

- registry provider card
- verification status
- known limitations
- Bright Data requirement
- maintainer contact
- last fixture verification
- broken/deprecated status
- install source

Acceptance:

- Users can decide whether to install a provider without reading source code.

## 7. Bright Data Perspective

Core question: is Bright Data essential to the demo without becoming a hidden dependency?

Risk:

- Bright Data looks like a gimmick.
- Bright Data usage becomes unbounded or implicit.
- Local execution no longer works.

MVP requirements:

- local adapter baseline
- Bright Data adapter behind feature flag
- provider-level support declaration
- account-level opt-in
- per-run budget
- adapter reason
- disabled-by-default failure path

Acceptance:

- The demo shows a blocked-provider path where Bright Data is selected deliberately, budgeted, logged, and explained.

## 8. AI Perspective

Core question: can AI improve the system without becoming an unsafe autonomous actor?

Risk:

- AI is framed as magic retrieval.
- AI handles credentials, approval, or spending.
- AI-generated changes bypass review.

MVP requirements:

- AI disabled or optional by default
- redacted run context
- run diagnosis notes
- suggested next actions
- human approval path
- no autonomous export
- no autonomous Bright Data spending

Acceptance:

- AI can explain failures and suggest maintenance work, but deterministic policy, tests, and human review remain authoritative.

## 9. Open-Source Perspective

Core question: is the repository safe and credible for public inspection?

Risk:

- Private implementation details leak into public docs or fixtures.
- External contributors cannot tell what belongs in public.
- The repo looks like a private project dump.

MVP requirements:

- Apache-2.0 license
- public/private boundary doc
- sanitized fixtures only
- no customer names
- no real bills
- no private screenshots
- contribution checklist
- CI validation

Acceptance:

- The repo can be shared with judges, contributors, and potential customers without exposing private client data.

## 10. Hackathon Perspective

Core question: can judges understand the value in under five minutes?

Risk:

- The concept is too abstract.
- The demo spends too much time on setup.
- The platform value is hidden behind implementation detail.

MVP requirements:

- scripted demo
- mock provider success path
- blocked-provider Bright Data path
- visual or terminal run report
- normalized bill output
- evidence references
- review/export action

Acceptance:

- The demo proves that fragmented utility portals can become governed provider plugins with evidence-backed output.

## 11. Maintenance Perspective

Core question: what happens when providers break?

Risk:

- Provider failures become core bugs.
- No path exists for marking providers broken or updating plugins.
- Operators cannot distinguish credential errors from portal drift.

MVP requirements:

- provider health status
- error category history
- plugin version on each run
- artifact comparison path
- broken/deprecated registry states
- changelog expectation
- fixture update workflow

Acceptance:

- A provider change results in a visible provider maintenance task, not a silent system failure.

## 12. Implementation Priority

Build order should follow risk reduction:

1. installation and first admin
2. plugin contract and registry validation
3. mock provider lifecycle
4. run records and artifacts
5. bill normalization and review
6. JSON export
7. local browser adapter
8. Bright Data adapter
9. AI diagnosis notes
10. additional providers

Provider volume comes last. The product is the platform.
