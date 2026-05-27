# Bright Data Policy

Bright Data is an execution escalation layer for providers that cannot be retrieved reliably through local HTTP or local browser automation.

It is not the core product. Utility Watch must remain useful without Bright Data.

## 1. Default Position

- Disabled by default.
- Opt-in at deployment level.
- Opt-in at provider level.
- Opt-in at account level when private data is involved.
- Budget-limited per run.
- Logged on every use.
- Routed through core adapters only.

Plugins must not receive raw Bright Data credentials.

## 2. When To Use Bright Data

Use Bright Data when:

- The provider blocks normal HTTP requests.
- The provider requires realistic browser execution.
- The provider uses aggressive anti-bot controls.
- Local browser automation is unreliable from the deployment environment.
- A demo needs to show explicit blocked-portal escalation.

Do not use Bright Data when:

- The provider works through local HTTP.
- The provider works through local browser.
- A fixture or mock provider is enough.
- The portal requires manual human authorization.
- The run would exceed budget.
- Policy does not allow external execution.

## 3. Adapter Options

Initial adapter names:

- local-http
- local-browser
- brightdata-browser
- brightdata-unlocker
- fixture

Adapter selection order:

1. fixture for tests.
2. local HTTP when possible.
3. local browser when JavaScript is required.
4. Bright Data only when policy allows escalation.
5. fail closed when unsafe, too expensive, or not authorized.

## 4. Budget Controls

Required controls:

- Per-run maximum cost.
- Per-account monthly cap.
- Per-provider monthly cap.
- Retry cap.
- Timeout cap.
- Dry-run mode.
- Adapter usage record.

Every Bright Data-backed run should record adapter selected, selection reason, configured budget, estimated or actual usage, retry count, provider ID, account ID, and run ID.

## 5. Data Handling

Bright Data execution may touch private portal data. Treat it as sensitive.

Rules:

- Do not send raw credentials to AI prompts.
- Do not log raw credentials.
- Do not expose Bright Data credentials to plugins.
- Redact screenshots and HTML where possible.
- Store artifacts according to retention policy.
- Keep public demos synthetic.
- Do not commit Bright Data outputs from real accounts.

## 6. Manifest Declaration

Plugins declare Bright Data posture:

- unsupported: plugin should never use Bright Data.
- optional: plugin can run locally but may escalate.
- required: plugin is known to require Bright Data for live retrieval.

MVP default should be unsupported unless explicitly justified.

## 7. Demo Policy

The hackathon demo should show Bright Data as a controlled escalation:

1. Run mock provider locally.
2. Show provider policy allows escalation for a blocked demo.
3. Run blocked demo with Bright Data enabled.
4. Show run record with adapter choice and budget metadata.
5. Show artifact and normalized output.

The demo should not depend on a private customer portal.

## 8. Failure Modes

Bright Data failures should map to the shared error taxonomy:

- adapter.budget_exceeded
- adapter.not_configured
- adapter.policy_denied
- adapter.timeout
- adapter.remote_browser_failed
- portal.blocked
- portal.mfa_required

Operators should see whether the failure was provider-specific, policy-specific, budget-specific, or adapter-specific.

## 9. Anti-Lock-In Rule

Any provider implemented with Bright Data should still use the same plugin contract, run state machine, artifact system, and normalized bill schema.

The core should be able to add another execution provider later without rewriting provider plugins.
