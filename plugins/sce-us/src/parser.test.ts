import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBill } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));

test("sce-us parser normalizes the synthetic SCE statement", async () => {
  const content = await readFile(join(here, "..", "fixtures", "sample-bill.txt"), "utf8");
  const expected = JSON.parse(await readFile(join(here, "..", "fixtures", "expected-bill.json"), "utf8"));
  const bill = parseBill({ content, contentType: "text", sourceUrl: "https://www.sce.com/mybills/sce-2026-05" });

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

test("US date conversion produces ISO dates", async () => {
  const bill = parseBill({ content: "Bill Date: 12/31/2026\nPayment Due Date: 01/15/2027\nTotal Amount Due: $10.00", contentType: "text" });
  assert.equal(bill.statementDate, "2026-12-31");
  assert.equal(bill.dueDate, "2027-01-15");
});
