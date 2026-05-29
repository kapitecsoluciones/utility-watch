# Design — Utility Watch dashboard refinement

Date: 2026-05-29
Status: approved-pending-review
Scope: the operator console (`/console`) and supporting core/API. Landing page is a separate follow-up.

## Goal

Make the console a real management surface: let operators add utility providers as plugins (the top gap), with security, functionality, and usability tuned. Stay code-free and RCE-free; honor the public/private boundary (no customer data or executable plugin code uploaded at runtime).

## Decisions (from brainstorming)

1. **Plugin model: catalog + register declarative.** Two provider kinds:
   - `code` — existing plugins (mock, sce-us, socalgas-us) with an `entrypoint`; fetch live + normalize via code. Installed from the in-repo catalog (registry).
   - `declarative` — registered from the UI: a manifest + a declarative parser spec (no code). Normalizes artifacts via a core engine. No code execution → no RCE.
2. **Declarative ingest: manual upload + simple URL fetch.** A declarative provider gets its artifact either from an operator upload (paste/upload text or JSON) or a server-side GET of a public URL (SSRF-guarded; optionally via Bright Data). No login automation (that needs a code plugin).
3. **MCP auth on.** `MCP_AUTH_TOKEN` enabled; the token is shown only to a logged-in operator in Overview to copy into their agent.
4. **This pass also includes:** Audit Logs, auth hardening (CSRF, login rate-limit/lockout, password policy), accounts management (edit/delete, secret handles, Bright Data opt-in), and usability (bill detail, toasts, loading + empty states).

## Architecture

### Core refactor: separate "obtain artifact" from "normalize"

Today a code provider's lifecycle does fetch + normalize together. Split conceptually so both kinds share one persistence pipeline:

```
obtain artifact            normalize                 persist (unchanged)
  code:  provider.downloadBill(ctx)   provider.normalizeBill(ctx, artifact)   run + artifact + bill + review
  decl:  manual upload | URL fetch    declarativeParser(parserSpec, artifact)  (adapter = "manual" | "fetch")
```

A run record is created for every path (adapter recorded: `local` / `brightdata-scraping-browser` / `manual` / `fetch`). The runner exposes:
- `executeRun(pool, opts)` — code provider live fetch (existing).
- `ingestArtifact(pool, { accountId, content?, contentType?, url? })` — obtain via upload or URL fetch, normalize via the declarative engine, persist.

### Declarative parser (`uw-parser-v1`)

Stored in the provider manifest (`parser` block). Pure, deterministic, no code:

```json
{
  "schemaVersion": "uw-parser-v1",
  "artifact": "text" | "json",
  "currency": "USD",
  "fields": {
    "amountDue":     { "from": "regex", "pattern": "Total Amount Due:\\s*\\$?([\\d,]+\\.\\d{2})", "group": 1, "cast": "money" },
    "dueDate":       { "from": "regex", "pattern": "Due Date:\\s*(\\d{2}/\\d{2}/\\d{4})", "group": 1, "cast": "date", "format": "MM/DD/YYYY" },
    "statementDate": { "from": "json", "path": "statementDate", "cast": "date" },
    "accountRef":    { "from": "regex", "pattern": "Account:\\s*(\\S+)", "group": 1 }
  },
  "lineItems": { "from": "regex-all", "pattern": "^([A-Za-z][\\w .-]+?)\\s+\\$([\\d,]+\\.\\d{2})$", "labelGroup": 1, "amountGroup": 2 }
}
```

- `from`: `regex` | `regex-all` | `json` (json-path, dot notation).
- `cast`: `money` (→ number), `date` (→ ISO; optional `format` like `MM/DD/YYYY`), else string.
- Confidence per field by method: `json` → 1.0, `regex` → 0.9, missing → 0. Overall confidence = min over required fields (amountDue, dueDate, statementDate) — same rule as today. A regex with bad input or invalid JSON yields confidence 0 → routes to review (never throws).

The engine lives in `packages/core/src/plugins/declarative.ts` and returns a `NormalizedBill` (the same shape as code providers).

### Manifest schema extension

`uw-plugin-v1` gains an optional `kind` (`code` default | `declarative`) and an optional `parser` block. `entrypoint` is required only for `kind: code`. The validator enforces: declarative ⇒ `parser` present and valid, `entrypoint` ignored; code ⇒ `entrypoint` present. Declarative provider manifests are stored per-deployment in `provider_versions.manifest_json` (NOT committed to the public repo).

### URL fetch + SSRF guard

`ingestArtifact` with `url`: only `https?:` schemes; resolve host and reject loopback, private ranges (10/8, 172.16/12, 192.168/16), link-local (169.254/16, incl. 169.254.169.254 metadata), and `*.internal`. If the provider declares `permissions.network`, the URL host must match. Prefer the Bright Data Scraping Browser when enabled + account opted-in; else a plain server-side fetch with a timeout + size cap. Records the adapter + reason.

