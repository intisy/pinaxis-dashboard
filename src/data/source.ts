import type { Model } from "./model";

// Both builds read a pre-generated summary.json - the raw database is never shipped to the browser.
// A public build's summary omits per-secret rows; a private build's summary includes a masked leak table
// and is served behind Cloudflare Access. MODE only affects wording.
const IS_PRIVATE = import.meta.env.MODE === "private" || import.meta.env.MODE === "development";

export const MODE: "private" | "public" = IS_PRIVATE ? "private" : "public";

export async function loadModel(): Promise<Model> {
  const response = await fetch(`${import.meta.env.BASE_URL}summary.json`);
  if (!response.ok) {
    throw new Error(`could not load the summary (HTTP ${response.status})`);
  }
  return (await response.json()) as Model;
}
