import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "scratch", "fixture.db");
const summaryPath = join(root, "public", "summary.json");

function build(mode) {
  execFileSync("node", ["scripts/build-summary.mjs", ...(mode === "private" ? ["private"] : [])], {
    cwd: root,
    env: { ...process.env, PINAXIS_DB: fixture },
    stdio: "inherit",
  });
  return JSON.parse(readFileSync(summaryPath, "utf8"));
}

function runGate() {
  execFileSync("node", ["scripts/assert-public-safe.mjs"], { cwd: root, stdio: "pipe" });
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
assert.equal(totals.repositories, 5, "o/eps holds only a dependency coordinate, which is not exposure");
assert.equal(totals.locations, 12, "one row per repository and path a credential appeared in");
assert.equal(totals.backlog, 5, "the pending frontier");

const gcp = publicSummary.credentialTypes.find((row) => row.target === "gcp-api-key");
assert.equal(gcp.verification, "format-only");
const github = publicSummary.credentialTypes.find((row) => row.target === "github-token");
assert.equal(github.verification, "validated");

assert.deepEqual(publicSummary.exposure.topRepositories, [],
  "a public summary never names a repository");
assert.equal(publicSummary.exposure.repositories, 5);
assert.equal(publicSummary.exposure.worst, 8, "o/alpha holds eight credential locations");
assert.deepEqual(publicSummary.exposure.histogram, [
  { bucket: "1", repos: 4 },
  { bucket: "2-3", repos: 0 },
  { bucket: "4-9", repos: 1 },
  { bucket: "10 or more", repos: 0 },
]);
assert.equal(privateSummary.exposure.topRepositories[0].repository, "o/alpha");
assert.equal(privateSummary.exposure.topRepositories[0].findings, 8);

const env = publicSummary.fileTypes.find((row) => row.extension === ".env");
assert.equal(env.findings, 2, "secrets are grouped by the extension of the file they sat in");
assert.equal(publicSummary.fileTypes.reduce((n, row) => n + row.findings, 0), 12);
assert.deepEqual(publicSummary.fileTypes.find((row) => row.extension === ".js"),
  { extension: ".js", findings: 3 }, "a path with a directory component is counted by its extension alone");
assert.deepEqual(publicSummary.fileTypes.find((row) => row.extension === "(other)"),
  { extension: "(other)", findings: 1 }, "a datestamped suffix is not an extension and must not be published");
assert.deepEqual(publicSummary.fileTypes.find((row) => row.extension === "(no extension)"),
  { extension: "(no extension)", findings: 1 },
  "a backslash path whose only dot sits in a directory name has no extension to report");
for (const row of publicSummary.fileTypes) {
  assert.ok(!row.extension.includes("/") && !row.extension.includes("\\"),
    `${row.extension} must carry no path separator`);
}

const react = publicSummary.versionSpread.find((row) => row.value === "react");
assert.equal(react.target, "npm-package");
assert.deepEqual(react.variants, [
  { variant: "18.2.0", sightings: 5 },
  { variant: "17.0.2", sightings: 2 },
]);
assert.ok(publicSummary.versionSpread.every((row) => row.variants.length > 0),
  "a dependency with no recorded variant is not listed");

const flask = publicSummary.versionSpread.find((row) => row.value === "flask");
assert.deepEqual(flask.variants, [{ variant: "==2.3.0", sightings: 2 }],
  "a bare variant is dropped while a real version survives");
assert.equal(publicSummary.versionSpread.find((row) => row.value === "left-pad"), undefined,
  "a dependency whose only variant is bare is not listed");
assert.equal(publicSummary.versionSpread.find((row) => row.target === "github-action"), undefined,
  "a CI action ref is not a dependency and is not listed under one");

assert.deepEqual(publicSummary.timeline, [
  { date: "2026-09-14", findings: 3, credentials: 2 },
  { date: "2026-09-15", findings: 3, credentials: 2 },
  { date: "2026-09-16", findings: 2, credentials: 2 },
]);
assert.equal(publicSummary.coverage.backlog, 5);
assert.deepEqual(publicSummary.coverage.sources, ["github"]);
const pypi = publicSummary.coverage.byTarget.find((row) => row.target === "pypi-package");
assert.deepEqual(pypi, { target: "pypi-package", counted: 1, total: 2 });

assert.equal(publicSummary.mode, "public");
assert.equal(privateSummary.mode, "private");

const FIXTURE_REPOSITORIES = ["o/alpha", "o/alpha2", "o/beta", "o/gamma", "o/delta", "o/eps"];
const publicDocument = JSON.stringify(build("public"));
for (const repository of FIXTURE_REPOSITORIES) {
  assert.ok(!publicDocument.includes(repository), `a public summary must not name ${repository}`);
}

runGate();

const tampered = JSON.parse(publicDocument);
tampered.credentialTypes[0].target = `ghp_${"a".repeat(36)}`;
writeFileSync(summaryPath, JSON.stringify(tampered));
let rejected = false;
try {
  runGate();
} catch {
  rejected = true;
}
assert.ok(rejected, "the safety gate must exit non-zero on a summary carrying a token marker");

build("public");
console.log("summary checks passed");
