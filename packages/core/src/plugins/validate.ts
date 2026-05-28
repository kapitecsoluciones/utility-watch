import { readFile } from "node:fs/promises";
import {
  SERVICE_TYPES,
  CAPABILITIES,
  ARTIFACT_TYPES,
  BRIGHTDATA_MODES,
  type ProviderManifest,
} from "./contract.ts";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: ProviderManifest;
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isStrArr = (v: unknown): boolean => Array.isArray(v) && v.every((x) => typeof x === "string");
const subsetOf = (v: unknown, allowed: readonly string[]): boolean =>
  Array.isArray(v) && v.length > 0 && v.every((x) => allowed.includes(x as string));

/** Validate a parsed manifest object against uw-plugin-v1. Pure, no I/O. */
export function validateManifest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["manifest must be a JSON object"] };
  }
  const m = input as Record<string, unknown>;
  const errors: string[] = [];
  const check = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };

  check(isStr(m.id) && /^[a-z0-9][a-z0-9-]*$/.test(m.id as string), "id: must be a lowercase slug [a-z0-9-]");
  check(isStr(m.name), "name: required string");
  check(isStr(m.version) && /^\d+\.\d+\.\d+/.test(m.version as string), "version: must be semver");
  check(isStr(m.license), "license: required string");
  check(m.schemaVersion === "uw-plugin-v1", "schemaVersion: must be 'uw-plugin-v1'");
  check(isStr(m.coreVersion), "coreVersion: required version range string");
  check(isStr(m.country) && /^[A-Z]{2}$/.test(m.country as string), "country: must be ISO-3166 alpha-2");
  check(subsetOf(m.serviceTypes, SERVICE_TYPES), `serviceTypes: non-empty subset of ${SERVICE_TYPES.join("|")}`);
  check(isStr(m.entrypoint), "entrypoint: required string");
  check(subsetOf(m.capabilities, CAPABILITIES), `capabilities: non-empty subset of ${CAPABILITIES.join("|")}`);

  const auth = m.auth as Record<string, unknown> | undefined;
  if (!auth || typeof auth !== "object") errors.push("auth: required object");
  else {
    check(isStr(auth.type), "auth.type: required string");
    check(isStrArr(auth.secretRefs), "auth.secretRefs: must be string[] (handles, not values)");
  }

  const perms = m.permissions as Record<string, unknown> | undefined;
  if (!perms || typeof perms !== "object") errors.push("permissions: required object");
  else {
    check(isStrArr(perms.network), "permissions.network: must be string[] of allowed domains");
    check(
      Array.isArray(perms.artifacts) &&
        perms.artifacts.every((a) => (ARTIFACT_TYPES as readonly string[]).includes(a as string)),
      `permissions.artifacts: subset of ${ARTIFACT_TYPES.join("|")}`,
    );
    check(
      perms.filesystem === "artifacts-only" || perms.filesystem === "none",
      "permissions.filesystem: must be 'artifacts-only' or 'none'",
    );
    check(
      (BRIGHTDATA_MODES as readonly string[]).includes(perms.brightData as string),
      `permissions.brightData: one of ${BRIGHTDATA_MODES.join("|")}`,
    );
  }

  const quality = m.quality as Record<string, unknown> | undefined;
  if (!quality || typeof quality !== "object") errors.push("quality: required object");
  else {
    check(isStr(quality.status), "quality.status: required string");
    check(isStrArr(quality.limitations), "quality.limitations: must be string[] (be honest)");
  }

  const support = m.support as Record<string, unknown> | undefined;
  if (!support || typeof support !== "object") errors.push("support: required object");
  else check(isStr(support.maintainer), "support.maintainer: required string");

  return errors.length
    ? { ok: false, errors }
    : { ok: true, errors: [], manifest: input as ProviderManifest };
}

export async function loadManifestFile(path: string): Promise<ValidationResult> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (e) {
    return { ok: false, errors: [`cannot read ${path}: ${(e as Error).message}`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, errors: [`invalid JSON in ${path}: ${(e as Error).message}`] };
  }
  return validateManifest(parsed);
}
