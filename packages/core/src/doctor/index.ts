import { access, constants, mkdir, readFile } from "node:fs/promises";
import type { Pool } from "mysql2/promise";
import type { AppConfig } from "../config/index.ts";
import { pendingMigrations } from "../db/migrate.ts";
import { registryFile, migrationsDir } from "../paths.ts";

export interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

/** Full environment health check (PLAN.md §15 doctor). Never throws. */
export async function runDoctor(config: AppConfig, pool: Pool): Promise<Check[]> {
  const checks: Check[] = [];

  const major = Number(process.versions.node.split(".")[0] ?? "0");
  checks.push({
    name: "Node.js >= 22",
    status: major >= 22 ? "ok" : "fail",
    detail: `node ${process.versions.node}`,
  });

  for (const [label, target] of [
    ["artifacts dir writable", config.artifactsDir],
    ["exports dir writable", config.exportsDir],
  ] as const) {
    try {
      await mkdir(target, { recursive: true });
      await access(target, constants.W_OK);
      checks.push({ name: label, status: "ok", detail: target });
    } catch (e) {
      checks.push({ name: label, status: "fail", detail: `${target}: ${(e as Error).message}` });
    }
  }

  try {
    JSON.parse(await readFile(registryFile, "utf8"));
    checks.push({ name: "registry readable", status: "ok", detail: registryFile });
  } catch (e) {
    checks.push({ name: "registry readable", status: "fail", detail: `${registryFile}: ${(e as Error).message}` });
  }

  let dbReachable = false;
  try {
    await pool.query("SELECT 1");
    dbReachable = true;
    checks.push({
      name: "database reachable",
      status: "ok",
      detail: `${config.db.host}:${config.db.port}/${config.db.database}`,
    });
  } catch (e) {
    checks.push({ name: "database reachable", status: "fail", detail: (e as Error).message });
  }

  if (dbReachable) {
    try {
      const pending = await pendingMigrations(pool, migrationsDir);
      checks.push({
        name: "migrations",
        status: pending.length === 0 ? "ok" : "warn",
        detail: pending.length === 0 ? "all applied" : `${pending.length} pending — run: utility-watch db:migrate`,
      });
    } catch (e) {
      checks.push({ name: "migrations", status: "warn", detail: (e as Error).message });
    }
  }

  if (config.brightData.enabled) {
    const configured = Boolean(config.brightData.apiKey || config.brightData.browserUrl);
    checks.push({
      name: "Bright Data config",
      status: configured ? "ok" : "fail",
      detail: configured ? "enabled and configured" : "enabled but no API key / browser URL set",
    });
  } else {
    checks.push({ name: "Bright Data", status: "ok", detail: "disabled (default)" });
  }

  return checks;
}
