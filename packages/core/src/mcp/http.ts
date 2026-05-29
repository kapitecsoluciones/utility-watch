import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer, type McpDeps } from "./server.ts";
import { renderDashboard } from "./dashboard.ts";
import { parseCookies, signSession, verifySession } from "../auth/session.ts";
import { verifyPassword } from "../auth/password.ts";
import { getUserByEmail, getUserById, getCapabilities, listUsers, createUser } from "../services/users.ts";
import { readRegistry, listInstalled, getRegistryProvider, installProvider } from "../services/providers.ts";
import { listAccounts, createAccount } from "../services/accounts.ts";
import { listBills } from "../services/bills.ts";
import { listRuns } from "../services/runs.ts";
import { reportSummary } from "../services/reports.ts";
import { loadManifestFile } from "../plugins/validate.ts";
import { repoRoot } from "../paths.ts";
import { join } from "node:path";
import { executeRun } from "../runner/index.ts";
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

      if (req.method === "GET" && url === "/health") {
        return json(res, 200, { ok: true, service: "utility-watch-mcp", version: "0.1.0" });
      }

      if (req.method === "GET" && (url === "/" || url === "/dashboard")) {
        const operator = await operatorFrom(req);
        const html = await renderDashboard(deps.pool, operator);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return void res.end(html);
      }

      // ---- Operator auth ----
      if (req.method === "POST" && url === "/login") {
        const body = (await readJson(req)) as { email?: string; password?: string } | undefined;
        const user = body?.email ? await getUserByEmail(deps.pool, body.email) : null;
        if (!user || user.status !== "active" || !body?.password || !verifyPassword(body.password, user.password_hash)) {
          return json(res, 401, { ok: false, error: "invalid credentials" });
        }
        const cookie = `uw_session=${signSession(user.id)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${secure ? "; Secure" : ""}`;
        res.writeHead(200, { "content-type": "application/json", "set-cookie": cookie });
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

        if (req.method === "GET") {
          if (url === "/api/overview") return json(res, 200, await reportSummary(deps.pool));
          if (url === "/api/providers") {
            const registry = await readRegistry();
            const installed = new Set((await listInstalled(deps.pool)).map((p) => p.id));
            return json(res, 200, registry.map((p) => ({ ...p, installed: installed.has(p.id) })));
          }
          if (url === "/api/accounts") {
            const accts = await listAccounts(deps.pool);
            return json(res, 200, accts.map((a) => ({ id: a.id, provider: a.provider_id, displayName: a.display_name, ref: a.external_account_ref, brightDataAllowed: Boolean(a.brightdata_allowed), status: a.status })));
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

          if (url === "/api/providers/install") {
            if (!need("providers.install")) return json(res, 403, { ok: false, error: "missing capability providers.install" });
            const id = String(body.id ?? "");
            const reg = await getRegistryProvider(id);
            if (!reg) return json(res, 400, { ok: false, error: "unknown provider id" });
            const m = await loadManifestFile(join(repoRoot, reg.package ?? `plugins/${id}`, "plugin.json"));
            if (!m.ok || !m.manifest) return json(res, 400, { ok: false, error: `invalid manifest: ${m.errors.join("; ")}` });
            await installProvider(deps.pool, m.manifest);
            return json(res, 200, { ok: true, id });
          }
          if (url === "/api/accounts") {
            if (!need("accounts.create")) return json(res, 403, { ok: false, error: "missing capability accounts.create" });
            const providerId = String(body.providerId ?? "");
            const displayName = String(body.displayName ?? "");
            if (!providerId || !displayName) return json(res, 400, { ok: false, error: "providerId and displayName required" });
            try {
              const accId = await createAccount(deps.pool, { providerId, displayName, externalRef: body.ref ? String(body.ref) : undefined });
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
            try {
              const uid = await createUser(deps.pool, { name, email, password, roleCode });
              return json(res, 200, { ok: true, id: uid });
            } catch (e) {
              return json(res, 400, { ok: false, error: (e as Error).message });
            }
          }
          if (url === "/api/actions/run") {
            if (!need("jobs.run")) return json(res, 403, { ok: false, error: "missing capability jobs.run" });
            const accountId = Number(body.accountId);
            if (!accountId) return json(res, 400, { ok: false, error: "accountId required" });
            const outcome = await executeRun(deps.pool, { accountId, artifactsDir: deps.config.artifactsDir, confidenceThreshold: deps.config.reviewConfidenceThreshold, brightData: deps.config.brightData });
            return json(res, 200, { ok: true, outcome });
          }
          if (url === "/api/actions/review") {
            if (!need("bills.review")) return json(res, 403, { ok: false, error: "missing capability bills.review" });
            const billId = Number(body.billId);
            const decision = body.decision === "reject" ? "reject" : "approve";
            if (!billId) return json(res, 400, { ok: false, error: "billId required" });
            const outcome = await reviewBill(deps.pool, billId, decision, { reviewer: op.email });
            return json(res, 200, { ok: true, outcome });
          }
          if (url === "/api/actions/export") {
            if (!need("bills.export")) return json(res, 403, { ok: false, error: "missing capability bills.export" });
            const billId = Number(body.billId);
            if (!billId) return json(res, 400, { ok: false, error: "billId required" });
            const result = await exportBill(deps.pool, billId, deps.config.exportsDir);
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
