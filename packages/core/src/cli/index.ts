#!/usr/bin/env node
import { loadConfig, loadEnvFile, redactedConfig, ConfigError } from "../config/index.ts";
import { createPool } from "../db/index.ts";
import { runMigrations, pendingMigrations } from "../db/migrate.ts";
import { runDoctor } from "../doctor/index.ts";
import { getSetupState } from "../setup/state.ts";
import { createFirstAdmin } from "../services/admin.ts";
import { migrationsDir } from "../paths.ts";
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
