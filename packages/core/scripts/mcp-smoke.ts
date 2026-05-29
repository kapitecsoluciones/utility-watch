// Smoke test for the Utility Watch MCP server over Streamable HTTP.
// Usage: MCP_URL=http://127.0.0.1:8765/mcp node --import tsx packages/core/scripts/mcp-smoke.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL ?? "http://127.0.0.1:8765/mcp";
const transport = new StreamableHTTPClientTransport(new URL(url));
const client = new Client({ name: "uw-smoke", version: "0.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));

async function call(name: string, args: Record<string, unknown> = {}) {
  const r = (await client.callTool({ name, arguments: args })) as {
    content?: { type: string; text?: string }[];
    isError?: boolean;
  };
  const text = r.content?.[0]?.text ?? JSON.stringify(r);
  console.log(`\n== ${name}(${JSON.stringify(args)})${r.isError ? " [isError]" : ""} ==\n${text.slice(0, 500)}`);
}

await call("list_providers");
await call("list_accounts");
await call("run_retrieval", { account_id: 1 });
await call("export_bill", { bill_id: 1 }); // expect denied with default agent capabilities
await call("get_bill", { bill_id: 1 });
await call("diagnose_run", { run_id: 1 });

await client.close();
process.exit(0);
