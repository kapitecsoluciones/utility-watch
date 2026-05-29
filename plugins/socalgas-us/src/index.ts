import type {
  UtilityWatchProvider,
  ProviderContext,
  RawBillArtifact,
  NormalizedBill,
  BillCandidate,
  BillLineItem,
} from "@utility-watch/core";
import manifest from "../plugin.json" with { type: "json" };

const PARSER_ID = `${manifest.id}@${manifest.version}`;

interface SoCalGasPayload {
  accountNumber?: string;
  statementDate?: string;
  servicePeriod?: { start?: string; end?: string };
  amountDue?: number;
  dueDate?: string;
  currency?: string;
  charges?: { description?: string; amount?: number }[];
}

/**
 * Parse SoCalGas's intercepted billing-API JSON into a NormalizedBill.
 * Because the source is structured JSON (not parsed PDF text), per-field
 * confidence is 1.0 (PLAN §12 confidence v0). Malformed input yields
 * confidence 0 so it routes to review instead of throwing.
 */
export function parseBill(artifact: RawBillArtifact): NormalizedBill {
  let data: SoCalGasPayload = {};
  let parseOk = true;
  try {
    data = JSON.parse(artifact.content) as SoCalGasPayload;
  } catch {
    parseOk = false;
  }

  const amountDue = typeof data.amountDue === "number" ? data.amountDue : null;
  const dueDate = data.dueDate ?? null;
  const statementDate = data.statementDate ?? null;
  const periodStart = data.servicePeriod?.start ?? null;
  const periodEnd = data.servicePeriod?.end ?? null;
  const accountRef = data.accountNumber ?? "unknown";
  const lineItems: BillLineItem[] = (data.charges ?? [])
    .filter((c) => typeof c.amount === "number" && c.description)
    .map((c) => ({ label: String(c.description), amount: Number(c.amount) }));

  const scoreOf = (v: unknown) => (parseOk && v != null ? 1 : 0);
  const fields = {
    amountDue: { confidence: scoreOf(amountDue), source: "json-api" },
    dueDate: { confidence: scoreOf(dueDate), source: "json-api" },
    statementDate: { confidence: scoreOf(statementDate), source: "json-api" },
  };
  const confidence = Math.min(
    fields.amountDue.confidence,
    fields.dueDate.confidence,
    fields.statementDate.confidence,
  );

  return {
    providerId: manifest.id,
    providerName: manifest.name,
    accountRef,
    statementDate,
    periodStart,
    periodEnd,
    dueDate,
    amountDue,
    currency: data.currency ?? "USD",
    lineItems,
    sourceUrl: artifact.sourceUrl ?? null,
    evidence: { parser: PARSER_ID, fields },
    confidence,
  };
}

const provider: UtilityWatchProvider = {
  manifest: manifest as UtilityWatchProvider["manifest"],
  async healthcheck() {
    return { ok: true, detail: "socalgas-us parser ready (synthetic JSON fixture)" };
  },
  async login(_ctx: ProviderContext) {
    return { ok: true };
  },
  async listBills(): Promise<BillCandidate[]> {
    return [{ id: "scg-2026-05", statementDate: "2026-05-03", sourceUrl: "https://www.socalgas.com/api/bills/scg-2026-05" }];
  },
  /**
   * Public-repo behavior: read the synthetic JSON fixture. Production drives the
   * SoCalGas React SPA through `ctx.openBrowser()` (Bright Data Scraping Browser)
   * and intercepts the billing API response — that flow and any real data live
   * outside this public repo.
   */
  async downloadBill(ctx: ProviderContext, bill: BillCandidate): Promise<RawBillArtifact> {
    ctx.logger.info("socalgas-us: reading synthetic JSON fixture (public repo build)");
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const content = await readFile(join(here, "..", "fixtures", "sample-bill.json"), "utf8");
    return { content, contentType: "json", sourceUrl: bill.sourceUrl };
  },
  async normalizeBill(_ctx: ProviderContext, artifact: RawBillArtifact): Promise<NormalizedBill> {
    return parseBill(artifact);
  },
};

export default provider;
