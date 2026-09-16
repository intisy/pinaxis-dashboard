import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(root, "public", "summary.json"), "utf8");
const summary = JSON.parse(raw);

assert.equal(summary.mode, "public", "a public build must be served a summary built in public mode");
assert.deepEqual(summary.leaks, [], "a public summary must carry no per-secret rows");
assert.deepEqual(summary.exposure.topRepositories, [], "a public summary must name no repository");

const SECRET_MARKERS = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_", "sk_live_",
  "AIza", "BEGIN PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "iam.gserviceaccount.com"];

/**
 * @remarks every marker above is scanned across the WHOLE document, including `references` and
 * `versionSpread`, which carry the most unvalidated third-party text in the summary: docker base images
 * and CI action refs are free-form strings lifted from strangers' files. Only "sk-" is narrowed, because
 * three characters collide with legitimate package names (the PyPI package "Flask-Login"), so it is
 * applied to the credential-bearing fields alone. A future collision is answered by narrowing that one
 * marker the same way, never by dropping a block from the scan.
 */
const PACKAGE_COLLIDING_MARKER = "sk-";
const { references, versionSpread, ...credentialBearing } = summary;
const whole = JSON.stringify(summary);
const credentialText = JSON.stringify(credentialBearing);

for (const marker of SECRET_MARKERS) {
  assert.ok(!whole.includes(marker), `a public summary must not contain ${marker}`);
}
assert.ok(!credentialText.includes(PACKAGE_COLLIDING_MARKER),
  `a public summary must not contain ${PACKAGE_COLLIDING_MARKER} outside registry identifiers`);

console.log("public summary is safe to publish");
