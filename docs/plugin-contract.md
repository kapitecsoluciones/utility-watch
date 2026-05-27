# Plugin Contract v0

This document defines the first public contract for Utility Watch provider plugins.

The goal is not to support every provider shape on day one. The goal is to make provider behavior explicit, testable, reviewable, and safe enough to install.

## 1. Contract Principles

- The core owns users, credentials, jobs, runs, artifacts, review, exports, logging, policy, and adapter selection.
- Plugins own provider-specific portal knowledge.
- Plugins declare capabilities before execution.
- Plugins receive scoped context from the core.
- Plugins return structured results.
- Plugins do not write directly to the database.
- Plugins do not read raw secrets outside the provided secret interface.
- Plugins do not call Bright Data directly.
- Plugins do not export accounting data directly.

## 2. Package Layout

Recommended package shape:

~~~txt
provider-example/
  plugin.json
  README.md
  CHANGELOG.md
  LICENSE
  src/
    index.ts
    parser.ts
    flow.ts
  fixtures/
    sample-bill.txt
    expected-bill.json
  tests/
    manifest.test.ts
    parser.test.ts
  docs/
    limitations.md
    troubleshooting.md
~~~

The MVP may load plugins from local folders. The contract should still assume future package installation.

## 3. Manifest Required Fields

plugin.json is the first trust boundary. The core validates it before loading code.

Required fields:

- id: stable lowercase provider plugin ID.
- name: human-readable provider name.
- version: semantic plugin version.
- license: plugin license.
- schemaVersion: manifest schema version.
- coreVersion: compatible core version range.
- country: ISO country code.
- serviceTypes: utility categories.
- entrypoint: compiled module entrypoint.
- homepage: provider or plugin homepage.
- capabilities: declared operations.
- auth: required authentication shape.
- permissions: requested runtime permissions.
- quality: verification and maintenance metadata.
- support: maintainer and issue metadata.

## 4. Capabilities

Initial capability names:

- auth.login
- auth.logout
- accounts.list
- bills.list
- bills.download
- bills.normalize
- artifacts.capture
- healthcheck.run

The core should reject a plugin that performs an undeclared capability.

## 5. Lifecycle Methods

The first TypeScript interface can be small:

~~~ts
export interface UtilityWatchProvider {
  manifest: ProviderManifest;
  healthcheck?(ctx: ProviderContext): Promise<HealthcheckResult>;
  login?(ctx: ProviderContext): Promise<LoginResult>;
  listAccounts?(ctx: ProviderContext): Promise<AccountCandidate[]>;
  listBills?(ctx: ProviderContext, account: ProviderAccount): Promise<BillCandidate[]>;
  downloadBill?(ctx: ProviderContext, bill: BillCandidate): Promise<BillArtifactResult>;
  normalizeBill?(ctx: ProviderContext, artifact: BillArtifactResult): Promise<NormalizedBillResult>;
}
~~~

The MVP can implement only the methods required by the mock provider, but the contract should name the lifecycle.

## 6. Provider Context

Plugins receive a scoped context from core.

Context may expose:

- logger with automatic redaction.
- secret reference resolver.
- artifact writer.
- adapter session.
- run metadata.
- account metadata.
- policy view.
- timeout and cancellation signal.

Context must not expose raw database connections, unrestricted filesystem access, unrestricted network access, raw Bright Data credentials, other plugins, or unredacted logs from other accounts.

## 7. Result Shapes

Plugins should return typed result objects.

Every result should include:

- ok: boolean.
- warnings: array.
- confidence: optional number from 0 to 1.
- evidence: artifact references when relevant.
- error: structured error object when failed.

Errors should map into the shared taxonomy:

- auth.invalid_credentials
- auth.mfa_required
- portal.layout_changed
- portal.blocked
- portal.timeout
- provider.unsupported_account
- bill.not_found
- bill.parse_failed
- policy.denied
- adapter.failed

## 8. Artifact Rules

Plugins capture evidence through the core artifact API.

Allowed artifact types:

- PDF.
- HTML snapshot.
- Screenshot.
- parsed text.
- normalized JSON.
- redacted debug report.

Artifact rules:

- Artifacts are linked to a run.
- Artifacts are redacted where policy requires it.
- Artifacts are never committed to the public repo unless synthetic.
- Plugins do not choose retention policy.

## 9. Testing Requirements

Minimum tests for a provider submission:

- manifest validates.
- parser fixture produces expected normalized bill.
- missing required fields fail predictably.
- unsupported bill format returns a structured error.
- no live credentials are required for parser tests.

## 10. Acceptance Standard

A plugin is acceptable for registry listing when:

- manifest is valid.
- permissions are minimal.
- limitations are honest.
- fixture tests exist.
- parser output matches normalized bill schema.
- no private data or secrets are present.
- maintainer and support path are clear.

Verification level can still be draft or fixture-only. Listing is not the same as production endorsement.
