// Mirrors the published pinaxis dataset into the site so the deployed app reads it same-origin,
// which avoids the CORS restrictions on GitHub release-asset downloads. Run at build time.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ASSET = process.env.PINAXIS_DB_URL
  ?? "https://github.com/intisy/pinaxis/releases/download/dataset/pinaxis.db";
const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "pinaxis.db");

const response = await fetch(ASSET, { redirect: "follow" });
if (!response.ok) {
  throw new Error(`could not fetch ${ASSET} (HTTP ${response.status})`);
}
const bytes = new Uint8Array(await response.arrayBuffer());
await mkdir(dirname(out), { recursive: true });
await writeFile(out, bytes);
console.log(`mirrored ${bytes.length} bytes to ${out}`);
