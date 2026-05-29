import type { BrowserSession } from "../plugins/contract.ts";

/**
 * Launch a LOCAL headless Chromium (via playwright-core) and hand back a page.
 * This is the default browser backend for code providers that log in to a
 * portal when Bright Data is not selected — the browser runs in the instance
 * container (which must ship Chromium, e.g. the mcr.microsoft.com/playwright
 * base image). Args mirror a hardened server-side launch.
 *
 * CHROMIUM_PATH overrides the executable if the bundled one is not on the
 * default Playwright cache path.
 */
export async function openLocalBrowser(): Promise<BrowserSession> {
  const { chromium } = await import("playwright-core");
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-http2", // some portals (ASP.NET/EZ-Pay) break over HTTP/2 → navigation errors
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  return {
    page,
    close: async () => {
      await browser.close();
    },
  };
}
