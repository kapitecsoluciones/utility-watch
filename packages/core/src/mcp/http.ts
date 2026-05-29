import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer, type McpDeps } from "./server.ts";
import { renderDashboard } from "./dashboard.ts";

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

/**
 * Start the MCP server over Streamable HTTP (the remote, agent-facing transport).
 * Stateful: a session id is issued on initialize and reused for follow-up requests.
 */
export function startHttpServer(deps: McpDeps, port: number, host = "0.0.0.0") {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // DNS-rebinding / Origin protection for the public deployment. Set
  // MCP_ALLOWED_HOSTS (and optionally MCP_ALLOWED_ORIGINS) to the public host,
  // e.g. "utilitywatch.kapitec.pro". Protection is off only for local dev where
  // neither is set.
  const allowedHosts = (process.env.MCP_ALLOWED_HOSTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const enableDnsRebindingProtection = allowedHosts.length > 0 || allowedOrigins.length > 0;

  // Optional bearer-token auth. When MCP_AUTH_TOKEN is set, every /mcp request
  // must present `Authorization: Bearer <token>`. Left unset, the endpoint is
  // open (intended only for local dev or a synthetic-data demo).
  const authToken = process.env.MCP_AUTH_TOKEN ?? "";

  const httpServer = createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, service: "utility-watch-mcp", version: "0.1.0" }));
        return;
      }
      if (req.method === "GET" && (req.url === "/" || req.url === "/dashboard")) {
        const html = await renderDashboard(deps.pool);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      if (!req.url || !req.url.startsWith("/mcp")) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }
      if (authToken) {
        const provided = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
        if (provided !== authToken) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }
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

      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "invalid MCP request (missing or unknown session)" }));
    } catch (e) {
      process.stderr.write(`[mcp-http] ${(e as Error).stack ?? (e as Error).message}\n`);
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "internal server error" }));
    }
  });

  httpServer.listen(port, host);
  return httpServer;
}
