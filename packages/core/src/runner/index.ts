import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Pool, ResultSetHeader } from "mysql2/promise";
import { loadProvider } from "../plugins/loader.ts";
import { loadManifestFile } from "../plugins/validate.ts";
import { selectAdapter } from "../adapters/select.ts";
import { openBrightDataBrowser, fetchViaBrightData } from "../adapters/brightdata.ts";
import { openLocalBrowser } from "../adapters/local-browser.ts";
import { getSecret as getStoredSecret, parseSecretsKey } from "../services/secrets.ts";
import { upsertObligationFromBill } from "../services/obligations.ts";
import { getAccount } from "../services/accounts.ts";
import { getRegistryProvider, getProviderManifest } from "../services/providers.ts";
import { parseDeclarative } from "../plugins/declarative.ts";
import { fetchArtifact } from "../adapters/fetch.ts";
import { repoRoot } from "../paths.ts";
import type { ProviderContext, NormalizedBill, ErrorCode, RawBillArtifact } from "../plugins/contract.ts";
import type { BrightDataConfig } from "../config/index.ts";

export interface RunOptions {
  accountId: number;
  artifactsDir: string;
  confidenceThreshold: number;
  brightData?: BrightDataConfig;
  /** Raw SECRETS_KEY for decrypting the provider's secretRefs from the store. */
  secretsKey?: string;
}

export interface RunOutcome {
  runId: number;
  status: string;
  billId?: number;
  /** All bills produced by this run (a single login can yield many accounts). */
  billIds?: number[];
  billCount?: number;
  confidence?: number;
  errorCode?: ErrorCode;
  errorMessage?: string;
}

/**
 * Execute one bill retrieval for an account: load the provider, run the
 * lifecycle, persist artifacts + a normalized bill + a pending review, and
 * record an audit trail. Errors map to the shared taxonomy and never throw out
 * of the function once a run row exists. The MCP `run_retrieval` tool calls this.
 */
/**
 * Resolve a code provider's plugin directory. Checks EXTRA_PLUGINS_DIR/<id>
 * first (private providers mounted outside the repo — the "plugins directory"
 * model), then the registry package path, then the bundled plugins/ dir.
 */
export function resolveProviderDir(providerId: string, registryPackage?: string): string {
  const extra = process.env.EXTRA_PLUGINS_DIR;
  if (extra) {
    const candidate = join(extra, providerId);
    if (existsSync(join(candidate, "plugin.json"))) return candidate;
  }
  if (registryPackage) return resolve(repoRoot, registryPackage);
  return join(repoRoot, "plugins", providerId);
}

/** Coerce a provider-supplied date to ISO (YYYY-MM-DD) or null. Accepts ISO,
 *  MM/DD/YYYY, and human forms like "June 12, 2026"; anything else → null so a
 *  loose date never fails the whole run on the DATE column. */
