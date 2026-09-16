import { type Database } from "sql.js";
import { rows } from "./db";
import { maskSecret } from "../lib/mask";
import type {
  CategoryCount,
  CredentialType,
  LeakedSecret,
  ReferenceRow,
  Totals,
} from "./types";

const CREDENTIALS = "credentials";

export function totals(db: Database): Totals {
  const [counts] = rows<{
    findings: number;
    credentials: number;
    live: number;
  }>(
    db,
    `SELECT
        COUNT(*) AS findings,
        SUM(CASE WHEN category = ? THEN 1 ELSE 0 END) AS credentials,
        SUM(CASE WHEN category = ? AND valid = 1 THEN 1 ELSE 0 END) AS live
      FROM result`,
    [CREDENTIALS, CREDENTIALS],
  );
  const [references] = rows<{ n: number }>(db, "SELECT COUNT(*) AS n FROM reference");
  const [updated] = rows<{ ts: string | null }>(
    db,
    `SELECT MAX(ts) AS ts FROM (
        SELECT MAX(last_seen) AS ts FROM result
        UNION ALL SELECT MAX(last_seen) FROM reference)`,
  );
  return {
    findings: counts?.findings ?? 0,
    credentials: counts?.credentials ?? 0,
    liveCredentials: counts?.live ?? 0,
    references: references?.n ?? 0,
    lastUpdated: updated?.ts ?? null,
  };
}

export function categoryCounts(db: Database): CategoryCount[] {
  return rows<CategoryCount>(
    db,
    `SELECT COALESCE(category, 'uncategorized') AS category,
            COUNT(*) AS findings,
            COUNT(DISTINCT target) AS distinctTargets
       FROM result
      GROUP BY category
      ORDER BY findings DESC`,
  );
}

export function credentialTypes(db: Database): CredentialType[] {
  return rows<CredentialType>(
    db,
    `SELECT target,
            COUNT(*) AS total,
            SUM(CASE WHEN valid = 1 THEN 1 ELSE 0 END) AS live,
            SUM(CASE WHEN valid = 0 THEN 1 ELSE 0 END) AS dead
       FROM result
      WHERE category = ?
      GROUP BY target
      ORDER BY total DESC`,
    [CREDENTIALS],
  );
}

export function topLeakedSecrets(db: Database, limit = 25): LeakedSecret[] {
  const raw = rows<{
    target: string;
    value: string;
    valid: number;
    repository: string | null;
    occurrences: number;
    last_seen: string;
  }>(
    db,
    `SELECT target, value, valid, repository, occurrences, last_seen
       FROM result
      WHERE category = ?
      ORDER BY occurrences DESC, last_seen DESC
      LIMIT ?`,
    [CREDENTIALS, limit],
  );
  return raw.map((row) => ({
    target: row.target,
    value: maskSecret(row.value),
    valid: row.valid === 1,
    repository: row.repository,
    occurrences: row.occurrences,
    lastSeen: row.last_seen,
  }));
}

export function topReferences(db: Database, category: string, limit = 15): ReferenceRow[] {
  return rows<ReferenceRow>(
    db,
    `SELECT target, value, registry, category, popularity, sightings
       FROM reference
      WHERE category = ?
      ORDER BY popularity IS NULL, popularity DESC, sightings DESC
      LIMIT ?`,
    [category, limit],
  );
}

export function referenceCategories(db: Database): string[] {
  return rows<{ category: string }>(
    db,
    `SELECT DISTINCT COALESCE(category, 'uncategorized') AS category
       FROM reference ORDER BY category`,
  ).map((row) => row.category);
}
