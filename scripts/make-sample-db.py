"""Generate a sample pinaxis.db for local development, matching the crawler's schema.

The deployed site reads the real published asset; this only fills the local dev preview.
Usage: python scripts/make-sample-db.py
"""
import sqlite3
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "pinaxis.db"
NOW = "2026-09-16T12:00:00Z"


def create_schema(cur):
    cur.execute("PRAGMA user_version = 1")
    cur.execute("""CREATE TABLE result (
        target TEXT NOT NULL, value TEXT NOT NULL, valid INTEGER NOT NULL,
        source TEXT NOT NULL, category TEXT, repository TEXT, path TEXT,
        occurrences INTEGER NOT NULL DEFAULT 0,
        first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY (target, value))""")
    cur.execute("""CREATE TABLE result_location (
        target TEXT NOT NULL, value TEXT NOT NULL, repository TEXT NOT NULL, path TEXT NOT NULL,
        first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
        PRIMARY KEY (target, value, repository, path))""")
    cur.execute("""CREATE TABLE reference (
        target TEXT NOT NULL, value TEXT NOT NULL, registry TEXT, category TEXT,
        popularity INTEGER, sightings INTEGER NOT NULL DEFAULT 0,
        first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, last_counted TEXT,
        PRIMARY KEY (target, value))""")


def credential(cur, target, value, valid, repo, occurrences):
    cur.execute(
        "INSERT INTO result VALUES (?,?,?,?,?,?,?,?,?,?)",
        (target, value, valid, "github", "credentials", repo, "config.env", occurrences, NOW, NOW),
    )


def reference(cur, target, value, registry, category, popularity, sightings):
    cur.execute(
        "INSERT INTO reference VALUES (?,?,?,?,?,?,?,?,?)",
        (target, value, registry, category, popularity, sightings, NOW, NOW, NOW),
    )


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    con = sqlite3.connect(OUT)
    cur = con.cursor()
    create_schema(cur)

    credential(cur, "openai", "sk-" + "a" * 48, 0, "acme/api", 5)
    credential(cur, "openai", "sk-" + "b" * 48, 1, "acme/bot", 3)
    credential(cur, "stripe", "sk_live_" + "c" * 24, 1, "shopco/site", 2)
    credential(cur, "stripe", "sk_live_" + "d" * 24, 0, "shopco/old", 1)
    credential(cur, "github", "ghp_" + "e" * 36, 0, "devs/ci", 4)
    credential(cur, "gcp-service-account", "bot@demo.iam.gserviceaccount.com", 0, "ml/pipeline", 1)

    for target, value, occ in [("openai", "sk-" + "a" * 48, 5), ("github", "ghp_" + "e" * 36, 4)]:
        for i in range(occ):
            cur.execute(
                "INSERT INTO result_location VALUES (?,?,?,?,?,?)",
                (target, value, f"org{i}/repo", f"path{i}.env", NOW, NOW),
            )

    reference(cur, "npm", "react", "npmjs.org", "dependencies", 8_912_000, 42)
    reference(cur, "npm", "express", "npmjs.org", "dependencies", 5_431_000, 30)
    reference(cur, "npm", "lodash", "npmjs.org", "dependencies", 4_120_000, 25)
    reference(cur, "pypi", "requests", "pypi.org", "dependencies", 3_900_000, 20)
    reference(cur, "pypi", "flask", "pypi.org", "dependencies", 1_200_000, 12)
    reference(cur, "tech-stack", "docker", None, "tech-stack", 7_864_320, 0)
    reference(cur, "tech-stack", "nextjs", None, "tech-stack", 1_310_720, 0)
    reference(cur, "github-actions", "actions/checkout", "github.com", "ci-actions", 7_176_192, 55)

    con.commit()
    con.close()
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
