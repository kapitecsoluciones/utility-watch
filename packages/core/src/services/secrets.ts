import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";

// Encrypted secret store (AES-256-GCM). The 32-byte key lives only in the
// environment (SECRETS_KEY); the DB holds ciphertext + iv + auth tag. Values
// are provider credentials referenced by a stable handle name; they are never
// logged and never returned by the listing API (names only).

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce length

/** Parse a 32-byte key from a hex (64 chars) or base64 string. null if absent/invalid. */
export function parseSecretsKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    /* fall through */
  }
  return null;
}

/** Generate a fresh key as base64 (for SECRETS_KEY). */
export function generateSecretsKey(): string {
  return randomBytes(32).toString("base64");
}

export async function setSecret(pool: Pool, key: Buffer, name: string, value: string): Promise<void> {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  await pool.query(
    `INSERT INTO secrets (name, iv, auth_tag, ciphertext) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE iv = VALUES(iv), auth_tag = VALUES(auth_tag), ciphertext = VALUES(ciphertext)`,
    [name, iv, authTag, ciphertext],
  );
}

/** Decrypt a secret by name. Returns null if absent or the key fails to authenticate. */
export async function getSecret(pool: Pool, key: Buffer, name: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT iv, auth_tag, ciphertext FROM secrets WHERE name = ?",
    [name],
  );
  const r = rows[0];
  if (!r) return null;
  try {
    const decipher = createDecipheriv(ALGO, key, r.iv as Buffer);
    decipher.setAuthTag(r.auth_tag as Buffer);
    return Buffer.concat([decipher.update(r.ciphertext as Buffer), decipher.final()]).toString("utf8");
  } catch {
    return null; // wrong key / tampered ciphertext
  }
}

export async function deleteSecret(pool: Pool, name: string): Promise<void> {
  await pool.query("DELETE FROM secrets WHERE name = ?", [name]);
}

export interface SecretMeta {
  name: string;
  updated_at: string;
}

/** List secret NAMES only (never values) for the console/CLI. */
export async function listSecretNames(pool: Pool): Promise<SecretMeta[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT name, updated_at FROM secrets ORDER BY name",
  );
  return rows as SecretMeta[];
}
