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

console.log("summary checks passed");
