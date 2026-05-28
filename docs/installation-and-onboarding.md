# Installation And Onboarding Model

This document defines the target first-use experience for Utility Watch.

The goal is that a developer, coding agent, or infrastructure operator can provision a container or server, clone the repository, run setup, create the first administrator, and operate the platform without private context.

## 1. Installation Assumptions

MVP assumptions:

- Linux container, VPS, or local development machine.
- Docker available for MySQL and local services.
- Node.js runtime for the CLI/API.
- MySQL as the durable database.
- Local filesystem artifact storage.
- Public provider registry loaded from this repository.
- Bright Data disabled by default.
- Synthetic/demo data enabled only when demo mode is selected.

Non-goals for the MVP:

- hosted multi-tenant SaaS setup
- Kubernetes installation
- enterprise SSO
- production secret-manager integration
- paid marketplace setup

## 2. First-Run States

The platform should always know its setup state.

| State | Meaning | Next Action |
|---|---|---|
| unconfigured | repo exists, no verified runtime | run setup check |
| environment-ready | runtime, database, and storage are reachable | run migrations |
| database-ready | migrations are applied | create installation profile |
| profile-ready | site settings exist | create first administrator |
| admin-ready | first administrator exists | lock setup endpoints |
| operational | registry, plugins, jobs, review, and export are available | run demo or configure provider |

Setup must be idempotent. Re-running setup should show the current state and next safe step.

## 3. CLI Setup Path

Target command flow:

```bash
git clone git@github.com:kapitecsoluciones/utility-watch.git
cd utility-watch
cp .env.example .env
docker compose up -d mysql
npm install
npm run build
utility-watch setup:check
utility-watch db:migrate
utility-watch setup
utility-watch doctor
```

The exact commands may change during implementation, but the product must preserve the same conceptual path: validate environment, apply migrations, create profile, create first admin, lock setup, and verify.

## 4. Web Setup Wizard

The first-use wizard should be available when the API/dashboard starts and no administrator exists.

Wizard screens:

1. Environment check
   - database status
   - migration status
   - artifact path status
   - registry status
   - effective app URL
   - Bright Data status

2. Installation profile
   - site name
   - install type
   - base URL
   - timezone
   - default currency
   - artifact retention policy

3. First administrator
   - name
   - email or username
   - password
   - confirmation that this account can manage users, plugins, policies, and settings

4. Security defaults
   - require review before export
   - disable Bright Data unless configured explicitly
   - redact logs by default
   - block unknown plugin sources
   - keep demo data separate from real accounts

5. Demo bootstrap
   - activate mock provider
   - create synthetic account
   - seed demo job
   - show next action

6. Completion
   - dashboard URL
   - CLI doctor command
   - demo run command
   - artifact path
   - docs links

## 5. First Administrator Rules

The first administrator is a security boundary.

Rules:

- can only be created when no administrator exists
- must be created through setup or local recovery command
- must use password hashing, never plaintext storage
- should receive Owner role by default
- setup endpoints must lock after creation
- admin creation must be audit logged

Recovery:

- `utility-watch admin:reset` should require local shell access
- recovery should not print passwords
- recovery should not be available through public unauthenticated API routes

## 6. Users, Roles, And Capabilities

Initial roles:

- Owner: full installation control and recovery authority
- Admin: users, settings, provider activation, policies
- Operator: jobs, runs, failures, reruns
- Reviewer: bill approval, rejection, notes
- Auditor: read-only runs, artifacts, exports
- Plugin developer: local provider validation and fixture testing

Capabilities should be checked directly in services:

- setup.complete
- users.manage
- settings.manage
- providers.install
- providers.activate
- providers.deactivate
- accounts.create
- jobs.run
- runs.inspect
- bills.review
- bills.export
- policies.manage
- ai.diagnose

Plugins do not own authorization. The core checks user capabilities before plugin execution, artifact access, review, export, settings changes, and adapter escalation.

## 7. Provider Onboarding Flow

After setup, provider onboarding should be explicit:

1. Discover provider in registry.
2. Review provider card: country, service type, status, permissions, Bright Data policy, limitations.
3. Install provider package.
4. Validate manifest and checksum when available.
5. Activate provider.
6. Configure account metadata.
7. Add secret references.
8. Run connectivity or fixture test.
9. Create job.
10. Run job.
11. Review normalized bill.
12. Export approved bill.

The mock provider should follow the same flow as real providers so the demo proves the platform contract.

## 8. Configuration Boundaries

Configuration must be split by ownership:

- environment config: database URL, artifact path, log level
- installation profile: site name, base URL, timezone, currency
- security policy: review/export defaults, session settings, plugin source policy
- provider policy: allowed adapters, declared domains, Bright Data status
- account config: provider account metadata and secret references
- secrets: values stored outside public repo and never logged

`config:show --redacted` should explain the effective configuration without exposing secret values.

## 9. Setup Acceptance Criteria

Setup is acceptable when:

- a clean clone can reach operational state from documented commands
- setup can be run twice without duplicating the first administrator
- setup status clearly explains what is missing
- no default password exists
- demo mode is visibly separate from private managed mode
- mock provider can be activated after setup
- `doctor` passes after setup
- failure messages tell the operator the next action

## 10. Implementation Rule

Do not start broad provider coverage until installation and onboarding work. The first public impression of Utility Watch should be: clone, setup, create admin, activate plugin, run job, review bill, export data.
