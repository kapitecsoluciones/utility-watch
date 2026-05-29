#!/usr/bin/env node
import { loadConfig, loadEnvFile, redactedConfig, ConfigError } from "../config/index.ts";
import { createPool } from "../db/index.ts";
import { runMigrations, pendingMigrations } from "../db/migrate.ts";
import { runDoctor } from "../doctor/index.ts";
import { getSetupState } from "../setup/state.ts";
import { createFirstAdmin } from "../services/admin.ts";
import { loadManifestFile } from "../plugins/validate.ts";
import { readRegistry, listInstalled, installProvider } from "../services/providers.ts";
import { createAccount, listAccounts } from "../services/accounts.ts";
import { listBills, getBill } from "../services/bills.ts";
import { reviewBill } from "../services/review.ts";
import { exportBill } from "../services/exporter.ts";
import { executeRun } from "../runner/index.ts";
import { getRunDetail } from "../services/runs.ts";
import { buildMcpServer, DEFAULT_AGENT_CAPABILITIES } from "../mcp/server.ts";
import { startHttpServer } from "../mcp/http.ts";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { migrationsDir, repoRoot } from "../paths.ts";
import { join } from "node:path";
import type { AppConfig } from "../config/index.ts";

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg && arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function loadConfigOrExit(): AppConfig {
  try {
    return loadConfig();
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`Configuration error:\n- ${e.problems.join("\n- ")}\n\nCopy .env.example to .env and adjust.\n`);
      process.exit(2);
    }
    throw e;
  }
}

const SYMBOL = { ok: "✓", warn: "!", fail: "✗" } as const;

async function cmdDoctor(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const checks = await runDoctor(config, pool);
    let failed = false;
    for (const c of checks) {
      if (c.status === "fail") failed = true;
      process.stdout.write(`  ${SYMBOL[c.status]} ${c.name.padEnd(26)} ${c.detail}\n`);
    }
    process.stdout.write(failed ? "\ndoctor: FAIL\n" : "\ndoctor: OK\n");
    return failed ? 1 : 0;
  } finally {
    await pool.end();
  }
}

