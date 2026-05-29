import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "mysql2/promise";
import {
  parseSecretsKey,
  generateSecretsKey,
  setSecret,
  getSecret,
} from "./secrets.ts";

// Minimal in-memory fake Pool: captures the INSERT row, serves it back on SELECT.
function fakePool(): Pool {
  let row: { iv: Buffer; auth_tag: Buffer; ciphertext: Buffer } | null = null;
  return {
    async query(sql: string, params: unknown[]) {
      if (/^INSERT/i.test(sql)) {
        row = { iv: params[1] as Buffer, auth_tag: params[2] as Buffer, ciphertext: params[3] as Buffer };
        return [{}, []];
      }
      // SELECT
      return [row ? [row] : [], []];
    },
  } as unknown as Pool;
}

test("parseSecretsKey accepts 64-char hex and 32-byte base64, rejects others", () => {
  assert.equal(parseSecretsKey(undefined), null);
  assert.equal(parseSecretsKey("short"), null);
  const hex = "a".repeat(64);
  assert.equal(parseSecretsKey(hex)?.length, 32);
  const b64 = Buffer.alloc(32, 7).toString("base64");
  assert.equal(parseSecretsKey(b64)?.length, 32);
  // 16-byte base64 is the wrong length → rejected
  assert.equal(parseSecretsKey(Buffer.alloc(16).toString("base64")), null);
});

test("generateSecretsKey yields a usable 32-byte key", () => {
  const k = parseSecretsKey(generateSecretsKey());
  assert.equal(k?.length, 32);
});

test("setSecret/getSecret round-trips through AES-256-GCM", async () => {
  const key = parseSecretsKey(generateSecretsKey())!;
  const pool = fakePool();
  await setSecret(pool, key, "athens_password", "Sup3r-Secret!");
  assert.equal(await getSecret(pool, key, "athens_password"), "Sup3r-Secret!");
});

test("getSecret with the wrong key fails closed (returns null, never throws)", async () => {
  const pool = fakePool();
  await setSecret(pool, parseSecretsKey(generateSecretsKey())!, "k", "value");
  const wrong = parseSecretsKey(generateSecretsKey())!;
  assert.equal(await getSecret(pool, wrong, "k"), null);
});

test("getSecret returns null when the name is absent", async () => {
  const key = parseSecretsKey(generateSecretsKey())!;
  assert.equal(await getSecret(fakePool(), key, "missing"), null);
});
