import { test } from "node:test";
import assert from "node:assert/strict";
import { toIsoDateOrNull } from "./index.ts";

test("toIsoDateOrNull passes through ISO dates unchanged", () => {
  assert.equal(toIsoDateOrNull("2026-06-12"), "2026-06-12");
  assert.equal(toIsoDateOrNull("  2026-12-31 "), "2026-12-31");
});

test("toIsoDateOrNull reorders MM/DD/YYYY to ISO", () => {
  assert.equal(toIsoDateOrNull("6/12/2026"), "2026-06-12");
  assert.equal(toIsoDateOrNull("12/5/2026"), "2026-12-05");
});

test("toIsoDateOrNull parses human dates without a one-day timezone shift", () => {
  // Old impl used new Date(t).toISOString() which, on a UTC+ server, returned
  // the *previous* day for a local-midnight parse. Formatting from local
  // calendar components keeps the day stable in every timezone.
  assert.equal(toIsoDateOrNull("June 12, 2026"), "2026-06-12");
  assert.equal(toIsoDateOrNull("January 1, 2026"), "2026-01-01");
});

test("toIsoDateOrNull returns null for empty/garbage input", () => {
  assert.equal(toIsoDateOrNull(null), null);
  assert.equal(toIsoDateOrNull(""), null);
  assert.equal(toIsoDateOrNull("not a date"), null);
});
