import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Pool, ResultSetHeader } from "mysql2/promise";
import { loadProvider } from "../plugins/loader.ts";
import { loadManifestFile } from "../plugins/validate.ts";
import { selectAdapter } from "../adapters/select.ts";
import { openBrightDataBrowser } from "../adapters/brightdata.ts";
import { getAccount } from "../services/accounts.ts";
import { getRegistryProvider } from "../services/providers.ts";
import { repoRoot } from "../paths.ts";
import type { ProviderContext, NormalizedBill, ErrorCode, RawBillArtifact } from "../plugins/contract.ts";
import type { BrightDataConfig } from "../config/index.ts";

export interface RunOptions {
  accountId: number;
  artifactsDir: string;
  confidenceThreshold: number;
  brightData?: BrightDataConfig;
}

export interface RunOutcome {
  runId: number;
  status: string;
  billId?: number;
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
export async function executeRun(pool: Pool, opts: RunOptions): Promise<RunOutcome> {
  const account = await getAccount(pool, opts.accountId);
  if (!account) throw new Error(`account ${opts.accountId} not found`);

  const reg = await getRegistryProvider(account.provider_id);
  const pluginDir = join(repoRoot, reg?.package ?? `plugins/${account.provider_id}`);

  // Choose the execution adapter from the manifest + account opt-in + policy
  // (fail-closed: Bright Data only when explicitly enabled, supported, opted in).
  const brightData = opts.brightData ?? { enabled: false, apiKey: "", browserUrl: "" };
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

    const ctx: ProviderContext = {
      logger: {
        info: (m, meta) => void log("info", "provider", m, meta),
        warn: (m, meta) => void log("warn", "provider", m, meta),
        error: (m, meta) => void log("error", "provider", m, meta),
      },
      account: { ref: account.external_account_ref ?? account.display_name, displayName: account.display_name },
      getSecret: (name) => process.env[`SECRET_${name.toUpperCase()}`],
      ...(selection.adapter === "brightdata-scraping-browser"
        ? { openBrowser: () => openBrightDataBrowser(brightData.browserUrl) }
        : {}),
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
    const candidate = bills[0]!;

    const artifact: RawBillArtifact = await provider.downloadBill(ctx, candidate);

    const runDir = join(opts.artifactsDir, `run-${runId}`);
    await mkdir(runDir, { recursive: true });
    const ext = artifact.contentType === "json" ? "json" : artifact.contentType === "html" ? "html" : "txt";
    const artifactPath = join(runDir, `bill.${ext}`);
    await writeFile(artifactPath, artifact.content, "utf8");
    const sha = createHash("sha256").update(artifact.content).digest("hex");
    const [artRes] = await pool.query<ResultSetHeader>(
      "INSERT INTO artifacts (run_id, type, path, mime_type, sha256, redaction_status) VALUES (?, ?, ?, ?, ?, 'synthetic')",
      [runId, artifact.contentType === "json" ? "json" : "text", artifactPath, "text/plain", sha],
    );
    const artifactId = artRes.insertId;
    await log("info", "artifact.captured", artifactPath, { sha256: sha });

    const bill: NormalizedBill = await provider.normalizeBill(ctx, artifact);
    const [billRes] = await pool.query<ResultSetHeader>(
      `INSERT INTO bills
         (run_id, account_id, provider_id, statement_date, period_start, period_end, due_date,
          amount_due, currency, normalized_json, confidence_score, source_url, primary_artifact_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review')`,
      [
        runId,
        account.id,
        account.provider_id,
        bill.statementDate,
        bill.periodStart,
        bill.periodEnd,
        bill.dueDate,
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

    if (bill.confidence < opts.confidenceThreshold) {
      await log("warn", "bill.low_confidence", `confidence ${bill.confidence} < threshold ${opts.confidenceThreshold}`, {
        code: "bill.low_confidence",
      });
    }

    await pool.query("UPDATE runs SET status = 'needs_review', finished_at = NOW() WHERE id = ?", [runId]);
    await log("info", "run.completed", `bill ${billId} created and queued for review`);
    return { runId, status: "needs_review", billId, confidence: bill.confidence };
  } catch (e) {
    return fail("failed", "error.unknown", (e as Error).message);
  }
}
