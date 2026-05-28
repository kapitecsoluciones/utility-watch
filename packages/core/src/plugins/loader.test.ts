import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { repoRoot } from "../paths.ts";
import { loadProvider } from "./loader.ts";
import type { ProviderContext } from "./contract.ts";

const ctx: ProviderContext = {
  logger: { info() {}, warn() {}, error() {} },
  account: { ref: "DEMO-0001", displayName: "Demo" },
  getSecret: () => undefined,
};

test("loadProvider loads the mock plugin and runs the full lifecycle", async () => {
  const provider = await loadProvider(join(repoRoot, "plugins", "mock-provider"));
  assert.equal(provider.manifest.id, "mock-provider");

  const login = await provider.login?.(ctx);
  assert.equal(login?.ok, true);

  const bills = await provider.listBills?.(ctx);
  assert.ok(bills && bills.length === 1);

  const artifact = await provider.downloadBill?.(ctx, bills[0]!);
  assert.ok(artifact);

  const bill = await provider.normalizeBill?.(ctx, artifact!);
  assert.equal(bill?.amountDue, 128.44);
  assert.equal(bill?.dueDate, "2026-05-21");
  assert.equal(bill?.confidence, 0.9);
  assert.equal(bill?.evidence.parser, "mock-provider@0.1.0");
});
