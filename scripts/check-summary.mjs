import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "scratch", "fixture.db");

function build(mode) {
  execFileSync("node", ["scripts/build-summary.mjs", ...(mode === "private" ? ["private"] : [])], {
    cwd: root,
    env: { ...process.env, PINAXIS_DB: fixture },
    stdio: "inherit",
  });
  return JSON.parse(readFileSync(join(root, "public", "summary.json"), "utf8"));
}

const publicSummary = build("public");
const privateSummary = build("private");

assert.equal(publicSummary.totals.findings, 8, "every result row is a finding");
assert.deepEqual(publicSummary.leaks, [], "a public summary never carries per-secret rows");
assert.equal(privateSummary.leaks.length, 6, "a private summary lists the credential rows, masked");
for (const leak of privateSummary.leaks) {
  assert.ok(leak.value.includes("•"), `${leak.target} value must be masked`);
}

const totals = publicSummary.totals;
assert.equal(totals.credentials, 6, "only category 'credentials' counts as a credential");
assert.equal(totals.validatedChecked, 4, "github-token, openai-api-key and gcp-service-account-key are probed");
assert.equal(totals.validatedLive, 1, "only a probed detector can report a live credential");
assert.equal(totals.formatMatches, 2, "gcp-api-key is format-only");
assert.equal(totals.publicKeys, 1, "a publishable key is not a leak");
assert.equal(totals.repositories, 6, "distinct repositories across every location");
assert.equal(totals.locations, 9, "one row per repository and path a value appeared in");
assert.equal(totals.backlog, 5, "the pending frontier");

const gcp = publicSummary.credentialTypes.find((row) => row.target === "gcp-api-key");
assert.equal(gcp.verification, "format-only");
const github = publicSummary.credentialTypes.find((row) => row.target === "github-token");
assert.equal(github.verification, "validated");

assert.deepEqual(publicSummary.exposure.topRepositories, [],
  "a public summary never names a repository");
assert.equal(publicSummary.exposure.repositories, 6);
assert.equal(publicSummary.exposure.worst, 3, "o/alpha holds three findings");
assert.deepEqual(publicSummary.exposure.histogram, [
  { bucket: "1", repos: 4 },
  { bucket: "2-3", repos: 2 },
  { bucket: "4-9", repos: 0 },
  { bucket: "10 or more", repos: 0 },
]);
assert.equal(privateSummary.exposure.topRepositories[0].repository, "o/alpha");
assert.equal(privateSummary.exposure.topRepositories[0].findings, 3);

const env = publicSummary.fileTypes.find((row) => row.extension === ".env");
assert.equal(env.findings, 2, "secrets are grouped by the extension of the file they sat in");
assert.equal(publicSummary.fileTypes.reduce((n, row) => n + row.findings, 0), 9);

const react = publicSummary.versionSpread.find((row) => row.value === "react");
assert.equal(react.target, "npm-package");
assert.deepEqual(react.variants, [
  { variant: "18.2.0", sightings: 5 },
  { variant: "17.0.2", sightings: 2 },
]);
assert.ok(publicSummary.versionSpread.every((row) => row.variants.length > 0),
  "a dependency with no recorded variant is not listed");

console.log("summary checks passed");
