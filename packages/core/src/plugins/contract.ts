// Public plugin contract types (uw-plugin-v1). See docs/plugin-contract.md.

export const SERVICE_TYPES = [
  "electricity",
  "gas",
  "water",
  "waste",
  "internet",
  "telecom",
  "other",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CAPABILITIES = [
  "auth.login",
  "auth.logout",
  "accounts.list",
  "bills.list",
  "bills.download",
  "bills.normalize",
  "artifacts.capture",
  "healthcheck.run",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const ARTIFACT_TYPES = ["html", "pdf", "screenshot", "json", "text"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const BRIGHTDATA_MODES = ["unsupported", "optional", "supported", "required"] as const;
export type BrightDataMode = (typeof BRIGHTDATA_MODES)[number];

// Canonical error taxonomy — mirrors docs/plugin-contract.md §7.
export const ERROR_CODES = [
  "auth.invalid_credentials",
  "auth.mfa_required",
  "portal.layout_changed",
  "portal.blocked",
  "portal.timeout",
  "portal.rate_limited",
  "provider.unsupported_account",
  "bill.not_found",
  "bill.parse_failed",
  "bill.low_confidence",
  "policy.denied",
  "adapter.failed",
  "artifact.missing",
  "error.unknown",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ProviderManifest {
  id: string;
  name: string;
  version: string;
  license: string;
  schemaVersion: "uw-plugin-v1";
  coreVersion: string;
  country: string;
  serviceTypes: ServiceType[];
  homepage?: string;
  entrypoint: string;
  capabilities: Capability[];
  auth: {
    type: string;
    secretRefs: string[];
  };
  permissions: {
    network: string[];
    artifacts: ArtifactType[];
    filesystem: "artifacts-only" | "none";
    brightData: BrightDataMode;
  };
  quality: {
    status: "draft" | "community" | "verified" | "broken" | "deprecated";
    verification: "none" | "fixture-only" | "verified";
    lastVerified: string | null;
    limitations: string[];
  };
  tests?: {
    fixtures?: string;
    healthcheck?: string;
  };
  support: {
    maintainer: string;
    url?: string;
  };
}

// ---- Normalized bill (PLAN §12) ----

export interface BillLineItem {
  label: string;
  amount: number;
}

export interface FieldEvidence {
  confidence: number;
  source: string;
}

export interface NormalizedBill {
  providerId: string;
  providerName: string;
  accountRef: string;
  statementDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  amountDue: number | null;
  currency: string;
  lineItems: BillLineItem[];
  sourceUrl: string | null;
  evidence: {
    parser: string;
    fields: Record<string, FieldEvidence>;
  };
  confidence: number;
}

// ---- Provider runtime contract (subset needed for v0) ----

export interface ProviderLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface BrowserSession {
  /** A playwright-core Page. Typed as unknown to keep the public contract dependency-free. */
  page: unknown;
  close(): Promise<void>;
}

export interface ProviderContext {
  logger: ProviderLogger;
  account: { ref: string; displayName: string };
  /** Resolve a declared secret handle to its value (local dev only). */
  getSecret(name: string): string | undefined;
  /**
   * Open an adapter-provided browser session. Present only when an execution
   * adapter that provides a browser was selected (e.g. the Bright Data Scraping
   * Browser). Plugins must not construct browsers directly.
   */
  openBrowser?(): Promise<BrowserSession>;
}

export interface StructuredError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface BillCandidate {
  id: string;
  statementDate?: string;
  sourceUrl?: string;
}

export interface RawBillArtifact {
  /** Raw extracted text or structured payload the parser will normalize. */
  content: string;
  contentType: "text" | "json" | "html";
  sourceUrl?: string;
}

export interface UtilityWatchProvider {
  manifest: ProviderManifest;
  healthcheck?(ctx: ProviderContext): Promise<{ ok: boolean; detail?: string }>;
  login?(ctx: ProviderContext): Promise<{ ok: boolean; error?: StructuredError }>;
  listBills?(ctx: ProviderContext): Promise<BillCandidate[]>;
  downloadBill?(ctx: ProviderContext, bill: BillCandidate): Promise<RawBillArtifact>;
  normalizeBill?(ctx: ProviderContext, artifact: RawBillArtifact): Promise<NormalizedBill>;
}
