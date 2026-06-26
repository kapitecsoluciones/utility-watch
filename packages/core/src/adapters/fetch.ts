import { lookup } from "node:dns/promises";
import type { RawBillArtifact } from "../plugins/contract.ts";

const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 15000;

/** Block loopback, private, link-local (incl. cloud metadata), CGNAT, and
 *  unspecified addresses. Exported for unit testing. */
export function isBlockedIp(ip: string): boolean {
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("0.")) return true; // 0.0.0.0/8 ("this network", incl. 0.0.0.0)
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./.test(ip)) return true; // 100.64.0.0/10 carrier-grade NAT
  const lower = ip.toLowerCase();
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true; // link-local + unique-local IPv6
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    if (mapped.includes(".")) return isBlockedIp(mapped); // dotted-quad IPv4-mapped (the form Node's DNS returns)
    return true; // hex-form IPv4-mapped never comes from dns.lookup — fail closed rather than mis-decode
  }
  return false;
}

/** True when `host` is permitted by the provider's declared network allowlist.
 *  An empty allowlist permits any host (the resolved-IP guard still applies).
 *  Exported so the Bright Data fetch path can enforce the same allowlist. */
export function hostAllowed(host: string, allowedHosts: string[]): boolean {
  if (!allowedHosts.length) return true; // no allowlist declared → only the IP guard applies
  return allowedHosts.some((h) => {
    const pat = h.replace(/^\*\./, "");
    return host === h || host === pat || host.endsWith("." + pat);
  });
}

/**
 * SSRF-guarded server-side fetch of a public URL for declarative providers.
 * https/http only; the resolved IP must be public; if the provider declares
 * network hosts, the URL host must match. Bounded by timeout + size.
 */
export async function fetchArtifact(rawUrl: string, opts: { allowedHosts?: string[] } = {}): Promise<RawBillArtifact> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("only http(s) URLs are allowed");
  if (!hostAllowed(u.hostname, opts.allowedHosts ?? [])) {
    throw new Error("URL host is not in the provider's declared network allowlist");
  }
  const resolved = await lookup(u.hostname, { all: true }).catch(() => []);
  if (!resolved.length) throw new Error("could not resolve host");
  for (const r of resolved) if (isBlockedIp(r.address)) throw new Error("URL resolves to a blocked (private/loopback) address");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u.toString(), { signal: ctrl.signal, redirect: "error", headers: { "user-agent": "utility-watch/0.1" } });
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FETCH_BYTES) throw new Error("fetched body too large");
    const content = buf.toString("utf8");
    const contentType: RawBillArtifact["contentType"] = ct.includes("json") ? "json" : ct.includes("html") ? "html" : "text";
    return { content, contentType, sourceUrl: u.toString() };
  } finally {
    clearTimeout(timer);
  }
}
