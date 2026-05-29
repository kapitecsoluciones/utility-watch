import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer, type McpDeps } from "./server.ts";
import { renderDashboard } from "./dashboard.ts";
import { renderLanding } from "./landing.ts";
import { readFile } from "node:fs/promises";
import { parseCookies, signSession, verifySession } from "../auth/session.ts";
import { verifyPassword, hashPassword } from "../auth/password.ts";
import { getUserByEmail, getUserById, getCapabilities, listUsers, createUser } from "../services/users.ts";
import { readRegistry, listInstalled, getRegistryProvider, installProvider } from "../services/providers.ts";
import { listAccounts, createAccount } from "../services/accounts.ts";
import { listBills } from "../services/bills.ts";
import { listRuns } from "../services/runs.ts";
import { reportSummary } from "../services/reports.ts";
import { loadManifestFile, validateManifest } from "../plugins/validate.ts";
import { logAudit, listAudit } from "../services/audit.ts";
import { listProperties, createProperty } from "../services/properties.ts";
import { listObligations, getObligation, setObligationMeta, financialKpis, providerHealth } from "../services/obligations.ts";
import { addPayment } from "../services/payments.ts";
import { repoRoot, coreRoot } from "../paths.ts";
import { join, resolve } from "node:path";

// Dummy hash so login does equal work whether or not the email exists (anti-enumeration).
const DUMMY_HASH = hashPassword(randomUUID());
const posInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Best-effort client IP (honours a single reverse proxy hop). */
function clientIp(req: IncomingMessage): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff) return (xff.split(",")[0] ?? "").trim();
  return req.socket.remoteAddress ?? null;
}

// In-memory login throttle (single-instance). Locks an email+IP pair after repeated failures.
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { fails: number; until: number }>();

/** Returns a human message if the password is too weak, else null. */
function passwordIssue(pw: string): string | null {
  if (pw.length < 10) return "password must be at least 10 characters";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "password must include a lowercase letter, an uppercase letter, and a digit";
  }
  return null;
}
import { executeRun, ingestArtifact } from "../runner/index.ts";
import { reviewBill } from "../services/review.ts";
import { exportBill } from "../services/exporter.ts";

const MAX_BODY_BYTES = 256 * 1024;

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("request body too large");
    chunks.push(chunk as Buffer);
  }
  const data = Buffer.concat(chunks).toString("utf8");
  return data ? JSON.parse(data) : undefined;
}

