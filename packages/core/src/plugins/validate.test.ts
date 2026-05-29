import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateManifest } from "./validate.ts";
import { repoRoot } from "../paths.ts";

test("validateManifest accepts the committed example and mock manifests", async () => {
  for (const dir of ["example-provider", "mock-provider", "sce-us"]) {
    const manifest = JSON.parse(await readFile(join(repoRoot, "plugins", dir, "plugin.json"), "utf8"));
    const res = validateManifest(manifest);
    assert.equal(res.ok, true, `${dir} should be valid: ${res.errors.join("; ")}`);
  }
});

test("validateManifest rejects bad schemaVersion and enum values", () => {
  const res = validateManifest({
    id: "x",
    name: "X",
    version: "0.1.0",
    license: "Apache-2.0",
    schemaVersion: "v2",
    coreVersion: ">=0",
    country: "usa",
    serviceTypes: ["plasma"],
    entrypoint: "i.js",
    capabilities: ["fly"],
    auth: { type: "x", secretRefs: [] },
    permissions: { network: [], artifacts: ["xml"], filesystem: "root", brightData: "maybe" },
    quality: { status: "draft", limitations: [] },
    support: { maintainer: "x" },
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.startsWith("schemaVersion")));
  assert.ok(res.errors.some((e) => e.startsWith("country")));
  assert.ok(res.errors.some((e) => e.startsWith("serviceTypes")));
  assert.ok(res.errors.some((e) => e.startsWith("permissions.brightData")));
});

test("validateManifest reports many missing fields at once", () => {
  const res = validateManifest({});
  assert.equal(res.ok, false);
  assert.ok(res.errors.length >= 5);
});
