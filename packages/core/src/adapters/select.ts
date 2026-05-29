import type { ProviderManifest } from "../plugins/contract.ts";
import type { AppConfig } from "../config/index.ts";
import type { AdapterSelection } from "./types.ts";

export interface AdapterSelectionInput {
  manifest: ProviderManifest;
  accountBrightDataAllowed: boolean;
}

/**
 * Choose the execution adapter. Bright Data is opt-in and fail-closed: the
 * Scraping Browser is selected only when the provider declares support, the
 * account opts in, AND Bright Data is globally enabled and configured.
 * Otherwise execution stays local. Every decision carries a recorded reason.
 */
export function selectAdapter(input: AdapterSelectionInput, config: Pick<AppConfig, "brightData">): AdapterSelection {
  const mode = input.manifest.permissions.brightData;
  const wantsBrightData = mode === "supported" || mode === "required";

  if (!wantsBrightData) {
    return { adapter: "local", reason: "provider does not use Bright Data" };
  }
  if (!config.brightData.enabled) {
    return {
      adapter: "local",
      reason: mode === "required" ? "Bright Data is required by the provider but globally disabled" : "Bright Data supported but globally disabled; using local",
    };
  }
  if (!input.accountBrightDataAllowed) {
    return { adapter: "local", reason: "Bright Data enabled but the account has not opted in; using local" };
  }
  if (!config.brightData.browserUrl) {
    return { adapter: "local", reason: "Bright Data enabled but BRIGHTDATA_BROWSER_URL is not set; using local" };
  }
  return { adapter: "brightdata-scraping-browser", reason: "provider supports Bright Data, account opted in, Bright Data configured" };
}
