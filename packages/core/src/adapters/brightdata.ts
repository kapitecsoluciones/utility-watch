import type { BrowserSession } from "../plugins/contract.ts";

/**
 * Connect to the Bright Data Scraping Browser over CDP and hand back a page.
 * Uses playwright-core's connectOverCDP — no local browser binary is needed
 * because the browser runs remotely on Bright Data. The endpoint comes from
 * BRIGHTDATA_BROWSER_URL (a wss:// CDP URL). Disabled by default; only reached
 * when adapter selection chose Bright Data (see adapters/select.ts).
 */
export async function openBrightDataBrowser(browserUrl: string): Promise<BrowserSession> {
  if (!browserUrl) {
    throw new Error("Bright Data adapter selected but BRIGHTDATA_BROWSER_URL is not set");
  }
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(browserUrl);
  const context = await browser.newContext();
  const page = await context.newPage();
  return {
    page,
    close: async () => {
      await browser.close();
    },
  };
}
