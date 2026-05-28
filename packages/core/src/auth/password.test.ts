import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.ts";

test("hashPassword + verifyPassword round-trips", () => {
  const stored = hashPassword("correct horse battery staple");
  assert.ok(stored.startsWith("scrypt$"));
  assert.equal(verifyPassword("correct horse battery staple", stored), true);
});

test("verifyPassword rejects the wrong password", () => {
  const stored = hashPassword("hunter2");
  assert.equal(verifyPassword("hunter3", stored), false);
});

test("verifyPassword rejects malformed stored values without throwing", () => {
  assert.equal(verifyPassword("x", "not-a-hash"), false);
  assert.equal(verifyPassword("x", "scrypt$bad"), false);
});

test("two hashes of the same password differ (random salt)", () => {
  assert.notEqual(hashPassword("same"), hashPassword("same"));
});
