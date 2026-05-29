// Declarative parser engine (uw-parser-v1). See
// docs/superpowers/specs/2026-05-29-dashboard-refinement-design.md
// ("Declarative parser").
//
// Pure, deterministic, no code execution. Normalizes a RawBillArtifact into a
// NormalizedBill (the same shape code providers produce) using a JSON spec.
// The engine NEVER throws: malformed JSON, bad regex input, or a missing field
// yields confidence 0 for that field, and the overall run can route to review.

import type {
  RawBillArtifact,
  NormalizedBill,
  BillLineItem,
  FieldEvidence,
} from "./contract.ts";

export const PARSER_SCHEMA_VERSION = "uw-parser-v1";
const PARSER_ID = "uw-parser-v1";

/** Field extraction sources. */
export type FieldSource = "regex" | "json";
export type Cast = "money" | "date";

export interface FieldSpec {
  from: FieldSource;
  /** Regex source string (for `from: "regex"`). */
  pattern?: string;
  /** Capture group index (defaults to 1) for regex. */
  group?: number;
  /** Dot-path into parsed JSON (for `from: "json"`). */
  path?: string;
  /** Optional value cast. Anything else is left as a string. */
  cast?: Cast;
  /** Optional date format hint, e.g. "MM/DD/YYYY". */
  format?: string;
}

export interface LineItemsSpec {
  from: "regex-all";
  pattern: string;
  labelGroup: number;
  amountGroup: number;
}

export interface ParserSpec {
  schemaVersion: string;
  artifact: "text" | "json";
  currency: string;
  fields: {
    amountDue: FieldSpec;
    dueDate: FieldSpec;
    statementDate: FieldSpec;
    periodStart?: FieldSpec;
    periodEnd?: FieldSpec;
    accountRef?: FieldSpec;
  };
  lineItems?: LineItemsSpec;
}

const REQUIRED_FIELDS = ["amountDue", "dueDate", "statementDate"] as const;

interface Extracted {
  /** Raw string value, or null when missing/parse-failed. */
  raw: string | null;
  /** Confidence by source: json=1.0, regex=0.9, missing/fail=0. */
  confidence: number;
  source: string;
}

const MISSING: Extracted = { raw: null, confidence: 0, source: "none" };

