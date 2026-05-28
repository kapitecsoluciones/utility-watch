import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// packages/core/src
const here = dirname(fileURLToPath(import.meta.url));

export const coreRoot = resolve(here, "..");
export const repoRoot = resolve(here, "..", "..", "..");
export const migrationsDir = resolve(coreRoot, "migrations");
export const registryFile = resolve(repoRoot, "registry", "providers.json");