function json(res: ServerResponse, code: number, obj: unknown): void {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

export interface Operator {
  id: number;
  name: string;
  email: string;
  capabilities: Set<string>;
}

/**
 * Start the platform HTTP server: a public read-only dashboard, an operator
 * login + capability-gated human actions, and the agent-facing MCP transport.
 */
export function startHttpServer(deps: McpDeps, port: number, host = "0.0.0.0") {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const enableDnsRebindingProtection = allowedHosts.length > 0 || allowedOrigins.length > 0;
  const authToken = process.env.MCP_AUTH_TOKEN ?? "";
  const secure = allowedHosts.length > 0; // behind HTTPS in production

  async function operatorFrom(req: IncomingMessage): Promise<Operator | null> {
    const id = verifySession(parseCookies(req.headers.cookie).uw_session);
    if (!id) return null;
    const user = await getUserById(deps.pool, id);
    if (!user || user.status !== "active") return null;
    return { id: user.id, name: user.name, email: user.email, capabilities: await getCapabilities(deps.pool, id) };
  }

  const httpServer = createServer(async (req, res) => {
    try {
      const url = req.url ?? "/";
      const path = url.split("?")[0] ?? "/";

      if (req.method === "GET" && path === "/health") {
        return json(res, 200, { ok: true, service: "utility-watch-mcp", version: "0.1.0" });
      }

      if (req.method === "GET" && path === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return void res.end(renderLanding());
      }
      if (req.method === "GET" && (path === "/console" || path === "/dashboard")) {
        const operator = await operatorFrom(req);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return void res.end(await renderDashboard(deps.pool, operator));
      }
      if (req.method === "GET" && path === "/logo.png") {
        try {
          const buf = await readFile(join(coreRoot, "assets", "logo.png"));
          res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=86400" });
          return void res.end(buf);
        } catch {
          return json(res, 404, { error: "not found" });
        }
      }

      // ---- Operator auth ----
      if (req.method === "POST" && url === "/login") {
        const ip = clientIp(req);
        const body = (await readJson(req)) as { email?: string; password?: string } | undefined;
        const throttleKey = `${(body?.email ?? "").toLowerCase()}|${ip ?? ""}`;
        const now = Date.now();
        const rec = loginAttempts.get(throttleKey);
        if (rec && rec.until > now) {
          await logAudit(deps.pool, { actor: body?.email ?? null, action: "login.locked", outcome: "deny", ip, targetType: "session" });
          return json(res, 429, { ok: false, error: "too many attempts; try again later" });
        }
        const user = body?.email ? await getUserByEmail(deps.pool, body.email) : null;
        const hash = user && user.status === "active" ? user.password_hash : DUMMY_HASH;
        const okPw = body?.password ? verifyPassword(body.password, hash) : false;
        if (!user || user.status !== "active" || !okPw) {
          // accumulate across attempts; reset only after a prior lock window has expired
          const prevFails = rec && !(rec.until && rec.until <= now) ? rec.fails : 0;
          const fails = prevFails + 1;
          loginAttempts.set(throttleKey, { fails, until: fails >= LOGIN_MAX_FAILS ? now + LOGIN_LOCK_MS : 0 });
          await logAudit(deps.pool, { actor: body?.email ?? null, action: "login.fail", outcome: "fail", ip, targetType: "session", detail: { fails } });
          return json(res, 401, { ok: false, error: "invalid credentials" });
        }
        loginAttempts.delete(throttleKey);
        const csrf = randomUUID();
        const base = `Path=/; SameSite=Strict${secure ? "; Secure" : ""}`;
        const cookies = [
          `uw_session=${signSession(user.id)}; HttpOnly; Max-Age=43200; ${base}`,
          `uw_csrf=${csrf}; Max-Age=43200; ${base}`, // readable by the SPA for the double-submit header
        ];
        await logAudit(deps.pool, { actor: user.email, action: "login.success", ip, targetType: "session", targetId: user.id });
        res.writeHead(200, { "content-type": "application/json", "set-cookie": cookies });
        return void res.end(JSON.stringify({ ok: true, name: user.name }));
      }
      if (req.method === "POST" && url === "/logout") {
        res.writeHead(200, { "content-type": "application/json", "set-cookie": "uw_session=; HttpOnly; Path=/; Max-Age=0" });
        return void res.end(JSON.stringify({ ok: true }));
      }
      if (req.method === "GET" && url === "/api/me") {
        const op = await operatorFrom(req);
        return json(res, 200, op ? { authenticated: true, name: op.name, capabilities: [...op.capabilities] } : { authenticated: false });
      }

      // ---- Management API (operator session required) ----
      if (url.startsWith("/api/")) {
        const op = await operatorFrom(req);
        if (!op) return json(res, 401, { ok: false, error: "operator login required" });
        const need = (cap: string) => op.capabilities.has(cap);
        const ip = clientIp(req);

        // CSRF: double-submit. Mutating requests must echo the readable uw_csrf cookie in a header.
        if (req.method !== "GET" && req.method !== "HEAD") {
          const cookieTok = parseCookies(req.headers.cookie).uw_csrf;
          const headerTok = (req.headers["x-csrf-token"] as string | undefined) ?? "";
          if (!cookieTok || headerTok !== cookieTok) {
            await logAudit(deps.pool, { actor: op.email, action: "csrf.reject", outcome: "deny", ip, detail: { path: url } });
            return json(res, 403, { ok: false, error: "missing or invalid CSRF token" });
          }
        }

        if (req.method === "GET") {
          if (url === "/api/audit") {
            if (!need("users.manage")) return json(res, 403, { ok: false, error: "missing capability users.manage" });
            return json(res, 200, await listAudit(deps.pool, 200));
          }
          if (url === "/api/mcp-token") {
            if (!need("users.manage")) return json(res, 403, { ok: false, error: "missing capability users.manage" });
            return json(res, 200, { enabled: Boolean(authToken), token: authToken || null });
          }
          if (path === "/api/export.csv") {
            const today = new Date().toISOString().slice(0, 10);
            const obs = await listObligations(deps.pool, {}, today);
            const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
            const header = ["provider", "account_ref", "property", "category", "current_balance", "currency", "due_date", "status", "account_type", "payment_method"];
            const lines = [header.join(",")];
            for (const o of obs) lines.push([o.provider_id, o.account_ref, o.property_name, o.category_name, o.current_balance, o.currency, o.current_due_date, o.status, o.account_type, o.payment_method].map(esc).join(","));
            res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="utility-watch-${today}.csv"` });
            return void res.end(lines.join("\n"));
          }
          if (path === "/api/kpis") return json(res, 200, await financialKpis(deps.pool, new Date().toISOString().slice(0, 10)));
          if (path === "/api/health") return json(res, 200, await providerHealth(deps.pool));
          if (path === "/api/properties") return json(res, 200, await listProperties(deps.pool));
          if (path === "/api/obligations") {
            const q = new URL(url, "http://x").searchParams;
            const today = new Date().toISOString().slice(0, 10);
            return json(res, 200, await listObligations(deps.pool, {
              propertyId: q.get("property") ? Number(q.get("property")) : undefined,
              categoryId: q.get("category") ? Number(q.get("category")) : undefined,
              status: q.get("status") || undefined,
              search: q.get("search") || undefined,
              sort: q.get("sort") || undefined,
              order: q.get("order") === "DESC" ? "DESC" : "ASC",
            }, today));
          }
          {
            const m = path.match(/^\/api\/obligations\/(\d+)$/);
            if (m) {
              const today = new Date().toISOString().slice(0, 10);
              const o = await getObligation(deps.pool, Number(m[1]), today);
              return o ? json(res, 200, o) : json(res, 404, { ok: false, error: "obligation not found" });
            }
          }
          if (url === "/api/overview") return json(res, 200, await reportSummary(deps.pool));
          if (url === "/api/providers") {
            const registry = await readRegistry();
            const installedList = await listInstalled(deps.pool);
            const byId = new Map(installedList.map((p) => [p.id, p]));
            const regIds = new Set(registry.map((r) => r.id));
            const out = registry.map((p) => ({ ...p, installed: byId.has(p.id), kind: byId.get(p.id)?.kind ?? "code" }));
            // declarative providers registered via the UI live only in the DB (not the static registry)
            for (const p of installedList) {
              if (!regIds.has(p.id)) {
                out.push({ id: p.id, name: p.name, country: p.country, serviceTypes: [p.utility_type], status: p.registry_status, verification: "fixture-only", brightData: "n/a", installed: true, kind: p.kind });
              }
            }
            return json(res, 200, out);
          }
          if (url === "/api/accounts") {
            const accts = await listAccounts(deps.pool);
            const kindById = new Map((await listInstalled(deps.pool)).map((p) => [p.id, p.kind]));
            return json(res, 200, accts.map((a) => ({ id: a.id, provider: a.provider_id, kind: kindById.get(a.provider_id) ?? "code", displayName: a.display_name, ref: a.external_account_ref, brightDataAllowed: Boolean(a.brightdata_allowed), status: a.status, fetchUrl: a.fetch_url })));
          }
          if (url === "/api/bills") return json(res, 200, await listBills(deps.pool, {}));
          if (url === "/api/runs") return json(res, 200, await listRuns(deps.pool));
          if (url === "/api/users") {
            if (!need("users.manage")) return json(res, 403, { ok: false, error: "missing capability users.manage" });
            return json(res, 200, await listUsers(deps.pool));
          }
          return json(res, 404, { ok: false, error: "unknown resource" });
        }

        if (req.method === "POST") {
          const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;

          if (path === "/api/properties") {
            if (!need("accounts.create")) return json(res, 403, { ok: false, error: "missing capability accounts.create" });
            const name = String(body.name ?? "").trim();
            if (!name) return json(res, 400, { ok: false, error: "name required" });
            const id = await createProperty(deps.pool, { name, address: body.address ? String(body.address) : undefined, type: body.type ? String(body.type) : undefined, notes: body.notes ? String(body.notes) : undefined });
            await logAudit(deps.pool, { actor: op.email, action: "property.create", ip, targetType: "property", targetId: id });
            return json(res, 200, { ok: true, id });
          }
          {
            const m = path.match(/^\/api\/obligations\/(\d+)$/);
            if (m) {
              if (!need("accounts.create")) return json(res, 403, { ok: false, error: "missing capability accounts.create" });
              await setObligationMeta(deps.pool, Number(m[1]), body);
              await logAudit(deps.pool, { actor: op.email, action: "obligation.update", ip, targetType: "obligation", targetId: m[1], detail: Object.keys(body) });
              return json(res, 200, { ok: true });
            }
          }
          if (path === "/api/payments") {
            if (!need("bills.review")) return json(res, 403, { ok: false, error: "missing capability bills.review" });
            const obligationId = posInt(body.obligationId);
            const amount = Number(body.amount);
            if (!obligationId || !(amount > 0)) return json(res, 400, { ok: false, error: "valid obligationId and positive amount required" });
            const today = new Date().toISOString().slice(0, 10);
            const result = await addPayment(deps.pool, { obligationId, amount, paymentDate: typeof body.paymentDate === "string" && body.paymentDate ? body.paymentDate : today, paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined, notes: body.notes ? String(body.notes) : undefined });
            await logAudit(deps.pool, { actor: op.email, action: "payment.add", ip, targetType: "obligation", targetId: obligationId, detail: { amount, newBalance: result.newBalance } });
            return json(res, 200, { ok: true, ...result });
          }

          if (url === "/api/providers/install") {
            if (!need("providers.install")) return json(res, 403, { ok: false, error: "missing capability providers.install" });
            const id = String(body.id ?? "");
            if (!SLUG.test(id)) return json(res, 400, { ok: false, error: "invalid provider id" });
            const reg = await getRegistryProvider(id);
            if (!reg) return json(res, 400, { ok: false, error: "unknown provider id" });
            const pkgDir = resolve(repoRoot, reg.package ?? `plugins/${id}`);
            if (pkgDir !== resolve(repoRoot) && !pkgDir.startsWith(resolve(repoRoot) + "/")) {
              return json(res, 400, { ok: false, error: "invalid package path" });
            }
            const m = await loadManifestFile(join(pkgDir, "plugin.json"));
            if (!m.ok || !m.manifest) return json(res, 400, { ok: false, error: `invalid manifest: ${m.errors.join("; ")}` });
            await installProvider(deps.pool, m.manifest);
            await logAudit(deps.pool, { actor: op.email, action: "provider.install", ip, targetType: "provider", targetId: id });
            return json(res, 200, { ok: true, id });
          }
          if (url === "/api/providers/register") {
            if (!need("providers.install")) return json(res, 403, { ok: false, error: "missing capability providers.install" });
            let parsed: unknown;
            try {
              parsed = typeof body.manifest === "string" ? JSON.parse(body.manifest) : body.manifest;
            } catch {
              return json(res, 400, { ok: false, error: "manifest must be valid JSON" });
            }
            const v = validateManifest(parsed);
            if (!v.ok || !v.manifest) return json(res, 400, { ok: false, error: `invalid manifest:\n- ${v.errors.join("\n- ")}` });
            if (v.manifest.kind !== "declarative") return json(res, 400, { ok: false, error: "register accepts only declarative providers (code providers ship through the repo)" });
            await installProvider(deps.pool, v.manifest);
            await logAudit(deps.pool, { actor: op.email, action: "provider.register", ip, targetType: "provider", targetId: v.manifest.id, detail: { kind: "declarative" } });
            return json(res, 200, { ok: true, id: v.manifest.id });
          }
          if (url === "/api/actions/ingest") {
            if (!need("jobs.run")) return json(res, 403, { ok: false, error: "missing capability jobs.run" });
            const accountId = posInt(body.accountId);
            if (!accountId) return json(res, 400, { ok: false, error: "valid accountId required" });
            const outcome = await ingestArtifact(deps.pool, {
              accountId,
              content: typeof body.content === "string" ? body.content : undefined,
              contentType: body.contentType === "json" || body.contentType === "html" ? body.contentType : "text",
              url: typeof body.url === "string" && body.url ? body.url : undefined,
              artifactsDir: deps.config.artifactsDir,
              confidenceThreshold: deps.config.reviewConfidenceThreshold,
              brightData: deps.config.brightData,
            });
            await logAudit(deps.pool, { actor: op.email, action: "bill.ingest", ip, targetType: "account", targetId: accountId, detail: { source: body.url ? "fetch" : "upload", billId: outcome.billId } });
            return json(res, 200, { ok: true, outcome });
          }
          if (url === "/api/accounts") {
            if (!need("accounts.create")) return json(res, 403, { ok: false, error: "missing capability accounts.create" });
            const providerId = String(body.providerId ?? "");
            const displayName = String(body.displayName ?? "");
            if (!providerId || !displayName) return json(res, 400, { ok: false, error: "providerId and displayName required" });
            try {
              const accId = await createAccount(deps.pool, { providerId, displayName, externalRef: body.ref ? String(body.ref) : undefined });
              await logAudit(deps.pool, { actor: op.email, action: "account.create", ip, targetType: "account", targetId: accId, detail: { providerId } });
              return json(res, 200, { ok: true, id: accId });
            } catch (e) {
              return json(res, 400, { ok: false, error: (e as Error).message });
            }
          }
          if (url === "/api/users") {
            if (!need("users.manage")) return json(res, 403, { ok: false, error: "missing capability users.manage" });
            const name = String(body.name ?? "");
            const email = String(body.email ?? "");
            const password = String(body.password ?? "");
            const roleCode = String(body.roleCode ?? "operator");
            if (!name || !email || !password) return json(res, 400, { ok: false, error: "name, email, password required" });
            const pwIssue = passwordIssue(password);
            if (pwIssue) return json(res, 400, { ok: false, error: pwIssue });
            try {
              const uid = await createUser(deps.pool, { name, email, password, roleCode });
              await logAudit(deps.pool, { actor: op.email, action: "user.create", ip, targetType: "user", targetId: uid, detail: { email, roleCode } });
              return json(res, 200, { ok: true, id: uid });
            } catch (e) {
              return json(res, 400, { ok: false, error: (e as Error).message });
            }
          }
          if (url === "/api/actions/run") {
            if (!need("jobs.run")) return json(res, 403, { ok: false, error: "missing capability jobs.run" });
            const accountId = posInt(body.accountId);
            if (!accountId) return json(res, 400, { ok: false, error: "valid accountId required" });
            const outcome = await executeRun(deps.pool, { accountId, artifactsDir: deps.config.artifactsDir, confidenceThreshold: deps.config.reviewConfidenceThreshold, brightData: deps.config.brightData, secretsKey: deps.config.secretsKey });
            await logAudit(deps.pool, { actor: op.email, action: "bill.run", ip, targetType: "account", targetId: accountId, detail: { billId: outcome.billId, status: outcome.status } });
            return json(res, 200, { ok: true, outcome });
          }
          if (url === "/api/actions/review") {
            if (!need("bills.review")) return json(res, 403, { ok: false, error: "missing capability bills.review" });
            const billId = posInt(body.billId);
            const decision = body.decision === "reject" ? "reject" : "approve";
            if (!billId) return json(res, 400, { ok: false, error: "valid billId required" });
            const outcome = await reviewBill(deps.pool, billId, decision, { reviewer: op.email });
            await logAudit(deps.pool, { actor: op.email, action: `bill.${decision}`, ip, targetType: "bill", targetId: billId });
            return json(res, 200, { ok: true, outcome });
          }
          if (url === "/api/actions/export") {
            if (!need("bills.export")) return json(res, 403, { ok: false, error: "missing capability bills.export" });
            const billId = posInt(body.billId);
            if (!billId) return json(res, 400, { ok: false, error: "valid billId required" });
            const result = await exportBill(deps.pool, billId, deps.config.exportsDir);
            await logAudit(deps.pool, { actor: op.email, action: "bill.export", ip, targetType: "bill", targetId: billId, detail: { path: result.path } });
            return json(res, 200, { ok: true, path: result.path });
          }
          return json(res, 404, { ok: false, error: "unknown resource" });
        }
        return json(res, 405, { ok: false, error: "method not allowed" });
      }

      // ---- MCP (agent transport) ----
      if (!url.startsWith("/mcp")) {
        return json(res, 404, { error: "not found" });
      }
      if (authToken) {
        const provided = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
        if (provided !== authToken) return json(res, 401, { error: "unauthorized" });
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (req.method === "POST") {
        const body = await readJson(req);
        if (!transport) {
          const server = buildMcpServer(deps);
          const t = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableDnsRebindingProtection,
            allowedHosts,
            allowedOrigins,
            onsessioninitialized: (sid) => {
              transports.set(sid, t);
            },
          });
          t.onclose = () => {
            const sid = t.sessionId;
            if (sid) transports.delete(sid);
            server.close().catch(() => {});
          };
          await server.connect(t);
          transport = t;
        }
        await transport.handleRequest(req, res, body);
        return;
      }
      if ((req.method === "GET" || req.method === "DELETE") && transport) {
        await transport.handleRequest(req, res);
        return;
      }
      return json(res, 400, { error: "invalid MCP request (missing or unknown session)" });
    } catch (e) {
      process.stderr.write(`[mcp-http] ${(e as Error).stack ?? (e as Error).message}\n`);
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "internal server error" }));
    }
  });

  httpServer.listen(port, host);
  return httpServer;
}