/** Compile a regex without throwing on a bad pattern. */
function safeRegex(pattern: string, flags?: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/** Parse JSON without throwing. Returns undefined on failure. */
function safeJsonParse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

/** Resolve a dot-path against a parsed JSON value. */
function dotPath(root: unknown, path: string): unknown {
  if (root == null || !path) return undefined;
  let cur: unknown = root;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function extractField(
  spec: FieldSpec | undefined,
  text: string,
  json: unknown,
): Extracted {
  if (!spec) return MISSING;

  if (spec.from === "regex") {
    if (typeof text !== "string" || !spec.pattern) return MISSING;
    const re = safeRegex(spec.pattern);
    if (!re) return MISSING;
    let m: RegExpMatchArray | null;
    try {
      m = text.match(re);
    } catch {
      return MISSING;
    }
    const group = spec.group ?? 1;
    const value = m && m[group] != null ? m[group] : null;
    if (value == null) return MISSING;
    return { raw: value, confidence: 0.9, source: "regex" };
  }

  if (spec.from === "json") {
    if (!spec.path) return MISSING;
    const value = dotPath(json, spec.path);
    if (value == null) return MISSING;
    const raw = typeof value === "string" ? value : String(value);
    return { raw, confidence: 1.0, source: "json" };
  }

  return MISSING;
}

/** money cast: strip $ and commas, Number(). Returns null on NaN. */
function castMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * date cast: convert to ISO (YYYY-MM-DD). With an explicit `format` like
 * MM/DD/YYYY, reorder accordingly. Otherwise pass through if already ISO,
 * else return the raw string unchanged.
 */
function castDate(raw: string, format?: string): string {
  const trimmed = raw.trim();
  if (format) {
    const fmt = format.toUpperCase();
    // Pull the three numeric components in source order.
    const parts = trimmed.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (parts) {
      const tokens = fmt.split(/[^A-Z]+/).filter(Boolean); // e.g. ["MM","DD","YYYY"]
      if (tokens.length === 3) {
        const map: Record<string, string> = {};
        map[tokens[0]![0]!] = parts[1]!;
        map[tokens[1]![0]!] = parts[2]!;
        map[tokens[2]![0]!] = parts[3]!;
        const y = map["Y"];
        const mo = map["M"];
        const d = map["D"];
        if (y && mo && d) {
          return `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
      }
    }
    return trimmed;
  }
  // No format: pass through if already ISO, else leave as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function applyCast(extracted: Extracted, spec: FieldSpec | undefined): {
  value: string | number | null;
  confidence: number;
  source: string;
} {
  if (extracted.raw == null) {
    return { value: null, confidence: 0, source: extracted.source };
  }
  if (spec?.cast === "money") {
    const n = castMoney(extracted.raw);
    // A cast that fails to produce a number is a parse failure → confidence 0.
    if (n == null) return { value: null, confidence: 0, source: extracted.source };
    return { value: n, confidence: extracted.confidence, source: extracted.source };
  }
  if (spec?.cast === "date") {
    return {
      value: castDate(extracted.raw, spec.format),
      confidence: extracted.confidence,
      source: extracted.source,
    };
  }
  return { value: extracted.raw, confidence: extracted.confidence, source: extracted.source };
}

function extractLineItems(spec: LineItemsSpec | undefined, text: string): BillLineItem[] {
  if (!spec || typeof text !== "string" || !spec.pattern) return [];
  const re = safeRegex(spec.pattern, "gm");
  if (!re) return [];
  const items: BillLineItem[] = [];
  try {
    for (const m of text.matchAll(re)) {
      const label = (m[spec.labelGroup] ?? "").trim();
      const amountStr = m[spec.amountGroup];
      if (!label || amountStr == null) continue;
      const amount = castMoney(amountStr);
      if (amount == null) continue;
      items.push({ label, amount });
    }
  } catch {
    return [];
  }
  return items;
}

/**
 * Normalize a raw artifact using a uw-parser-v1 spec. Never throws.
 *
 * @param spec   The parser spec (typically from a declarative provider manifest).
 * @param artifact The obtained artifact (text or JSON content).
 */
export function parseDeclarative(spec: ParserSpec, artifact: RawBillArtifact): NormalizedBill {
  const content = typeof artifact?.content === "string" ? artifact.content : "";

  // For json specs, parse once up front. Malformed JSON → undefined → all json
  // fields resolve to confidence 0 (never throws).
  const wantsJson =
    spec?.artifact === "json" ||
    Object.values(spec?.fields ?? {}).some((f) => f?.from === "json");
  const json = wantsJson ? safeJsonParse(content) : undefined;

  const fieldsSpec = spec?.fields ?? ({} as ParserSpec["fields"]);

  const resolve = (key: keyof ParserSpec["fields"]) => {
    const fieldSpec = fieldsSpec[key];
    return applyCast(extractField(fieldSpec, content, json), fieldSpec);
  };

  const amountDue = resolve("amountDue");
  const dueDate = resolve("dueDate");
  const statementDate = resolve("statementDate");
  const periodStart = resolve("periodStart");
  const periodEnd = resolve("periodEnd");
  const accountRef = resolve("accountRef");

  const evidenceFields: Record<string, FieldEvidence> = {
    amountDue: { confidence: amountDue.confidence, source: amountDue.source },
    dueDate: { confidence: dueDate.confidence, source: dueDate.source },
    statementDate: { confidence: statementDate.confidence, source: statementDate.source },
  };
  if (fieldsSpec.periodStart) {
    evidenceFields.periodStart = { confidence: periodStart.confidence, source: periodStart.source };
  }
  if (fieldsSpec.periodEnd) {
    evidenceFields.periodEnd = { confidence: periodEnd.confidence, source: periodEnd.source };
  }
  if (fieldsSpec.accountRef) {
    evidenceFields.accountRef = { confidence: accountRef.confidence, source: accountRef.source };
  }

  const confidence = Math.min(
    ...REQUIRED_FIELDS.map((k) => evidenceFields[k]!.confidence),
  );

  return {
    providerId: "declarative",
    providerName: "Declarative provider",
    accountRef: typeof accountRef.value === "string" ? accountRef.value : "unknown",
    statementDate: typeof statementDate.value === "string" ? statementDate.value : null,
    periodStart: typeof periodStart.value === "string" ? periodStart.value : null,
    periodEnd: typeof periodEnd.value === "string" ? periodEnd.value : null,
    dueDate: typeof dueDate.value === "string" ? dueDate.value : null,
    amountDue: typeof amountDue.value === "number" ? amountDue.value : null,
    currency: spec?.currency ?? "USD",
    lineItems: extractLineItems(spec?.lineItems, content),
    sourceUrl: artifact?.sourceUrl ?? null,
    evidence: { parser: PARSER_ID, fields: evidenceFields },
    confidence,
  };
}
