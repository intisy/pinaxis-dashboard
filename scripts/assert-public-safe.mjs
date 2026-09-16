import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(root, "public", "summary.json"), "utf8");
const summary = JSON.parse(raw);

assert.deepEqual(summary.leaks, [], "a public summary must carry no per-secret rows");
assert.deepEqual(summary.exposure.topRepositories, [], "a public summary must name no repository");

/**
 * @remarks this scan reads the whole document, so an ecosystem value could in principle trip a marker
 * (an npm package named sk-something would match "sk-"). That failure is the safe direction: narrow the
 * scan to the credential-bearing fields if it happens, never drop the check or weaken a marker.
 */
const SECRET_MARKERS = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_", "sk-", "sk_live_",
  "AIza", "BEGIN PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "iam.gserviceaccount.com"];
for (const marker of SECRET_MARKERS) {
  assert.ok(!raw.includes(marker), `a public summary must not contain ${marker}`);
}

console.log("public summary is safe to publish");
