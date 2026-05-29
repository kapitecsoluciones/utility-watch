import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Pool } from "mysql2/promise";
import type { AppConfig } from "../config/index.ts";
import { readRegistry, listInstalled } from "../services/providers.ts";
import { listAccounts } from "../services/accounts.ts";
import { listBills, getBill } from "../services/bills.ts";
import { getRun, getRunDetail } from "../services/runs.ts";
import { executeRun } from "../runner/index.ts";
import { reviewBill } from "../services/review.ts";
import { exportBill } from "../services/exporter.ts";

/** Capabilities a standard agent token holds by default (read is always allowed). */
export const DEFAULT_AGENT_CAPABILITIES = ["jobs.run", "runs.inspect", "ai.diagnose"];

export interface McpDeps {
  pool: Pool;
  config: AppConfig;
  capabilities: Set<string>;
}

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const err = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true });
const denied = (cap: string): ToolResult =>
  err(`Permission denied: this agent token lacks the '${cap}' capability. A human or an explicit policy grant is required.`);

export function buildMcpServer(deps: McpDeps): McpServer {
  const { pool, config, capabilities } = deps;
  const server = new McpServer({ name: "utility-watch", version: "0.1.0" });

  server.registerTool(
    "list_providers",
    { description: "List utility providers in the registry and which are installed." },
    async () => {
      const registry = await readRegistry();
      let installed: string[] = [];
      try {
        installed = (await listInstalled(pool)).map((p) => p.id);
      } catch {
        /* db not migrated */
      }
      return ok(registry.map((p) => ({ ...p, installed: installed.includes(p.id) })));
    },
  );

  server.registerTool(
    "list_accounts",
    { description: "List configured accounts (never includes secret values)." },
    async () => {
      const accounts = await listAccounts(pool);
      return ok(
        accounts.map((a) => ({
          id: a.id,
          provider: a.provider_id,
          displayName: a.display_name,
          brightDataAllowed: Boolean(a.brightdata_allowed),
        })),
      );
    },
  );

  server.registerTool(
    "run_retrieval",
    {
      description: "Start a bill retrieval for an account. Returns the run outcome (async work persisted to the run record).",
      inputSchema: { account_id: z.number().int().positive() },
    },
    async ({ account_id }) => {
      if (!capabilities.has("jobs.run")) return denied("jobs.run");
      const outcome = await executeRun(pool, {
        accountId: account_id,
        artifactsDir: config.artifactsDir,
        confidenceThreshold: config.reviewConfidenceThreshold,
        brightData: config.brightData,
      });
      return ok(outcome);
    },
  );

  server.registerTool(
    "get_run",
    {
      description: "Get a run with status, adapter, error, artifact references, and the audit log.",
      inputSchema: { run_id: z.number().int().positive() },
    },
    async ({ run_id }) => {
      const detail = await getRunDetail(pool, run_id);
      if (!detail) return err(`run ${run_id} not found`);
      return ok({ run: detail.run, artifacts: detail.artifacts, log: detail.logs });
    },
  );

  server.registerTool(
    "list_bills",
    {
      description: "Query normalized bills. Answers questions like 'what is due across the portfolio before a date'.",
      inputSchema: {
        status: z.string().optional(),
        due_before: z.string().optional(),
        account_id: z.number().int().positive().optional(),
      },
    },
    async ({ status, due_before, account_id }) =>
      ok(await listBills(pool, { status, dueBefore: due_before, accountId: account_id })),
  );

  server.registerTool(
    "get_bill",
    {
      description: "Get a normalized bill with evidence references and per-field confidence.",
      inputSchema: { bill_id: z.number().int().positive() },
    },
    async ({ bill_id }) => {
      const bill = await getBill(pool, bill_id);
      if (!bill) return err(`bill ${bill_id} not found`);
      const normalized = typeof bill.normalized_json === "string" ? JSON.parse(bill.normalized_json) : bill.normalized_json;
      return ok({ id: bill.id, status: bill.status, reviewStatus: bill.review_status ?? null, bill: normalized });
    },
  );

  server.registerTool(
    "diagnose_run",
    {
      description: "Deterministic diagnosis note for a run (status, adapter, error, suggested next action).",
      inputSchema: { run_id: z.number().int().positive() },
    },
    async ({ run_id }) => {
      const run = await getRun(pool, run_id);
      if (!run) return err(`run ${run_id} not found`);
      let suggestion = "No action needed.";
      if (run.status === "failed") {
        const map: Record<string, string> = {
          "auth.invalid_credentials": "Check the account secret handle and re-run.",
          "auth.mfa_required": "MFA needs a human; complete it, then re-run.",
          "portal.blocked": "Enable the Bright Data Scraping Browser adapter for this account (policy-gated).",
          "bill.not_found": "No bill for this period yet; retry later.",
          "bill.parse_failed": "Parser likely drifted; review the artifact and update the provider plugin.",
        };
        suggestion = map[String(run.error_code)] ?? "Inspect artifacts and the audit log; consider re-running.";
      } else if (run.status === "needs_review") {
        suggestion = "A bill was produced and is awaiting human review before export.";
      }
      return ok({
        runId: run.id,
        status: run.status,
        adapter: run.adapter,
        errorCode: run.error_code ?? null,
        errorMessage: run.error_message ?? null,
        suggestion,
      });
    },
  );

  // ---- Gated tools: fail-closed unless the agent token has the capability ----

  server.registerTool(
    "export_bill",
    {
      description: "Export an APPROVED bill as JSON. Requires the 'bills.export' capability.",
      inputSchema: { bill_id: z.number().int().positive() },
    },
    async ({ bill_id }) => {
      if (!capabilities.has("bills.export")) return denied("bills.export");
      const result = await exportBill(pool, bill_id, config.exportsDir);
      return ok(result);
    },
  );

  server.registerTool(
    "propose_review",
    {
      description:
        "Record a review recommendation for a bill. Finalizes the decision only if the agent has 'bills.review'; otherwise it is recorded as a recommendation pending human approval.",
      inputSchema: {
        bill_id: z.number().int().positive(),
        decision: z.enum(["approve", "reject"]),
        notes: z.string().optional(),
      },
    },
    async ({ bill_id, decision, notes }) => {
      if (capabilities.has("bills.review")) {
        const outcome = await reviewBill(pool, bill_id, decision, { reviewer: "agent", notes });
        return ok({ finalized: true, ...outcome });
      }
      return ok({
        finalized: false,
        message: "Recommendation recorded; human approval required (agent token lacks 'bills.review').",
        bill_id,
        decision,
        notes: notes ?? null,
      });
    },
  );

  return server;
}