async function cmdMigrate(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db, { multipleStatements: true });
  try {
    const { applied } = await runMigrations(pool, migrationsDir);
    if (applied.length === 0) process.stdout.write("Migrations already up to date.\n");
    else process.stdout.write(`Applied ${applied.length} migration(s):\n${applied.map((m) => `  - ${m}`).join("\n")}\n`);
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdAdminCreate(flags: Record<string, string | boolean>): Promise<number> {
  const name = String(flags.name ?? process.env.ADMIN_NAME ?? "");
  const email = String(flags.email ?? process.env.ADMIN_EMAIL ?? "");
  const password = String(flags.password ?? process.env.ADMIN_PASSWORD ?? "");
  if (!name || !email || !password) {
    process.stderr.write("Usage: utility-watch admin:create --name <name> --email <email> --password <password>\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const id = await createFirstAdmin(pool, { name, email, password });
    process.stdout.write(`Created first administrator (owner), user id ${id}.\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`admin:create failed: ${(e as Error).message}\n`);
    return 1;
  } finally {
    await pool.end();
  }
}

function cmdConfigShow(): number {
  const config = loadConfigOrExit();
  process.stdout.write(`${JSON.stringify(redactedConfig(config), null, 2)}\n`);
  return 0;
}

async function cmdSetupCheck(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const state = await getSetupState(pool, migrationsDir);
    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    return state.dbReachable && state.pendingMigrations === 0 ? 0 : 1;
  } finally {
    await pool.end();
  }
}

async function cmdSetup(): Promise<number> {
  const config = loadConfigOrExit();
  const migratePool = createPool(config.db, { multipleStatements: true });
  try {
    const pendingBefore = await pendingMigrations(migratePool, migrationsDir);
    if (pendingBefore.length > 0) {
      const { applied } = await runMigrations(migratePool, migrationsDir);
      process.stdout.write(`Applied ${applied.length} migration(s).\n`);
    } else {
      process.stdout.write("Schema already up to date.\n");
    }
    const state = await getSetupState(migratePool, migrationsDir);
    process.stdout.write(`\nSetup state:\n${JSON.stringify(state, null, 2)}\n`);
    if (!state.adminExists) {
      process.stdout.write("\nNext: create the first administrator:\n  utility-watch admin:create --name <name> --email <email> --password <password>\n");
    }
    return 0;
  } finally {
    await migratePool.end();
  }
}

function manifestPathFrom(arg: string): string {
  return arg.endsWith("plugin.json") ? arg : join(arg, "plugin.json");
}

async function cmdProvidersValidate(args: string[]): Promise<number> {
  const target = args[0];
  if (!target) {
    process.stderr.write("Usage: utility-watch providers:validate <plugin-dir | plugin.json>\n");
    return 2;
  }
  const res = await loadManifestFile(manifestPathFrom(target));
  if (res.ok && res.manifest) {
    process.stdout.write(`✓ valid manifest: ${res.manifest.id}@${res.manifest.version} (${res.manifest.name})\n`);
    return 0;
  }
  process.stderr.write(`✗ invalid manifest:\n${res.errors.map((e) => `  - ${e}`).join("\n")}\n`);
  return 1;
}

async function cmdProvidersInstall(args: string[]): Promise<number> {
  const target = args[0];
  if (!target) {
    process.stderr.write("Usage: utility-watch providers:install <plugin-dir>\n");
    return 2;
  }
  const res = await loadManifestFile(manifestPathFrom(target));
  if (!res.ok || !res.manifest) {
    process.stderr.write(`Refusing to install — invalid manifest:\n${res.errors.map((e) => `  - ${e}`).join("\n")}\n`);
    return 1;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    await installProvider(pool, res.manifest);
    process.stdout.write(`Installed provider ${res.manifest.id}@${res.manifest.version} (status: ${res.manifest.quality.status}).\n`);
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdProvidersList(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const registry = await readRegistry();
    let installedIds = new Set<string>();
    try {
      installedIds = new Set((await listInstalled(pool)).map((p) => p.id));
    } catch {
      // DB not migrated yet — show the registry only.
    }
    process.stdout.write("Providers (registry):\n");
    for (const p of registry) {
      const mark = installedIds.has(p.id) ? "[installed]" : "[          ]";
      process.stdout.write(`  ${mark} ${p.id.padEnd(18)} ${p.serviceTypes.join(",").padEnd(20)} ${p.status}\n`);
    }
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdAccountsCreate(flags: Record<string, string | boolean>): Promise<number> {
  const providerId = String(flags.provider ?? "");
  const name = String(flags.name ?? "");
  if (!providerId || !name) {
    process.stderr.write("Usage: utility-watch accounts:create --provider <id> --name <display> [--ref <ref>] [--secret <handle>] [--brightdata]\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const id = await createAccount(pool, {
      providerId,
      displayName: name,
      externalRef: typeof flags.ref === "string" ? flags.ref : undefined,
      secretHandle: typeof flags.secret === "string" ? flags.secret : undefined,
      brightdataAllowed: flags.brightdata === true,
    });
    process.stdout.write(`Created account ${id} for provider ${providerId}.\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`accounts:create failed: ${(e as Error).message}\n`);
    return 1;
  } finally {
    await pool.end();
  }
}

async function cmdAccountsList(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const accounts = await listAccounts(pool);
    if (!accounts.length) process.stdout.write("No accounts. Create one: utility-watch accounts:create ...\n");
    for (const a of accounts) {
      process.stdout.write(`  #${a.id}  ${a.provider_id.padEnd(18)} ${a.display_name}${a.brightdata_allowed ? "  [brightData opt-in]" : ""}\n`);
    }
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdRun(flags: Record<string, string | boolean>): Promise<number> {
  const accountId = Number(flags.account ?? 0);
  if (!accountId) {
    process.stderr.write("Usage: utility-watch run --account <id>\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const outcome = await executeRun(pool, {
      accountId,
      artifactsDir: config.artifactsDir,
      confidenceThreshold: config.reviewConfidenceThreshold,
      brightData: config.brightData,
    });
    process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
    return outcome.status === "failed" ? 1 : 0;
  } catch (e) {
    process.stderr.write(`run failed: ${(e as Error).message}\n`);
    return 1;
  } finally {
    await pool.end();
  }
}

async function cmdRunsShow(args: string[]): Promise<number> {
  const id = Number(args[0] ?? 0);
  if (!id) {
    process.stderr.write("Usage: utility-watch runs:show <run-id>\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const detail = await getRunDetail(pool, id);
    if (!detail) {
      process.stderr.write(`run ${id} not found\n`);
      return 1;
    }
    const { run, artifacts, logs } = detail;
    process.stdout.write(`Run #${run.id}  ${run.provider_id}  adapter=${run.adapter}  status=${run.status}\n`);
    if (run.error_code) process.stdout.write(`  error: ${run.error_code} — ${run.error_message}\n`);
    process.stdout.write(`  artifacts: ${artifacts.length}\n`);
    for (const a of artifacts) process.stdout.write(`    - ${a.type} ${a.path} (sha256 ${String(a.sha256).slice(0, 12)}…)\n`);
    process.stdout.write(`  log:\n`);
    for (const l of logs) process.stdout.write(`    [${l.level}] ${l.event}: ${l.message}\n`);
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdBillsList(flags: Record<string, string | boolean>): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const bills = await listBills(pool, {
      status: typeof flags.status === "string" ? flags.status : undefined,
      dueBefore: typeof flags["due-before"] === "string" ? (flags["due-before"] as string) : undefined,
    });
    if (!bills.length) process.stdout.write("No bills.\n");
    for (const b of bills) {
      process.stdout.write(
        `  #${b.id}  ${b.provider_id.padEnd(16)} due ${b.due_date ?? "?"}  ${b.currency ?? ""} ${b.amount_due ?? "?"}  conf ${b.confidence_score ?? "?"}  ${b.status}\n`,
      );
    }
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdBillsShow(args: string[]): Promise<number> {
  const id = Number(args[0] ?? 0);
  if (!id) {
    process.stderr.write("Usage: utility-watch bills:show <bill-id>\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const bill = await getBill(pool, id);
    if (!bill) {
      process.stderr.write(`bill ${id} not found\n`);
      return 1;
    }
    const normalized = typeof bill.normalized_json === "string" ? JSON.parse(bill.normalized_json) : bill.normalized_json;
    process.stdout.write(`Bill #${bill.id}  status=${bill.status}  review=${bill.review_status ?? "n/a"}\n`);
    process.stdout.write(`${JSON.stringify(normalized, null, 2)}\n`);
    return 0;
  } finally {
    await pool.end();
  }
}

async function cmdBillsReview(args: string[], flags: Record<string, string | boolean>): Promise<number> {
  const id = Number(args[0] ?? 0);
  const approve = flags.approve === true;
  const reject = flags.reject === true;
  if (!id || approve === reject) {
    process.stderr.write("Usage: utility-watch bills:review <bill-id> (--approve | --reject) [--notes <text>]\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const outcome = await reviewBill(pool, id, approve ? "approve" : "reject", {
      notes: typeof flags.notes === "string" ? flags.notes : undefined,
    });
    process.stdout.write(`Bill ${outcome.billId} ${outcome.status}.\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`bills:review failed: ${(e as Error).message}\n`);
    return 1;
  } finally {
    await pool.end();
  }
}

async function cmdBillsExport(args: string[]): Promise<number> {
  const id = Number(args[0] ?? 0);
  if (!id) {
    process.stderr.write("Usage: utility-watch bills:export <bill-id>\n");
    return 2;
  }
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  try {
    const result = await exportBill(pool, id, config.exportsDir);
    process.stderr.write(`Exported to ${result.path}\n`);
    process.stdout.write(`${JSON.stringify(result.payload, null, 2)}\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`bills:export failed: ${(e as Error).message}\n`);
    return 1;
  } finally {
    await pool.end();
  }
}

async function cmdDemoSeed(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db, { multipleStatements: true });
  const seeds = [
    { id: "mock-provider", name: "Demo Account (synthetic)", ref: "DEMO-0001" },
    { id: "sce-us", name: "SCE Demo (synthetic)", ref: "3-001-2345-67" },
    { id: "socalgas-us", name: "SoCalGas Demo (synthetic)", ref: "0123456789" },
  ];
  try {
    await runMigrations(pool, migrationsDir);
    // Optional demo operator (creds from env, never committed). Lets the live
    // dashboard demo human actions without baking a password into the repo.
    const demoEmail = process.env.DEMO_OPERATOR_EMAIL;
    const demoPass = process.env.DEMO_OPERATOR_PASSWORD;
    if (demoEmail && demoPass) {
      try {
        await createFirstAdmin(pool, { name: "Demo Operator", email: demoEmail, password: demoPass });
      } catch {
        /* an admin already exists */
      }
    }
    for (const seed of seeds) {
      const res = await loadManifestFile(join(repoRoot, "plugins", seed.id, "plugin.json"));
      if (res.ok && res.manifest) await installProvider(pool, res.manifest);
      const accounts = await listAccounts(pool);
      let accountId = accounts.find((a) => a.provider_id === seed.id)?.id;
      if (!accountId) {
        accountId = await createAccount(pool, { providerId: seed.id, displayName: seed.name, externalRef: seed.ref });
      }
      const existing = await listBills(pool, { accountId });
      if (!existing.length) {
        await executeRun(pool, {
          accountId,
          artifactsDir: config.artifactsDir,
          confidenceThreshold: config.reviewConfidenceThreshold,
          brightData: config.brightData,
        });
      }
    }
    process.stdout.write(`Demo seeded: ${seeds.map((s) => s.id).join(", ")} (each with an account and a bill).\n`);
    return 0;
  } finally {
    await pool.end();
  }
}

function agentCapabilities(): Set<string> {
  const env = process.env.AGENT_CAPABILITIES;
  const caps = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_AGENT_CAPABILITIES;
  return new Set(caps);
}

async function cmdMcpHttp(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  const port = Number(process.env.MCP_PORT ?? "8080");
  startHttpServer({ pool, config, capabilities: agentCapabilities() }, port);
  process.stderr.write(`utility-watch MCP (Streamable HTTP) listening on :${port}/mcp\n`);
  await new Promise<never>(() => {});
  return 0;
}

async function cmdMcpStdio(): Promise<number> {
  const config = loadConfigOrExit();
  const pool = createPool(config.db);
  const server = buildMcpServer({ pool, config, capabilities: agentCapabilities() });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await new Promise<never>(() => {});
  return 0;
}

function help(): number {
  process.stdout.write(
    [
      "utility-watch — open plugin platform for utility bill retrieval",
      "",
      "Commands:",
      "  setup                 Run migrations and report setup state",
      "  setup:check           Non-interactive environment check (CI/agents)",
      "  doctor                Full health check",
      "  db:migrate            Apply pending migrations",
      "  admin:create          Create the first administrator",
      "  config:show           Print effective config (secrets redacted)",
      "  providers:list        List registry providers and which are installed",
      "  providers:validate    Validate a plugin manifest (<dir | plugin.json>)",
      "  providers:install     Register a plugin into the database (<plugin-dir>)",
      "  accounts:create       Create an account for a provider",
      "  accounts:list         List configured accounts",
      "  run                   Run a retrieval for an account (--account <id>)",
      "  runs:show             Show a run with its artifacts and log (<run-id>)",
      "  bills:list            List normalized bills (--status, --due-before)",
      "  bills:show            Show a normalized bill (<bill-id>)",
      "  bills:review          Approve or reject a bill (--approve|--reject)",
      "  bills:export          Export an approved bill as JSON (<bill-id>)",
      "  mcp                   Start the MCP server over Streamable HTTP (agent face)",
      "  mcp:stdio             Start the MCP server over stdio (local agent)",
      "  demo:seed             Install the mock provider, a demo account, and one bill",
      "",
    ].join("\n"),
  );
  return 0;
}

async function main(): Promise<number> {
  loadEnvFile();
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);
  switch (cmd) {
    case "doctor":
      return cmdDoctor();
    case "db:migrate":
      return cmdMigrate();
    case "admin:create":
      return cmdAdminCreate(flags);
    case "config:show":
      return cmdConfigShow();
    case "providers:list":
      return cmdProvidersList();
    case "providers:validate":
      return cmdProvidersValidate(rest);
    case "providers:install":
      return cmdProvidersInstall(rest);
    case "accounts:create":
      return cmdAccountsCreate(flags);
    case "accounts:list":
      return cmdAccountsList();
    case "run":
      return cmdRun(flags);
    case "runs:show":
      return cmdRunsShow(rest);
    case "bills:list":
      return cmdBillsList(flags);
    case "bills:show":
      return cmdBillsShow(rest);
    case "bills:review":
      return cmdBillsReview(rest, flags);
    case "bills:export":
      return cmdBillsExport(rest);
    case "mcp":
      return cmdMcpHttp();
    case "mcp:stdio":
      return cmdMcpStdio();
    case "demo:seed":
      return cmdDemoSeed();
    case "setup:check":
      return cmdSetupCheck();
    case "setup":
      return cmdSetup();
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return help();
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n`);
      help();
      return 2;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(`Fatal: ${(e as Error).stack ?? (e as Error).message}\n`);
    process.exit(1);
  });
