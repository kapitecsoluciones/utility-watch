import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import { repoRoot } from "../paths.ts";

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface BrightDataConfig {
  enabled: boolean;
  apiKey: string;
  browserUrl: string;
  zone: string;
  country: string;
}

export interface AppConfig {
  db: DbConfig;
  artifactsDir: string;
  exportsDir: string;
  appBaseUrl: string;
  installType: string;
  logLevel: string;
  reviewConfidenceThreshold: number;
  brightData: BrightDataConfig;
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

/** Load the .env file into process.env (call once at startup). */
export function loadEnvFile(path?: string): void {
  dotenvConfig(path ? { path } : {});
}

export function parseDatabaseUrl(url: string): DbConfig {
  const u = new URL(url);
  if (u.protocol !== "mysql:") {
    throw new Error("must use the mysql:// scheme");
  }
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

type Env = Record<string, string | undefined>;

export function loadConfig(env: Env = process.env): AppConfig {
  const problems: string[] = [];

  let db: DbConfig | null = null;
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    problems.push("DATABASE_URL is required");
  } else {
    try {
      db = parseDatabaseUrl(dbUrl);
      if (!db.database) problems.push("DATABASE_URL must include a database name");
    } catch (e) {
      problems.push(`DATABASE_URL invalid: ${(e as Error).message}`);
    }
  }

  const threshold = Number(env.REVIEW_CONFIDENCE_THRESHOLD ?? "0.85");
  if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
    problems.push("REVIEW_CONFIDENCE_THRESHOLD must be a number between 0 and 1");
  }

  const enabled = (env.BRIGHTDATA_ENABLED ?? "false").toLowerCase() === "true";
  const brightData: BrightDataConfig = {
    enabled,
    apiKey: env.BRIGHTDATA_API_KEY ?? "",
    browserUrl: env.BRIGHTDATA_BROWSER_URL ?? "",
    zone: env.BRIGHTDATA_ZONE ?? "mcp_unlocker",
    country: (env.BRIGHTDATA_COUNTRY ?? "us").toLowerCase(),
  };
  if (enabled && !brightData.apiKey && !brightData.browserUrl) {
    problems.push("BRIGHTDATA_ENABLED is true but neither BRIGHTDATA_API_KEY nor BRIGHTDATA_BROWSER_URL is set");
  }

  if (problems.length || !db) {
    throw new ConfigError(problems.length ? problems : ["DATABASE_URL is required"]);
  }

  const dir = (value: string | undefined, fallback: string) => resolve(repoRoot, value ?? fallback);
  return {
    db,
    artifactsDir: dir(env.ARTIFACTS_DIR, "./data/artifacts"),
    exportsDir: dir(env.EXPORTS_DIR, "./data/exports"),
    appBaseUrl: env.APP_BASE_URL ?? "http://localhost:3000",
    installType: env.INSTALL_TYPE ?? "local-demo",
    logLevel: env.LOG_LEVEL ?? "info",
    reviewConfidenceThreshold: threshold,
    brightData,
  };
}

/** Safe view of the config with secrets masked — never print the raw config. */
export function redactedConfig(c: AppConfig): AppConfig {
  return {
    ...c,
    db: { ...c.db, password: c.db.password ? "***" : "" },
    brightData: { ...c.brightData, apiKey: c.brightData.apiKey ? "***" : "" },
  };
}
