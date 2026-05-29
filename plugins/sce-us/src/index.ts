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

function field(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m && m[1] ? m[1] : null;
}

/** SCE prints US dates (MM/DD/YYYY); normalize to ISO. */
function isoFromUS(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

/**
 * Parser for SCE's statement layout (synthetic fixture in the public repo).
 * Deterministic; confidence v0 = min across required fields.
 */
export function parseBill(artifact: RawBillArtifact): NormalizedBill {
  const t = artifact.content;
  const amountStr = field(t, /Total Amount Due:\s*\$?([\d,]+\.\d{2})/i);
  const amountDue = amountStr ? Number(amountStr.replace(/,/g, "")) : null;
  const dueDate = isoFromUS(field(t, /Payment Due Date:\s*(\d{2}\/\d{2}\/\d{4})/i));
  const statementDate = isoFromUS(field(t, /Bill Date:\s*(\d{2}\/\d{2}\/\d{4})/i));
  const periodStart = isoFromUS(field(t, /Billing Period:\s*(\d{2}\/\d{2}\/\d{4})/i));
  const periodEnd = isoFromUS(field(t, /Billing Period:\s*\d{2}\/\d{2}\/\d{4}\s*-\s*(\d{2}\/\d{2}\/\d{4})/i));
  const accountRef = field(t, /Service Account:\s*([\d-]+)/i) ?? "unknown";

  const lineItems: BillLineItem[] = [...t.matchAll(/^([A-Za-z][A-Za-z ./-]+?)\s+\$([\d,]+\.\d{2})\s*$/gm)]
    .map((m) => ({ label: (m[1] ?? "").trim(), amount: Number((m[2] ?? "0").replace(/,/g, "")) }))
    .filter((li) => !/total amount due/i.test(li.label));

  const scoreOf = (v: unknown) => (v != null ? 0.9 : 0);
  const fields = {
    amountDue: { confidence: scoreOf(amountDue), source: "text" },
    dueDate: { confidence: scoreOf(dueDate), source: "text" },
    statementDate: { confidence: scoreOf(statementDate), source: "text" },
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
    currency: "USD",
    lineItems,
    sourceUrl: artifact.sourceUrl ?? null,
    evidence: { parser: PARSER_ID, fields },
    confidence,
  };
}

const provider: UtilityWatchProvider = {
  manifest: manifest as UtilityWatchProvider["manifest"],
  async healthcheck() {
    return { ok: true, detail: "sce-us parser ready (synthetic fixtures)" };
  },
  async login(_ctx: ProviderContext) {
    return { ok: true };
  },
  async listBills(): Promise<BillCandidate[]> {
    return [{ id: "sce-2026-05", statementDate: "2026-05-02", sourceUrl: "https://www.sce.com/mybills/sce-2026-05" }];
  },
  /**
   * Public-repo behavior: read the synthetic fixture. The production flow drives
   * the SCE portal through `ctx.openBrowser()` (the Bright Data Scraping Browser
   * when the account opts in) using the account's secret handles — that flow and
   * any real data live outside this public repo.
   */
  async downloadBill(ctx: ProviderContext, bill: BillCandidate): Promise<RawBillArtifact> {
    ctx.logger.info("sce-us: reading synthetic fixture (public repo build)");
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const content = await readFile(join(here, "..", "fixtures", "sample-bill.txt"), "utf8");
    return { content, contentType: "text", sourceUrl: bill.sourceUrl };
  },
  async normalizeBill(_ctx: ProviderContext, artifact: RawBillArtifact): Promise<NormalizedBill> {
    return parseBill(artifact);
  },
};

export default provider;
