import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBill } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));

test("mock parser normalizes the sample bill to the expected fields", async () => {
  const content = await readFile(join(here, "..", "fixtures", "sample-bill.txt"), "utf8");
  const expected = JSON.parse(await readFile(join(here, "..", "fixtures", "expected-bill.json"), "utf8"));
  const bill = parseBill({ content, contentType: "text", sourceUrl: "https://example.test/bills/mock-2026-05" });

  assert.equal(bill.providerId, expected.providerId);
  assert.equal(bill.accountRef, expected.accountRef);
  assert.equal(bill.statementDate, expected.statementDate);
  assert.equal(bill.periodStart, expected.periodStart);
  assert.equal(bill.periodEnd, expected.periodEnd);
  assert.equal(bill.dueDate, expected.dueDate);
  assert.equal(bill.amountDue, expected.amountDue);
  assert.equal(bill.currency, expected.currency);
  assert.equal(bill.confidence, expected.confidence);
  assert.deepEqual(bill.lineItems, expected.lineItems);
});

test("a missing required field drops confidence to 0 (routes to review)", () => {
  const bill = parseBill({ content: "Account: X\nDue Date: 2026-05-21\n(no amount)", contentType: "text" });
  assert.equal(bill.confidence, 0);
  assert.equal(bill.amountDue, null);
});