## Data model changes

- `providers`: add `kind VARCHAR(16) NOT NULL DEFAULT 'code'`.
- `accounts`: add `fetch_url VARCHAR(1024) NULL` (for declarative URL fetch).
- New migration `0003_*.sql`. (`provider_versions.manifest_json` already holds the manifest + parser.)
- New table `audit_log`: `id, actor_type ENUM('operator','agent','system'), actor VARCHAR, action VARCHAR, target VARCHAR, metadata_json JSON, created_at`.
- Login rate-limit/lockout is in-memory (per-process map), not persisted.

## API additions (operator session + capability)

- `POST /api/providers/register` — body: a declarative manifest (incl. `parser`). Validates (manifest + `uw-parser-v1`), upserts provider `kind: declarative`. Cap: `providers.install`.
- `POST /api/actions/ingest` — body: `{ accountId, content?, contentType?, url? }`. Cap: `jobs.run`. Obtains artifact (upload or guarded URL fetch), declarative-normalizes, persists run/artifact/bill/review.
- `GET /api/audit` — recent audit entries (filter by actor/action). Cap: `runs.inspect`.
- `GET /api/bills/:id` — full bill detail (normalized JSON, evidence, artifact ref, review history). Cap: read.
- `PATCH /api/accounts/:id`, `DELETE /api/accounts/:id` — edit (display name, secret_handle, brightdata_allowed, fetch_url) / soft-delete. Cap: `accounts.create`.
- Existing actions (run/review/export) + every mutating MCP tool call now write an `audit_log` row.

## Security hardening

- **CSRF**: double-submit. On any GET that serves the console, set a non-HttpOnly `uw_csrf` cookie (random). State-changing POSTs must send `x-csrf-token` matching the cookie; mismatch → 403. (SameSite=Strict already mitigates; this is defense-in-depth.) MCP and bearer-token paths are exempt (no cookie auth).
- **Login rate-limit + lockout**: per email+IP, max 5 failures / 15 min → 429 with cooldown; reset on success.
- **Password policy** on `createUser`: ≥ 12 chars, at least one uppercase and one digit.
- **MCP token**: `MCP_AUTH_TOKEN` set on the deploy; Overview shows it to logged-in operators (copy-to-agent). Generic 500s + body cap already in place.
- **Audit**: every operator action and mutating agent tool call recorded with actor identity.

## UI (console SPA)

- **Providers**: three groups — Installed, Catalog (registry, not installed, with Install), and **+ Add provider** (declarative: manifest + parser editor with validation). Empty states with visible CTAs.
- **Accounts**: edit/delete; secret-handle field (reference name, never a value); Bright Data opt-in toggle; for declarative providers, **Upload bill** (paste/upload) and **Fetch URL** actions.
- **Bills**: row → **detail** view (normalized JSON + per-field confidence + evidence + artifact + review history). Approve/Reject/Export unchanged.
- **Audit**: new section listing entries (actor, action, target, time) with filter.
- **Overview**: MCP endpoint **+ token** (operator-only).
- Global: **toasts** replace `alert()`; loading spinners; empty states everywhere.

## Phasing (for the implementation plan)

- **F1** Core: obtain/normalize split, declarative parser engine, manifest schema ext, `ingestArtifact` (upload + URL fetch + SSRF guard), migration `0003`, provider `kind`. Unit tests.
- **F2** Plugins UI + API: `/api/providers/register`, catalog/Install + Add-provider UI, Upload/Fetch on declarative accounts.
- **F3** Audit log: table, `audit.log()` recording across actions + MCP tools, `GET /api/audit`, Audit UI.
- **F4** Auth hardening: CSRF double-submit, login rate-limit/lockout, password policy, MCP token + Overview surface.
- **F5** Accounts + UX: account edit/delete + secret handles + BD toggle, bill detail, toasts, loading/empty states.

## Testing

- Declarative parser engine: text + JSON, money/date casts, missing-field → confidence 0, malformed input no-throw.
- SSRF guard: rejects loopback/private/link-local/metadata; allows declared-domain https.
- Manifest validator: declarative (parser required, entrypoint optional) vs code.
- Auth: CSRF mismatch → 403; rate-limit → 429 after N; password policy rejects weak.
- Audit: actions write rows with correct actor.
- End-to-end (manual/CLI vs MySQL): register declarative provider → upload bill → normalized bill → review → export; install from catalog; account edit/delete.

## Public/private boundary

- Declarative provider definitions + parser specs registered by operators live in the deployment DB, never the public repo.
- No executable code is uploaded or run from the UI.
- Secrets are handles (references); values stay in env/secret-manager. Fetch URLs are SSRF-guarded.
- Public repo fixtures stay synthetic.

## Out of scope (YAGNI for this pass)

- Remote/hosted marketplace, plugin signing, sandboxed code upload, scheduled jobs, multi-tenant isolation, OCR/LLM parsing.
