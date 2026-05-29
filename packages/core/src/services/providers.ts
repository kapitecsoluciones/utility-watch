import { readFile } from "node:fs/promises";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { registryFile } from "../paths.ts";
import type { ProviderManifest } from "../plugins/contract.ts";

export interface RegistryProvider {
  id: string;
  name: string;
  country: string;
  serviceTypes: string[];
  status: string;
  verification: string;
  brightData: string;
  package?: string;
}

export async function readRegistry(): Promise<RegistryProvider[]> {
  const json = JSON.parse(await readFile(registryFile, "utf8")) as { providers?: RegistryProvider[] };
  return json.providers ?? [];
}

export async function getRegistryProvider(id: string): Promise<RegistryProvider | null> {
  const all = await readRegistry();
  return all.find((p) => p.id === id) ?? null;
}

export interface InstalledProvider {
  id: string;
  name: string;
  country: string;
  utility_type: string;
  registry_status: string;
  current_version: string | null;
  kind: string;
}

export async function listInstalled(pool: Pool): Promise<InstalledProvider[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, country, utility_type, registry_status, current_version, kind FROM providers ORDER BY id",
  );
  return rows as InstalledProvider[];
}

/** Latest stored manifest for a provider (for declarative parsing / inspection). */
export async function getProviderManifest(pool: Pool, providerId: string): Promise<ProviderManifest | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT manifest_json FROM provider_versions WHERE provider_id = ? ORDER BY id DESC LIMIT 1",
    [providerId],
  );
  const raw = rows[0]?.manifest_json;
  if (!raw) return null;
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as ProviderManifest;
}

/** Register (or update) a provider and a versioned manifest snapshot. Idempotent. */
export async function installProvider(pool: Pool, manifest: ProviderManifest): Promise<void> {
  const primaryType = manifest.serviceTypes[0] ?? "other";
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO providers (id, name, country, utility_type, registry_status, current_version, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), country = VALUES(country),
         utility_type = VALUES(utility_type), registry_status = VALUES(registry_status),
         current_version = VALUES(current_version), kind = VALUES(kind)`,
      [manifest.id, manifest.name, manifest.country, primaryType, manifest.quality.status, manifest.version, manifest.kind ?? "code"],
    );
    await conn.query(
      `INSERT INTO provider_versions (provider_id, version, manifest_json, verification_level)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE manifest_json = VALUES(manifest_json), verification_level = VALUES(verification_level)`,
      [manifest.id, manifest.version, JSON.stringify(manifest), manifest.quality.verification],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