function toIsoDateOrNull(v: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1]!.padStart(2, "0")}-${mdy[2]!.padStart(2, "0")}`;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

/** Decrypt a provider's declared secretRefs from the store into a name→value map. */
async function loadSecretRefs(pool: Pool, secretsKey: string | undefined, refs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const key = parseSecretsKey(secretsKey);
  if (!key || !refs.length) return map;
  for (const name of refs) {
    const v = await getStoredSecret(pool, key, name);
    if (v != null) map.set(name, v);
  }
  return map;
}

export async function executeRun(pool: Pool, opts: RunOptions): Promise<RunOutcome> {
  const account = await getAccount(pool, opts.accountId);
  if (!account) throw new Error(`account ${opts.accountId} not found`);

  const reg = await getRegistryProvider(account.provider_id);
  const pluginDir = resolveProviderDir(account.provider_id, reg?.package);

  // Choose the execution adapter from the manifest + account opt-in + policy
  // (fail-closed: Bright Data only when explicitly enabled, supported, opted in).
  const brightData = opts.brightData ?? { enabled: false, apiKey: "", browserUrl: "", zone: "mcp_unlocker", country: "us" };
  const manifestRes = await loadManifestFile(join(pluginDir, "plugin.json"));
  const selection =
    manifestRes.ok && manifestRes.manifest
      ? selectAdapter(
          { manifest: manifestRes.manifest, accountBrightDataAllowed: Boolean(account.brightdata_allowed) },
          { brightData },
        )
      : { adapter: "local" as const, reason: "manifest unavailable" };

  const [runRes] = await pool.query<ResultSetHeader>(
    "INSERT INTO runs (account_id, provider_id, adapter, adapter_reason, status, started_at) VALUES (?, ?, ?, ?, 'running', NOW())",
    [account.id, account.provider_id, selection.adapter, selection.reason],
  );
  const runId = runRes.insertId;

  const log = (level: string, event: string, message: string, meta?: Record<string, unknown>) =>
    pool.query(
      "INSERT INTO run_logs (run_id, level, event, message, metadata_json) VALUES (?, ?, ?, ?, ?)",
      [runId, level, event, message, meta ? JSON.stringify(meta) : null],
    );

  const fail = async (status: string, code: ErrorCode, message: string): Promise<RunOutcome> => {
    await pool.query("UPDATE runs SET status = ?, error_code = ?, error_message = ?, finished_at = NOW() WHERE id = ?", [
      status,
      code,
      message,
      runId,
    ]);
    await log("error", "run.failed", message, { code });
    return { runId, status, errorCode: code, errorMessage: message };
  };

  try {
    const provider = await loadProvider(pluginDir);
    await log("info", "run.started", `provider ${provider.manifest.id}@${provider.manifest.version}`);

    // Pre-load the provider's declared secretRefs from the encrypted store so
    // getSecret() stays synchronous. Falls back to SECRET_* env vars.
    const secretMap = await loadSecretRefs(pool, opts.secretsKey, provider.manifest.auth?.secretRefs ?? []);

    const ctx: ProviderContext = {
      logger: {
        info: (m, meta) => void log("info", "provider", m, meta).catch(() => {}),
        warn: (m, meta) => void log("warn", "provider", m, meta).catch(() => {}),
        error: (m, meta) => void log("error", "provider", m, meta).catch(() => {}),
      },
      account: { ref: account.external_account_ref ?? account.display_name, displayName: account.display_name },
      getSecret: (name) => secretMap.get(name) ?? process.env[`SECRET_${name.toUpperCase()}`],
      openBrowser:
        selection.adapter === "brightdata-scraping-browser"
          ? () => openBrightDataBrowser(brightData.browserUrl)
          : () => openLocalBrowser(),
    };

    if (provider.healthcheck) {
      const h = await provider.healthcheck(ctx);
      if (!h.ok) return fail("failed", "adapter.failed", h.detail ?? "healthcheck failed");
    }
    if (provider.login) {
      const l = await provider.login(ctx);
      if (!l.ok) return fail("failed", l.error?.code ?? "auth.invalid_credentials", l.error?.message ?? "login failed");
    }
    if (!provider.listBills || !provider.downloadBill || !provider.normalizeBill) {
      return fail("failed", "provider.unsupported_account", "provider does not implement the retrieval lifecycle");
    }

    const bills = await provider.listBills(ctx);
    if (!bills.length) return fail("failed", "bill.not_found", "login succeeded but no bills were available");

    const runDir = join(opts.artifactsDir, `run-${runId}`);
    await mkdir(runDir, { recursive: true });

    // A single login can cover many accounts (e.g. one portal login → N
    // properties). Persist one artifact + bill + review per candidate.
    const billIds: number[] = [];
    let minConfidence = 1;
    for (let i = 0; i < bills.length; i++) {
      const candidate = bills[i]!;
      const artifact: RawBillArtifact = await provider.downloadBill(ctx, candidate);
      const ext = artifact.contentType === "json" ? "json" : artifact.contentType === "html" ? "html" : "txt";
      const artifactPath = join(runDir, `bill-${i}.${ext}`);
      await writeFile(artifactPath, artifact.content, "utf8");
      const sha = createHash("sha256").update(artifact.content).digest("hex");
      const [artRes] = await pool.query<ResultSetHeader>(
        "INSERT INTO artifacts (run_id, type, path, mime_type, sha256, redaction_status) VALUES (?, ?, ?, ?, ?, 'synthetic')",
        [runId, artifact.contentType === "json" ? "json" : "text", artifactPath, "text/plain", sha],
      );
      const artifactId = artRes.insertId;
      await log("info", "artifact.captured", artifactPath, { sha256: sha });

      const bill: NormalizedBill = await provider.normalizeBill(ctx, artifact);
      const billAccountRef =
        bill.accountRef && bill.accountRef !== "unknown" ? bill.accountRef : candidate.externalRef ?? candidate.label ?? candidate.id;
      const [billRes] = await pool.query<ResultSetHeader>(
        `INSERT INTO bills
           (run_id, account_id, provider_id, account_ref, statement_date, period_start, period_end, due_date,
            amount_due, currency, normalized_json, confidence_score, source_url, primary_artifact_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review')`,
        [
          runId,
          account.id,
          account.provider_id,
          billAccountRef ?? null,
          toIsoDateOrNull(bill.statementDate),
          toIsoDateOrNull(bill.periodStart),
          toIsoDateOrNull(bill.periodEnd),
          toIsoDateOrNull(bill.dueDate),
          bill.amountDue,
          bill.currency,
          JSON.stringify(bill),
          bill.confidence,
          bill.sourceUrl,
          artifactId,
        ],
      );
      const billId = billRes.insertId;
      await pool.query("INSERT INTO reviews (bill_id, status) VALUES (?, 'pending')", [billId]);
      billIds.push(billId);
      await upsertObligationFromBill(pool, {
        providerId: account.provider_id,
        accountRef: billAccountRef ?? "",
        label: candidate.label ?? null,
        amountDue: bill.amountDue,
        dueDate: toIsoDateOrNull(bill.dueDate),
        runId,
      });
      if (bill.confidence < minConfidence) minConfidence = bill.confidence;
      if (bill.confidence < opts.confidenceThreshold) {
        await log("warn", "bill.low_confidence", `bill ${billId} confidence ${bill.confidence} < threshold ${opts.confidenceThreshold}`, {
          code: "bill.low_confidence",
        });
      }
    }

    await pool.query("UPDATE runs SET status = 'needs_review', finished_at = NOW() WHERE id = ?", [runId]);
    await log("info", "run.completed", `${billIds.length} bill(s) created and queued for review`);
    return { runId, status: "needs_review", billId: billIds[0], billIds, billCount: billIds.length, confidence: minConfidence };
  } catch (e) {
    return fail("failed", "error.unknown", (e as Error).message);
  }
}

