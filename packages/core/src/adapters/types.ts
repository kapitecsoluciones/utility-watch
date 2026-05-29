export type AdapterName = "local" | "brightdata-scraping-browser";

export interface AdapterSelection {
  adapter: AdapterName;
  reason: string;
}
