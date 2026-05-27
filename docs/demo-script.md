# Demo Script

This script defines the first credible Utility Watch demo.

The demo should prove the platform lifecycle, not broad provider coverage.

## 1. Demo Promise

In under five minutes, show that Utility Watch can:

1. Start from a clean local environment.
2. Validate the platform.
3. Discover a provider from the registry.
4. Validate and enable a plugin.
5. Configure a synthetic account.
6. Run bill retrieval.
7. Capture artifacts.
8. Normalize a bill.
9. Route it through review.
10. Export approved JSON.
11. Show Bright Data escalation as an explicit policy-backed adapter path.

## 2. Demo Data Rules

The demo must use synthetic account data, synthetic bill data, synthetic or public-safe artifacts, no customer credentials, no real bill PDFs, and no private portal screenshots.

## 3. Planned CLI Flow

Target flow:

~~~bash
docker compose up -d
utility-watch doctor
utility-watch providers:list
utility-watch plugins:validate plugins/example-provider
utility-watch plugins:enable example-provider
utility-watch accounts:create --provider example-provider --fixture demo-account
utility-watch runs:start --account demo-account
utility-watch runs:show <run-id>
utility-watch bills:review <bill-id> --approve
utility-watch export:json <bill-id>
~~~

Bright Data escalation demo:

~~~bash
utility-watch runs:start --account blocked-demo --adapter brightdata-browser --max-cost-usd 1.00
utility-watch runs:show <run-id>
~~~

The Bright Data command should fail closed when Bright Data is not configured.

## 4. Narration

Suggested narration:

> Utility providers are fragmented. Instead of writing one-off scrapers, Utility Watch treats each provider as a lifecycle-managed plugin. The core owns credentials, policy, jobs, evidence, review, and export. Plugins only own provider-specific behavior. When a portal is blocked, the core can escalate through Bright Data with explicit budget and audit metadata.

## 5. Must Show

- Registry metadata before installation.
- Plugin manifest validation.
- Run state transition.
- Artifact references.
- Normalized bill JSON.
- Review action.
- Export output.
- Adapter selection reason.
- Bright Data disabled-by-default behavior.

## 6. Must Avoid

- Live customer accounts.
- Fragile provider portal dependency.
- Unbounded browser retries.
- Claims of broad coverage before providers exist.
- AI approving or exporting bills automatically.

## 7. Demo Success Criteria

- A judge can understand the platform without private context.
- The demo can be repeated from a clean clone.
- The plugin model is visible.
- The public/private boundary is visible.
- Bright Data appears as a disciplined adapter, not a gimmick.
- The result is useful after the hackathon.
