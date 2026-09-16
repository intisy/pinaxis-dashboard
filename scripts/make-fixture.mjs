import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const D1 = "2026-09-14T10:00:00Z";
const D2 = "2026-09-15T10:00:00Z";
const D3 = "2026-09-16T10:00:00Z";

const RESULTS = [
  ["github-token", "ghp_a", 0, "credentials", "o/alpha", ".env", 2, D1],
  ["github-token", "ghp_b", 0, "credentials", "o/beta", "config.md", 1, D2],
  ["openai-api-key", "sk-a", 0, "credentials", "o/alpha", "notes.md", 1, D1],
  ["gcp-api-key", "AIza_a", 1, "credentials", "o/gamma", "app.js", 1, D2],
  ["gcp-api-key", "AIza_b", 1, "credentials", "o/alpha", "app.js", 1, D3],
  ["gcp-service-account-key", "sa@x.iam.gserviceaccount.com", 1, "credentials", "o/delta", "key.txt", 1, D3],
  ["stripe-publishable-key", "pk_live_a", 1, "public-keys", "o/beta", "index.html", 1, D1],
  ["maven-coordinate", "com.foo:bar:1.0", 1, "dependencies", "o/eps", "build.gradle", 1, D2],
];

const LOCATIONS = [
  ["github-token", "ghp_a", "o/alpha", ".env", D1],
  ["github-token", "ghp_a", "o/alpha2", ".env", D1],
  ["github-token", "ghp_b", "o/beta", "config.md", D2],
  ["openai-api-key", "sk-a", "o/alpha", "notes.md", D1],
  ["gcp-api-key", "AIza_a", "o/gamma", "app.js", D2],
  ["gcp-api-key", "AIza_b", "o/alpha", "app.js", D3],
  ["gcp-service-account-key", "sa@x.iam.gserviceaccount.com", "o/delta", "key.txt", D3],
  ["stripe-publishable-key", "pk_live_a", "o/beta", "index.html", D1],
  ["maven-coordinate", "com.foo:bar:1.0", "o/eps", "build.gradle", D2],
];

const REFERENCES = [
  ["npm-package", "react", "npmjs.com", "dependencies", 5000, 3],
  ["npm-package", "left-pad", "npmjs.com", "dependencies", 100, 1],
  ["pypi-package", "flask", "pypi.org", "dependencies", 900, 2],
  ["stack-tool", "docker", null, "tech-stack", 7864320, 0],
  ["pypi-package", "uncounted", "pypi.org", "dependencies", null, 1],
];

const VARIANTS = [
  ["npm-package", "react", "18.2.0", 5],
  ["npm-package", "react", "17.0.2", 2],
  ["pypi-package", "flask", "==2.3.0", 2],
];

const initSqlJs = require("sql.js");
const SQL = await initSqlJs();
const db = new SQL.Database();
db.run(`
  CREATE TABLE result (target TEXT NOT NULL, value TEXT NOT NULL, valid INTEGER NOT NULL,
    source TEXT NOT NULL, category TEXT, repository TEXT, path TEXT,
    occurrences INTEGER NOT NULL DEFAULT 0, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
    PRIMARY KEY (target, value));
  CREATE TABLE result_location (target TEXT NOT NULL, value TEXT NOT NULL, repository TEXT NOT NULL,
    path TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
    PRIMARY KEY (target, value, repository, path));
  CREATE TABLE validity_cache (target TEXT NOT NULL, value TEXT NOT NULL, valid INTEGER NOT NULL,
    checked_at TEXT NOT NULL, PRIMARY KEY (target, value));
  CREATE TABLE pending (source TEXT NOT NULL, target TEXT NOT NULL, query TEXT NOT NULL,
    PRIMARY KEY (source, target, query));
  CREATE TABLE reference (target TEXT NOT NULL, value TEXT NOT NULL, registry TEXT, category TEXT,
    popularity INTEGER, sightings INTEGER NOT NULL DEFAULT 0, first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL, last_counted TEXT, PRIMARY KEY (target, value));
  CREATE TABLE reference_variant (target TEXT NOT NULL, value TEXT NOT NULL, variant TEXT NOT NULL,
    sightings INTEGER NOT NULL DEFAULT 0, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
    PRIMARY KEY (target, value, variant));
  PRAGMA user_version = 2;
`);
for (const [target, value, valid, category, repository, path, occurrences, seen] of RESULTS) {
  db.run("INSERT INTO result VALUES (?,?,?,'github',?,?,?,?,?,?)",
    [target, value, valid, category, repository, path, occurrences, seen, seen]);
}
for (const [target, value, repository, path, seen] of LOCATIONS) {
  db.run("INSERT INTO result_location VALUES (?,?,?,?,?,?)", [target, value, repository, path, seen, seen]);
}
for (const [target, value, registry, category, popularity, sightings] of REFERENCES) {
  db.run("INSERT INTO reference VALUES (?,?,?,?,?,?,?,?,?)",
    [target, value, registry, category, popularity, sightings, D1, D3, D3]);
}
for (const [target, value, variant, sightings] of VARIANTS) {
  db.run("INSERT INTO reference_variant VALUES (?,?,?,?,?,?)", [target, value, variant, sightings, D1, D3]);
}
for (let index = 0; index < 5; index += 1) {
  db.run("INSERT INTO pending VALUES ('github','github-token',?)", [`q${index}`]);
}

mkdirSync(join(root, "scratch"), { recursive: true });
writeFileSync(join(root, "scratch", "fixture.db"), Buffer.from(db.export()));
db.close();
console.log("wrote scratch/fixture.db");
