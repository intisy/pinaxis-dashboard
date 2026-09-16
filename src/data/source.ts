import type { Model } from "./model";

// Private builds (vite --mode private, and local dev) read the raw database in the browser and keep the
// full detail, including the masked leak table. Every other build is PUBLIC and must never touch the raw
// database: it fetches a pre-sanitized summary that carries no secret strings and no per-secret rows.
const IS_PRIVATE = import.meta.env.MODE === "private" || import.meta.env.MODE === "development";

export const MODE: "private" | "public" = IS_PRIVATE ? "private" : "public";

export async function loadModel(): Promise<Model> {
  if (IS_PRIVATE) {
    const [{ database }, { buildModel }] = await Promise.all([import("./db"), import("./model")]);
    return buildModel(await database());
  }
  const response = await fetch(`${import.meta.env.BASE_URL}summary.json`);
  if (!response.ok) {
    throw new Error(`could not load the summary (HTTP ${response.status})`);
  }
  return (await response.json()) as Model;
}
