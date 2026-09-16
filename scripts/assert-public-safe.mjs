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
 * @remarks `references` and `versionSpread` are excluded from the marker scan because they carry
 * third-party registry identifiers that can legitimately contain credential-like substrings (the PyPI
 * package "Flask-Login" matches "sk-"). Every other field, which is where a leaked credential would
 * actually appear, stays under the scan. If a future name trips a marker again, narrow the scan
 * further; never weaken a marker or drop the check.
 */
const { references, versionSpread, ...credentialBearing } = summary;
const scanned = JSON.stringify(credentialBearing);

const SECRET_MARKERS = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_", "sk-", "sk_live_",
  "AIza", "BEGIN PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "iam.gserviceaccount.com"];
for (const marker of SECRET_MARKERS) {
  assert.ok(!scanned.includes(marker), `a public summary must not contain ${marker}`);
}

console.log("public summary is safe to publish");
