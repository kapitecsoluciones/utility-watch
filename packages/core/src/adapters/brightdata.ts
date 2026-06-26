import type { BrowserSession, RawBillArtifact } from "../plugins/contract.ts";
import { hostAllowed } from "./fetch.ts";

const BRIGHTDATA_REQUEST_URL = "https://api.brightdata.com/request";
const BD_TIMEOUT_MS = 60_000;

/**
 * Fetch a public page through the Bright Data Web Unlocker (a residential-IP
 * unblocking proxy) and return its body as a raw artifact for normalization.
 * This is the live-retrieval path for declarative providers: the operator's
 * "Fetch URL" goes out through Bright Data instead of a direct request, so a
 * geo/datacenter-blocked public utility portal becomes reachable. The token is
 * a handle held in config (BRIGHTDATA_API_KEY); only the URL is sent out.
 */
export async function fetchViaBrightData(
  url: string,
  opts: { apiKey: string; zone: string; country?: string; allowedHosts?: string[] },
): Promise<RawBillArtifact> {
  if (!opts.apiKey) throw new Error("Bright Data fetch selected but BRIGHTDATA_API_KEY is not set");
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("only http(s) URLs are allowed");
  // Same provider network allowlist the direct-fetch path enforces, so the paid
  // Bright Data proxy can't be pointed at an arbitrary host.
  if (!hostAllowed(u.hostname, opts.allowedHosts ?? [])) {
    throw new Error("URL host is not in the provider's declared network allowlist");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BD_TIMEOUT_MS);
  try {
    const res = await fetch(BRIGHTDATA_REQUEST_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${opts.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ zone: opts.zone, url: u.toString(), format: "raw", country: opts.country ?? "us" }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Bright Data request failed: HTTP ${res.status} ${body.slice(0, 200)}`);
    const trimmed = body.trimStart();
    const contentType: RawBillArtifact["contentType"] =
      trimmed.startsWith("{") || trimmed.startsWith("[") ? "json" : /<html|<!doctype/i.test(trimmed.slice(0, 200)) ? "html" : "text";
    return { content: body, contentType, sourceUrl: u.toString() };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Connect to the Bright Data Scraping Browser over CDP and hand back a page.
 * Uses playwright-core's connectOverCDP — no local browser binary is needed
 * because the browser runs remotely on Bright Data. The endpoint comes from
 * BRIGHTDATA_BROWSER_URL (a wss:// CDP URL). Disabled by default; only reached
 * when adapter selection chose Bright Data (see adapters/select.ts).
 */
export async function openBrightDataBrowser(browserUrl: string): Promise<BrowserSession> {
  if (!browserUrl) {
    throw new Error("Bright Data adapter selected but BRIGHTDATA_BROWSER_URL is not set");
  }
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(browserUrl);
  const context = await browser.newContext();
  const page = await context.newPage();
  return {
    page,
    close: async () => {
      await browser.close();
    },
  };
}
