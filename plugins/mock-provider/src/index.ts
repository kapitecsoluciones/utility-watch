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

/**
 * Pure, deterministic parser from raw bill text to a NormalizedBill.
 * Confidence v0 (PLAN §12): per-field score by extraction method; the overall
 * score is the minimum across required fields, so a missing field forces review.
 */
export function parseBill(artifact: RawBillArtifact): NormalizedBill {
  const t = artifact.content;
  const amountStr = field(t, /Amount Due:\s*\$?([\d,]+\.\d{2})/i);
  const amountDue = amountStr ? Number(amountStr.replace(/,/g, "")) : null;
  const dueDate = field(t, /Due Date:\s*(\d{4}-\d{2}-\d{2})/i);
  const statementDate = field(t, /Statement Date:\s*(\d{4}-\d{2}-\d{2})/i);
  const periodStart = field(t, /Service Period:\s*(\d{4}-\d{2}-\d{2})/i);
  const periodEnd = field(t, /Service Period:\s*\d{4}-\d{2}-\d{2}\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/i);
  const accountRef = field(t, /Account:\s*(\S+)/i) ?? "unknown";

  const lineItems: BillLineItem[] = [...t.matchAll(/^([A-Za-z][A-Za-z ./-]+?)\s+\$([\d,]+\.\d{2})\s*$/gm)]
    .map((m) => ({ label: (m[1] ?? "").trim(), amount: Number((m[2] ?? "0").replace(/,/g, "")) }))
    .filter((li) => !/amount due/i.test(li.label));

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
    return { ok: true, detail: "mock provider ready" };
  },
  async login(_ctx: ProviderContext) {
    return { ok: true };
  },
  async listBills(): Promise<BillCandidate[]> {
    return [{ id: "mock-2026-05", statementDate: "2026-05-01", sourceUrl: "https://example.test/bills/mock-2026-05" }];
  },
  async downloadBill(_ctx: ProviderContext, bill: BillCandidate): Promise<RawBillArtifact> {
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
