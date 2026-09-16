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
const PUBLIC_KEYS = "public-keys";
const PRIVATE = process.argv[2] === "private";
const REPO = "intisy/pinaxis";

/**
 * @remarks a detector absent from this set is treated as format-only, so a detector added to pinaxis
 * later understates rather than overstates until it is listed here.
 */
const VALIDATED = new Set(["openai-api-key", "stripe-secret-key", "github-token", "gcp-service-account-key"]);

function maskSecret(value) {
  const visible = value.slice(0, Math.min(6, Math.max(0, value.length - 4)));
  return visible.length > 0 ? `${visible}…••••` : "••••";
}

/**
 * @remarks resolving the highest dataset-v<N> release means a schema bump in pinaxis repoints the
 * dashboard on its own, instead of needing a matching edit here.
 */
function datasetTag() {
  const listed = execFileSync(
    "gh",
    ["release", "list", "--repo", REPO, "--limit", "100", "--json", "tagName"],
    { encoding: "utf8" },
  );
  const versions = JSON.parse(listed)
    .map((release) => /^dataset-v(\d+)$/.exec(release.tagName))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return versions.length > 0 ? `dataset-v${Math.max(...versions)}` : "dataset";
}

function fetchDatabase() {
  if (process.env.PINAXIS_DB) {
    return { path: resolve(process.env.PINAXIS_DB), dir: null };
  }
  const dir = mkdtempSync(join(tmpdir(), "pinaxis-"));
  execFileSync(
    "gh",
    ["release", "download", datasetTag(), "--repo", REPO, "--pattern", "pinaxis.db", "--dir", dir, "--clobber"],
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

function credentialTypes(db) {
  return all(
    db,
    `SELECT target, COALESCE(category,'uncategorized') AS category, COUNT(*) AS total,
        SUM(CASE WHEN valid=1 THEN 1 ELSE 0 END) AS live,
        SUM(CASE WHEN valid=0 THEN 1 ELSE 0 END) AS dead
       FROM result WHERE category IN (?,?) GROUP BY target, category ORDER BY total DESC`,
    [CREDENTIALS, PUBLIC_KEYS],
  ).map((row) => ({ ...row, verification: VALIDATED.has(row.target) ? "validated" : "format-only" }));
}

function sum(rows, field) {
  return rows.reduce((running, row) => running + row[field], 0);
}

const BUCKETS = [
  { bucket: "1", fits: (n) => n === 1 },
  { bucket: "2-3", fits: (n) => n >= 2 && n <= 3 },
  { bucket: "4-9", fits: (n) => n >= 4 && n <= 9 },
  { bucket: "10 or more", fits: (n) => n >= 10 },
];

function exposure(db) {
  const perRepository = all(
    db,
    `SELECT repository, COUNT(*) AS findings, MAX(last_seen) AS lastSeen,
        GROUP_CONCAT(DISTINCT target) AS targets
       FROM result_location GROUP BY repository ORDER BY findings DESC, repository`,
  );
  return {
    repositories: perRepository.length,
    findings: perRepository.reduce((running, row) => running + row.findings, 0),
    worst: perRepository.length > 0 ? perRepository[0].findings : 0,
    histogram: BUCKETS.map(({ bucket, fits }) => ({
      bucket,
      repos: perRepository.filter((row) => fits(row.findings)).length,
    })),
    topRepositories: PRIVATE
      ? perRepository.slice(0, 25).map((row) => ({
          repository: row.repository,
          findings: row.findings,
          targets: row.targets.split(","),
          lastSeen: row.lastSeen,
        }))
      : [],
  };
}

/**
 * @remarks a leading-dot file has no extension to strip, and its whole name is the signal worth
 * reporting: ".env" is the most security-relevant filename in the dataset.
 */
function extensionOf(path) {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  if (dot < 0) {
    return "(no extension)";
  }
  return dot === 0 ? base.toLowerCase() : base.slice(dot).toLowerCase();
}

function fileTypes(db) {
  const counts = new Map();
  for (const row of all(db, "SELECT path FROM result_location")) {
    const extension = extensionOf(row.path);
    counts.set(extension, (counts.get(extension) ?? 0) + 1);
  }
  return [...counts]
    .map(([extension, findings]) => ({ extension, findings }))
    .sort((left, right) => right.findings - left.findings || left.extension.localeCompare(right.extension));
}

function summarise(db) {
  const types = credentialTypes(db);
  const credentialRows = types.filter((row) => row.category === CREDENTIALS);
  const validated = credentialRows.filter((row) => row.verification === "validated");
  const [findings] = all(db, "SELECT COUNT(*) AS n FROM result");
  const [refCount] = all(db, "SELECT COUNT(*) AS n FROM reference");
  const [backlog] = all(db, "SELECT COUNT(*) AS n FROM pending");
  const [places] = all(
    db,
    "SELECT COUNT(*) AS locations, COUNT(DISTINCT repository) AS repositories FROM result_location",
  );
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
      findings: findings.n ?? 0,
      credentials: sum(credentialRows, "total"),
      validatedChecked: sum(validated, "total"),
      validatedLive: sum(validated, "live"),
      formatMatches: sum(credentialRows.filter((row) => row.verification === "format-only"), "total"),
      publicKeys: sum(types.filter((row) => row.category === PUBLIC_KEYS), "total"),
      references: refCount.n ?? 0,
      repositories: places.repositories ?? 0,
      locations: places.locations ?? 0,
      backlog: backlog.n ?? 0,
      lastUpdated: updated.ts ?? null,
    },
    categories,
    credentialTypes: types,
    leaks: leaks(db),
    referenceCategories,
    references,
    exposure: exposure(db),
    fileTypes: fileTypes(db),
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
  if (dir) {
    rmSync(dir, { recursive: true, force: true });
  }
}
