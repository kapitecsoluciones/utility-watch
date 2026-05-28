import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDatabaseUrl, loadConfig, ConfigError, redactedConfig } from "./index.ts";

test("parseDatabaseUrl parses a mysql url", () => {
  const db = parseDatabaseUrl("mysql://u:p%40ss@db.local:3307/utility_watch");
  assert.equal(db.host, "db.local");
  assert.equal(db.port, 3307);
  assert.equal(db.user, "u");
  assert.equal(db.password, "p@ss");
  assert.equal(db.database, "utility_watch");
});

test("parseDatabaseUrl rejects non-mysql schemes", () => {
  assert.throws(() => parseDatabaseUrl("postgres://x/y"));
});

test("loadConfig builds config from a valid env", () => {
  const cfg = loadConfig({
    DATABASE_URL: "mysql://utility_watch:secret@localhost:3306/utility_watch",
    BRIGHTDATA_ENABLED: "false",
  });
  assert.equal(cfg.db.database, "utility_watch");
  assert.equal(cfg.reviewConfidenceThreshold, 0.85);
  assert.equal(cfg.brightData.enabled, false);
});

test("loadConfig fails closed when Bright Data is enabled without credentials", () => {
  assert.throws(
    () =>
      loadConfig({
        DATABASE_URL: "mysql://u:p@localhost:3306/uw",
        BRIGHTDATA_ENABLED: "true",
      }),
    ConfigError,
  );
});

test("loadConfig rejects an out-of-range confidence threshold", () => {
  assert.throws(
    () => loadConfig({ DATABASE_URL: "mysql://u:p@localhost:3306/uw", REVIEW_CONFIDENCE_THRESHOLD: "2" }),
    ConfigError,
  );
});

test("redactedConfig masks secrets", () => {
  const cfg = loadConfig({ DATABASE_URL: "mysql://u:supersecret@localhost:3306/uw" });
  const safe = redactedConfig(cfg);
  assert.equal(safe.db.password, "***");
  assert.notEqual(cfg.db.password, "***");
});