export interface IngestOptions {
  accountId: number;
  content?: string;
  contentType?: "text" | "json" | "html";
  url?: string;
  artifactsDir: string;
  confidenceThreshold: number;
  brightData?: BrightDataConfig;
}

/**
 * Ingest an artifact for an account WITHOUT a live code-fetch: from a manual
 * upload (content) or a SSRF-guarded URL fetch. Normalizes via the declarative
 * parser (declarative providers) or the provider's normalizeBill (code), then
 * persists run + artifact + bill + review. Never throws once a run row exists.
 */
export async function ingestArtifact(pool: Pool, opts: IngestOptions): Promise<RunOutcome> {
  const account = await getAccount(pool, opts.accountId);
  if (!account) throw new Error(`account ${opts.accountId} not found`);
  const manifest = await getProviderManifest(pool, account.provider_id);
  const url = opts.url ?? account.fetch_url ?? undefined;
  const bd = opts.brightData;
  const useBrightData = Boolean(opts.content == null && url && bd?.enabled && bd.apiKey);
  const adapter = opts.content != null ? "manual" : useBrightData ? "brightdata" : "fetch";
  const adapterReason = opts.content != null ? "manual upload" : `${useBrightData ? "bright-data fetch" : "fetch"} ${url ?? ""}`.trim();

  const [runRes] = await pool.query<ResultSetHeader>(
    "INSERT INTO runs (account_id, provider_id, adapter, adapter_reason, status, started_at) VALUES (?, ?, ?, ?, 'running', NOW())",
    [account.id, account.provider_id, adapter, adapterReason],
  );
  const runId = runRes.insertId;
  const log = (level: string, event: string, message: string, meta?: Record<string, unknown>) =>
    pool.query("INSERT INTO run_logs (run_id, level, event, message, metadata_json) VALUES (?, ?, ?, ?, ?)", [runId, level, event, message, meta ? JSON.stringify(meta) : null]);
  const fail = async (code: ErrorCode, message: string): Promise<RunOutcome> => {
    await pool.query("UPDATE runs SET status = 'failed', error_code = ?, error_message = ?, finished_at = NOW() WHERE id = ?", [code, message, runId]);
    await log("error", "run.failed", message, { code });
    return { runId, status: "failed", errorCode: code, errorMessage: message };
  };

  try {
    let artifact: RawBillArtifact;
    if (opts.content != null) {
      artifact = { content: opts.content, contentType: opts.contentType ?? "text" };
    } else if (url) {
      artifact = useBrightData
        ? await fetchViaBrightData(url, { apiKey: bd!.apiKey, zone: bd!.zone, country: bd!.country })
        : await fetchArtifact(url, { allowedHosts: manifest?.permissions?.network ?? [] });
    } else {
      return fail("error.unknown", "ingest requires content or a url");
    }
    await log("info", "artifact.obtained", adapter === "manual" ? "manual upload" : `fetched ${artifact.sourceUrl ?? url}`);

    let bill: NormalizedBill;
    if (manifest?.kind === "declarative" && manifest.parser) {
      bill = parseDeclarative(manifest.parser, artifact);
      bill.providerId = account.provider_id;
      bill.providerName = manifest.name;
    } else {
      const reg = await getRegistryProvider(account.provider_id);
      const provider = await loadProvider(join(repoRoot, reg?.package ?? `plugins/${account.provider_id}`));
      if (!provider.normalizeBill) return fail("provider.unsupported_account", "provider cannot normalize an uploaded artifact");
      const ctx: ProviderContext = {
        logger: { info: () => {}, warn: () => {}, error: () => {} },
        account: { ref: account.external_account_ref ?? account.display_name, displayName: account.display_name },
        getSecret: (n) => process.env[`SECRET_${n.toUpperCase()}`],
      };
      bill = await provider.normalizeBill(ctx, artifact);
    }

    const runDir = join(opts.artifactsDir, `run-${runId}`);
    await mkdir(runDir, { recursive: true });
    const ext = artifact.contentType === "json" ? "json" : artifact.contentType === "html" ? "html" : "txt";
    const artifactPath = join(runDir, `bill.${ext}`);
    await writeFile(artifactPath, artifact.content, "utf8");
    const sha = createHash("sha256").update(artifact.content).digest("hex");
    const [artRes] = await pool.query<ResultSetHeader>(
      "INSERT INTO artifacts (run_id, type, path, mime_type, sha256, redaction_status) VALUES (?, ?, ?, ?, ?, 'synthetic')",
      [runId, artifact.contentType === "json" ? "json" : "text", artifactPath, artifact.contentType === "json" ? "application/json" : "text/plain", sha],
    );
    const artifactId = artRes.insertId;
    const ingestRef = bill.accountRef && bill.accountRef !== "unknown" ? bill.accountRef : account.external_account_ref ?? null;
    const [billRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO bills
         (run_id, account_id, provider_id, account_ref, statement_date, period_start, period_end, due_date,
          amount_due, currency, normalized_json, confidence_score, source_url, primary_artifact_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review')`,
      [runId, account.id, account.provider_id, ingestRef, toIsoDateOrNull(bill.statementDate), toIsoDateOrNull(bill.periodStart), toIsoDateOrNull(bill.periodEnd), toIsoDateOrNull(bill.dueDate), bill.amountDue, bill.currency, JSON.stringify(bill), bill.confidence, bill.sourceUrl, artifactId],
    );
    const billId = billRes.insertId;
    await pool.query("INSERT INTO reviews (bill_id, status) VALUES (?, 'pending')", [billId]);
    if (ingestRef) {
      await upsertObligationFromBill(pool, { providerId: account.provider_id, accountRef: ingestRef, label: null, amountDue: bill.amountDue, dueDate: toIsoDateOrNull(bill.dueDate), runId });
    }
    if (bill.confidence < opts.confidenceThreshold) {
      await log("warn", "bill.low_confidence", `confidence ${bill.confidence} < threshold ${opts.confidenceThreshold}`, { code: "bill.low_confidence" });
    }
    await pool.query("UPDATE runs SET status = 'needs_review', finished_at = NOW() WHERE id = ?", [runId]);
    await log("info", "run.completed", `bill ${billId} ingested and queued for review`);
    return { runId, status: "needs_review", billId, confidence: bill.confidence };
  } catch (e) {
    return fail("error.unknown", (e as Error).message);
  }
}
