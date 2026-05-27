# AI-Assisted Improvement Model

Utility Watch should not be positioned as an AI system that magically retrieves every bill. The core value is a reliable plugin platform for utility bill retrieval.

AI can still be valuable if it is used as an improvement layer around the platform: diagnosing failures, helping maintain plugins, improving parsers, ranking confidence, and assisting operators. AI should recommend, explain, classify, and draft changes. The platform should keep deterministic controls for execution, security, review, and export.

## 1. AI Principles

- AI is optional.
- AI is never the credential owner.
- AI does not bypass provider policies or platform security.
- AI does not approve exports by itself.
- AI suggestions are traceable.
- AI output is reviewed before code, parser, or registry changes are accepted.
- AI sees redacted artifacts by default.
- AI actions must be bounded by permissions and budgets.

The system should be useful without AI. AI should make it easier to maintain and operate.

## 2. Best Initial AI Use Cases

### Failure Diagnosis

When a run fails, AI can summarize likely causes from run state transitions, error category, screenshots, redacted HTML snippets, plugin version, adapter used, and previous failure history.

Output should be a diagnosis note with likely cause, evidence, confidence, recommended next action, and whether the issue is plugin logic, credentials, provider portal change, adapter block, or user action.

### Parser Assistance

AI can help draft parser improvements from synthetic or redacted samples.

Allowed:

- Suggest field mappings.
- Detect date, amount, and currency patterns.
- Compare expected JSON against parser output.
- Generate test cases.

Not allowed:

- Commit parser changes without tests.
- Train on private bills without explicit policy.
- Leak raw bills into public issues.

### Plugin Maintenance Assistant

AI can watch provider health and propose maintenance tasks when a plugin starts failing, a portal layout changes, login text changes, artifact shape changes, parser confidence drops, or a provider has not been verified recently.

Output should be an issue draft or maintenance report, not an automatic production patch.

### Registry Quality Scoring

AI can help classify registry quality using objective signals: last verified date, fixture coverage, recent success rate, failure categories, maintainer responsiveness, declared limitations, Bright Data dependency, and review burden.

The registry score should combine deterministic metrics with optional AI explanation.

### Operator Copilot

An operator-facing assistant can answer questions about the current system state:

- Why did this run fail?
- Which bills need review?
- Which provider is most unstable this week?
- What changed before failures started?
- Is this bill safe to export?

The assistant should cite run records, artifacts, and policy decisions. It should not invent provider behavior.

## 3. AI Use Cases To Avoid In MVP

- Fully autonomous live portal repair.
- AI-generated plugins accepted without human review.
- AI approving bills without reviewer action.
- AI handling raw credentials.
- AI deciding to spend Bright Data budget without policy.
- AI making direct accounting exports.
- AI browsing arbitrary domains outside plugin permissions.

These make the demo look flashy but weaken the trust model.

## 4. AI Feedback Loop

The useful loop is:

1. Run job.
2. Capture structured state, logs, artifacts, and output.
3. Redact sensitive data.
4. Classify failure or confidence.
5. Ask AI for explanation and suggested fix.
6. Create review item, issue, or test fixture.
7. Human accepts, edits, or rejects.
8. Validated changes improve plugin, parser, registry, or policy.

This turns operations into maintenance intelligence without surrendering control.

## 5. Suggested MVP AI Feature

The best MVP AI feature is Run Diagnosis Notes.

Why:

- It uses platform evidence already produced by the core.
- It helps judges understand the value quickly.
- It does not require unsafe autonomy.
- It supports real operations after the hackathon.
- It can work with mock or synthetic runs.

Example output:

~~~json
{
  "runId": "run_demo_001",
  "diagnosis": "The provider login page loaded, but the expected account selector was not found after authentication.",
  "likelyCause": "portal-layout-change",
  "confidence": 0.82,
  "evidence": [
    "state reached authenticated",
    "screenshot captured after login",
    "selector account-list not found",
    "same plugin version succeeded in previous fixture"
  ],
  "recommendedAction": "Review the post-login account discovery selector and add a fixture for the new layout.",
  "safeToRetry": false
}
~~~

The AI note should be stored as operational metadata attached to the run. It should not replace the original logs or artifacts.

## 6. Future AI Feature Set

After the platform works:

- AI-generated parser test suggestions.
- Plugin update drafts from failed run artifacts.
- Provider change detection summaries.
- Registry health narratives.
- Operator question answering over runs and policies.
- Export anomaly explanations.
- Duplicate bill detection support.
- Confidence calibration using historical review outcomes.

Each feature should have a human review path and a deterministic acceptance gate.

## 7. Architecture Placement

AI should live behind a service boundary:

~~~txt
Core Runtime
  -> run records
  -> artifacts
  -> redaction layer
  -> AI analysis service
  -> diagnosis / suggestion records
  -> human review or issue workflow
~~~

The plugin does not call AI directly. The core decides when AI analysis is allowed and what data is safe to send.

## 8. Policy Controls

AI analysis should be controlled by per-deployment enablement, per-account opt-in, redaction mode, artifact allowlists, cost budgets, retention policy, provider restrictions, and user capabilities.

Default policy should be off for private data until a deployment owner enables it.

## 9. How To Present It

Position AI as an operational intelligence layer:

> Utility Watch uses AI to make provider plugins easier to maintain: it explains failures, proposes parser tests, summarizes portal changes, and helps operators decide what needs review. Retrieval remains governed by the core platform, plugin permissions, audit logs, and human approval.

This keeps the concept credible. The platform remains infrastructure, while AI improves maintenance velocity and operational clarity.
