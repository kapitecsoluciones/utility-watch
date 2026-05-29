import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer, type McpDeps } from "./server.ts";

async function readJson(req: IncomingMessage): Promise<unknown> {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : undefined;
}

/**
 * Start the MCP server over Streamable HTTP (the remote, agent-facing transport).
 * Stateful: a session id is issued on initialize and reused for follow-up requests.
 */
export function startHttpServer(deps: McpDeps, port: number, host = "0.0.0.0") {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, service: "utility-watch-mcp", version: "0.1.0" }));
        return;
      }
      if (!req.url || !req.url.startsWith("/mcp")) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (req.method === "POST") {
        const body = await readJson(req);
        if (!transport) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports.set(sid, transport as StreamableHTTPServerTransport);
            },
          });
          transport.onclose = () => {
            const sid = transport?.sessionId;
            if (sid) transports.delete(sid);
          };
          const server = buildMcpServer(deps);
          await server.connect(transport);
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
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
  });

  httpServer.listen(port, host);
  return httpServer;
}
