import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBill } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));

test("socalgas-us parser normalizes the intercepted JSON bill (confidence 1.0)", async () => {
  const content = await readFile(join(here, "..", "fixtures", "sample-bill.json"), "utf8");
  const expected = JSON.parse(await readFile(join(here, "..", "fixtures", "expected-bill.json"), "utf8"));
  const bill = parseBill({ content, contentType: "json", sourceUrl: "https://www.socalgas.com/api/bills/scg-2026-05" });

  assert.equal(bill.providerId, expected.providerId);
  assert.equal(bill.accountRef, expected.accountRef);
  assert.equal(bill.statementDate, expected.statementDate);
  assert.equal(bill.periodStart, expected.periodStart);
  assert.equal(bill.periodEnd, expected.periodEnd);
  assert.equal(bill.dueDate, expected.dueDate);
  assert.equal(bill.amountDue, expected.amountDue);
  assert.equal(bill.confidence, expected.confidence);
  assert.deepEqual(bill.lineItems, expected.lineItems);
});

test("malformed JSON yields confidence 0 (routes to review, no throw)", () => {
  const bill = parseBill({ content: "{ not json", contentType: "json" });
  assert.equal(bill.confidence, 0);
  assert.equal(bill.amountDue, null);
});
