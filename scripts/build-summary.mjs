// Produces the summary the dashboard reads. NEITHER mode ever ships the raw database or a raw secret
// string. Public omits per-secret rows entirely; private includes a leak table with MASKED values plus
// repository/occurrence context, and is meant to sit behind Cloudflare Access. Fetch is authenticated
// because the pinaxis repo is private.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CREDENTIALS = "credentials";
const PRIVATE = process.argv[2] === "private";

function maskSecret(value) {
  const visible = value.slice(0, Math.min(6, Math.max(0, value.length - 4)));
  return visible.length > 0 ? `${visible}…••••` : "••••";
}

function fetchDatabase() {
  const dir = mkdtempSync(join(tmpdir(), "pinaxis-"));
  execFileSync(
    "gh",
    ["release", "download", "dataset", "--repo", "intisy/pinaxis", "--pattern", "pinaxis.db", "--dir", dir, "--clobber"],
    { stdio: "inherit" },
  );
  return { path: join(dir, "pinaxis.db"), dir };
}

function all(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) {
    out.push(statement.getAsObject());
  }
  statement.free();
  return out;
}

function leaks(db) {
  if (!PRIVATE) {
    return [];
  }
  return all(
    db,
    `SELECT target, value, valid, repository, occurrences, last_seen FROM result
       WHERE category=? ORDER BY occurrences DESC, last_seen DESC LIMIT 25`,
    [CREDENTIALS],
  ).map((row) => ({
    target: row.target,
    value: maskSecret(row.value),
    valid: row.valid === 1,
    repository: row.repository,
    occurrences: row.occurrences,
    lastSeen: row.last_seen,
  }));
}

function summarise(db) {
  const [counts] = all(
    db,
    `SELECT COUNT(*) AS findings,
        SUM(CASE WHEN category=? THEN 1 ELSE 0 END) AS credentials,
        SUM(CASE WHEN category=? AND valid=1 THEN 1 ELSE 0 END) AS live FROM result`,
    [CREDENTIALS, CREDENTIALS],
  );
  const [refCount] = all(db, "SELECT COUNT(*) AS n FROM reference");
  const [updated] = all(
    db,
    `SELECT MAX(ts) AS ts FROM (SELECT MAX(last_seen) AS ts FROM result
        UNION ALL SELECT MAX(last_seen) FROM reference)`,
  );
  const categories = all(
    db,
    `SELECT COALESCE(category,'uncategorized') AS category, COUNT(*) AS findings,
        COUNT(DISTINCT target) AS distinctTargets FROM result GROUP BY category ORDER BY findings DESC`,
  );
  const credentialTypes = all(
    db,
    `SELECT target, COUNT(*) AS total,
        SUM(CASE WHEN valid=1 THEN 1 ELSE 0 END) AS live,
        SUM(CASE WHEN valid=0 THEN 1 ELSE 0 END) AS dead
       FROM result WHERE category=? GROUP BY target ORDER BY total DESC`,
    [CREDENTIALS],
  );
  const referenceCategories = all(
    db,
    "SELECT DISTINCT COALESCE(category,'uncategorized') AS category FROM reference ORDER BY category",
  ).map((row) => row.category);
  const references = {};
  for (const category of referenceCategories) {
    references[category] = all(
      db,
      `SELECT target, value, registry, category, popularity, sightings FROM reference
         WHERE category=? ORDER BY popularity IS NULL, popularity DESC, sightings DESC LIMIT 15`,
      [category],
    );
  }
  return {
    totals: {
      findings: counts.findings ?? 0,
      credentials: counts.credentials ?? 0,
      liveCredentials: counts.live ?? 0,
      references: refCount.n ?? 0,
      lastUpdated: updated.ts ?? null,
    },
    categories,
    credentialTypes,
    leaks: leaks(db),
    referenceCategories,
    references,
  };
}

const initSqlJs = require("sql.js");
const { path, dir } = fetchDatabase();
try {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(path));
  const summary = summarise(db);
  db.close();
  rmSync(join(root, "public", "pinaxis.db"), { force: true });
  writeFileSync(join(root, "public", "summary.json"), JSON.stringify(summary));
  console.log(`wrote ${PRIVATE ? "PRIVATE" : "public"} summary.json (${summary.leaks.length} leak rows)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
