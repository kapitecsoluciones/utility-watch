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
}

export async function listInstalled(pool: Pool): Promise<InstalledProvider[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, country, utility_type, registry_status, current_version FROM providers ORDER BY id",
  );
  return rows as InstalledProvider[];
}

/** Register (or update) a provider and a versioned manifest snapshot. Idempotent. */
export async function installProvider(pool: Pool, manifest: ProviderManifest): Promise<void> {
  const primaryType = manifest.serviceTypes[0] ?? "other";
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO providers (id, name, country, utility_type, registry_status, current_version)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), country = VALUES(country),
         utility_type = VALUES(utility_type), registry_status = VALUES(registry_status),
         current_version = VALUES(current_version)`,
      [manifest.id, manifest.name, manifest.country, primaryType, manifest.quality.status, manifest.version],
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
