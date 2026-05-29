import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDeclarative, type ParserSpec } from "./declarative.ts";
import type { RawBillArtifact } from "./contract.ts";

const TEXT_SPEC: ParserSpec = {
  schemaVersion: "uw-parser-v1",
  artifact: "text",
  currency: "USD",
  fields: {
    amountDue: { from: "regex", pattern: "Total Amount Due:\\s*\\$?([\\d,]+\\.\\d{2})", group: 1, cast: "money" },
    dueDate: { from: "regex", pattern: "Due Date:\\s*(\\d{2}/\\d{2}/\\d{4})", group: 1, cast: "date", format: "MM/DD/YYYY" },
    statementDate: { from: "regex", pattern: "Bill Date:\\s*(\\d{2}/\\d{2}/\\d{4})", group: 1, cast: "date", format: "MM/DD/YYYY" },
    accountRef: { from: "regex", pattern: "Account:\\s*(\\S+)", group: 1 },
  },
  lineItems: { from: "regex-all", pattern: "^([A-Za-z][\\w .-]+?)\\s+\\$([\\d,]+\\.\\d{2})$", labelGroup: 1, amountGroup: 2 },
};

const SAMPLE_TEXT = [
  "Account: 123-456-789",
  "Bill Date: 05/02/2026",
  "Due Date: 05/24/2026",
  "Energy Charge $1,200.50",
  "Delivery Charge $45.00",
  "Total Amount Due: $1,245.50",
].join("\n");

test("text spec: regex fields, money/date casts, line items, confidence 0.9", () => {
  const artifact: RawBillArtifact = { content: SAMPLE_TEXT, contentType: "text" };
  const bill = parseDeclarative(TEXT_SPEC, artifact);

  assert.equal(bill.amountDue, 1245.5);
  assert.equal(bill.dueDate, "2026-05-24");
  assert.equal(bill.statementDate, "2026-05-02");
  assert.equal(bill.accountRef, "123-456-789");
  assert.equal(bill.currency, "USD");

  assert.equal(bill.confidence, 0.9);
  assert.equal(bill.evidence.fields.amountDue!.confidence, 0.9);
  assert.equal(bill.evidence.fields.amountDue!.source, "regex");

  assert.deepEqual(bill.lineItems, [
    { label: "Energy Charge", amount: 1200.5 },
    { label: "Delivery Charge", amount: 45.0 },
  ]);
});

test("json spec: json-paths yield confidence 1.0", () => {
  const spec: ParserSpec = {
    schemaVersion: "uw-parser-v1",
    artifact: "json",
    currency: "USD",
    fields: {
      amountDue: { from: "json", path: "summary.total", cast: "money" },
      dueDate: { from: "json", path: "summary.dueDate", cast: "date" },
      statementDate: { from: "json", path: "statementDate", cast: "date" },
      accountRef: { from: "json", path: "account.id" },
    },
  };
  const payload = JSON.stringify({
    statementDate: "2026-05-02",
    summary: { total: "1,245.50", dueDate: "2026-05-24" },
    account: { id: "ACME-42" },
  });
  const bill = parseDeclarative(spec, { content: payload, contentType: "json" });

  assert.equal(bill.amountDue, 1245.5);
  assert.equal(bill.dueDate, "2026-05-24");
  assert.equal(bill.statementDate, "2026-05-02");
  assert.equal(bill.accountRef, "ACME-42");

  assert.equal(bill.confidence, 1.0);
  assert.equal(bill.evidence.fields.statementDate!.confidence, 1.0);
  assert.equal(bill.evidence.fields.statementDate!.source, "json");
});

test("missing field yields confidence 0 overall", () => {
  const artifact: RawBillArtifact = { content: "Bill Date: 05/02/2026\nDue Date: 05/24/2026", contentType: "text" };
  const bill = parseDeclarative(TEXT_SPEC, artifact);

  assert.equal(bill.amountDue, null);
  assert.equal(bill.evidence.fields.amountDue!.confidence, 0);
  assert.equal(bill.confidence, 0);
});

test("malformed JSON does not throw and yields confidence 0", () => {
  const spec: ParserSpec = {
    schemaVersion: "uw-parser-v1",
    artifact: "json",
    currency: "USD",
    fields: {
      amountDue: { from: "json", path: "summary.total", cast: "money" },
      dueDate: { from: "json", path: "summary.dueDate", cast: "date" },
      statementDate: { from: "json", path: "statementDate", cast: "date" },
    },
  };
  let bill: ReturnType<typeof parseDeclarative> | undefined;
  assert.doesNotThrow(() => {
    bill = parseDeclarative(spec, { content: "{not valid json", contentType: "json" });
  });
  assert.equal(bill!.amountDue, null);
  assert.equal(bill!.dueDate, null);
  assert.equal(bill!.statementDate, null);
  assert.equal(bill!.confidence, 0);
});

test("bad regex pattern does not throw and yields confidence 0", () => {
  const spec: ParserSpec = {
    schemaVersion: "uw-parser-v1",
    artifact: "text",
    currency: "USD",
    fields: {
      amountDue: { from: "regex", pattern: "([unclosed", group: 1, cast: "money" },
      dueDate: { from: "regex", pattern: "Due Date:\\s*(\\d{2}/\\d{2}/\\d{4})", group: 1, cast: "date", format: "MM/DD/YYYY" },
      statementDate: { from: "regex", pattern: "Bill Date:\\s*(\\d{2}/\\d{2}/\\d{4})", group: 1, cast: "date", format: "MM/DD/YYYY" },
    },
  };
  let bill: ReturnType<typeof parseDeclarative> | undefined;
  assert.doesNotThrow(() => {
    bill = parseDeclarative(spec, { content: SAMPLE_TEXT, contentType: "text" });
  });
  assert.equal(bill!.amountDue, null);
  assert.equal(bill!.confidence, 0);
});
