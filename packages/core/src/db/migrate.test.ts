import { test } from "node:test";
import assert from "node:assert/strict";
import { listMigrationFiles } from "./migrate.ts";
import { migrationsDir } from "../paths.ts";

test("listMigrationFiles returns .sql files in lexical order", async () => {
  const files = await listMigrationFiles(migrationsDir);
  assert.ok(files.length >= 2, "expected at least the init + seed migrations");
  assert.ok(files.every((f) => f.endsWith(".sql")));
  const sorted = [...files].sort();
  assert.deepEqual(files, sorted);
  assert.equal(files[0], "0001_init.sql");
});
