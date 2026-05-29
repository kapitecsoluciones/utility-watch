import { test } from "node:test";
import assert from "node:assert/strict";
import { selectAdapter } from "./select.ts";
import type { AppConfig } from "../config/index.ts";
import type { ProviderManifest } from "../plugins/contract.ts";

const baseConfig = (over: Partial<AppConfig["brightData"]> = {}): AppConfig => ({
  db: { host: "h", port: 3306, user: "u", password: "p", database: "d" },
  artifactsDir: "/tmp/a",
  exportsDir: "/tmp/e",
  appBaseUrl: "http://localhost",
  installType: "local-demo",
  logLevel: "info",
  reviewConfidenceThreshold: 0.85,
  brightData: { enabled: false, apiKey: "", browserUrl: "", zone: "mcp_unlocker", country: "us", ...over },
});

const manifest = (brightData: ProviderManifest["permissions"]["brightData"]): ProviderManifest =>
  ({ permissions: { brightData } } as ProviderManifest);

test("provider without Bright Data stays local", () => {
  const s = selectAdapter({ manifest: manifest("unsupported"), accountBrightDataAllowed: true }, baseConfig({ enabled: true, browserUrl: "wss://x" }));
  assert.equal(s.adapter, "local");
});

test("Bright Data supported but globally disabled → local", () => {
  const s = selectAdapter({ manifest: manifest("supported"), accountBrightDataAllowed: true }, baseConfig({ enabled: false }));
  assert.equal(s.adapter, "local");
});

test("Bright Data enabled but account not opted in → local (fail-closed)", () => {
  const s = selectAdapter({ manifest: manifest("supported"), accountBrightDataAllowed: false }, baseConfig({ enabled: true, browserUrl: "wss://x" }));
  assert.equal(s.adapter, "local");
});

test("Bright Data enabled, opted in, but no browser URL → local", () => {
  const s = selectAdapter({ manifest: manifest("supported"), accountBrightDataAllowed: true }, baseConfig({ enabled: true, browserUrl: "" }));
  assert.equal(s.adapter, "local");
});

test("all conditions met → brightdata-scraping-browser", () => {
  const s = selectAdapter({ manifest: manifest("supported"), accountBrightDataAllowed: true }, baseConfig({ enabled: true, browserUrl: "wss://brd" }));
  assert.equal(s.adapter, "brightdata-scraping-browser");
});
