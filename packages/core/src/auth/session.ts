import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Per-process fallback secret if SESSION_SECRET is unset (sessions then reset on
// restart — fine for a demo; set SESSION_SECRET for stable sessions).
const FALLBACK_SECRET = randomBytes(32).toString("hex");

function secret(): string {
  return process.env.SESSION_SECRET || FALLBACK_SECRET;
}

const TTL_MS = 12 * 60 * 60 * 1000; // 12h

/** Signed, expiring session token: base64url(userId.expiry).hmac */
export function signSession(userId: number, ttlMs = TTL_MS): string {
  const payload = `${userId}.${Date.now() + ttlMs}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifySession(token: string | undefined): number | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [idStr, expStr] = payload.split(".");
  const id = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isInteger(id) || !Number.isFinite(exp) || Date.now() > exp) return null;
  return id;
}

/** Parse a Cookie header into a map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw; // malformed percent-encoding — keep raw, don't crash
    }
  }
  return out;
}
