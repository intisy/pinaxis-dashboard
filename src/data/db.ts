import initSqlJs, { type Database } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

// Same-origin by default: the deploy pipeline mirrors the published pinaxis.db into the site root,
// which sidesteps the CORS restrictions on GitHub release-asset downloads. Override with VITE_DB_URL.
const DB_URL = import.meta.env.VITE_DB_URL ?? `${import.meta.env.BASE_URL}pinaxis.db`;

let cached: Promise<Database> | null = null;

export function database(): Promise<Database> {
  if (!cached) {
    cached = load();
  }
  return cached;
}

async function load(): Promise<Database> {
  const [SQL, buffer] = await Promise.all([
    initSqlJs({ locateFile: () => wasmUrl }),
    fetchDataset(),
  ]);
  return new SQL.Database(new Uint8Array(buffer));
}

async function fetchDataset(): Promise<ArrayBuffer> {
  const response = await fetch(DB_URL);
  if (!response.ok) {
    throw new Error(`could not load the dataset (HTTP ${response.status})`);
  }
  return response.arrayBuffer();
}
