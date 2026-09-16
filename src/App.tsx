import { useEffect, useMemo, useState } from "react";
import type { Database } from "sql.js";
import { database } from "./data/db";
import {
  categoryCounts,
  credentialTypes,
  referenceCategories,
  topLeakedSecrets,
  totals,
} from "./data/queries";
import { Overview } from "./components/Overview";
import { ExposedSecrets } from "./components/ExposedSecrets";
import { Ecosystem } from "./components/Ecosystem";
import { relativeTime } from "./lib/format";

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    database()
      .then(setDb)
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const model = useMemo(() => {
    if (!db) {
      return null;
    }
    // A published dataset from before the schema change lacks the new columns; treat that as a
    // transient "rebuilding" state rather than a crash, since the crawler republishes on its next run.
    try {
      return {
        totals: totals(db),
        categories: categoryCounts(db),
        credentialTypes: credentialTypes(db),
        leaks: topLeakedSecrets(db),
        referenceCategories: referenceCategories(db),
      };
    } catch {
      return "rebuilding" as const;
    }
  }, [db]);

  if (error) {
    return (
      <div className="app">
        <div className="state error">Could not load the dataset. {error}</div>
      </div>
    );
  }

  if (!db || !model) {
    return (
      <div className="app">
        <div className="state">Loading the dataset{"…"}</div>
      </div>
    );
  }

  if (model === "rebuilding") {
    return (
      <div className="app">
        <div className="state">The dataset is being rebuilt. Check back after the next crawl.</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="masthead">
        <h1>Pinaxis</h1>
        <span className="updated">updated {relativeTime(model.totals.lastUpdated)}</span>
      </div>
      <p className="tagline">A live survey of public code: exposed secrets and what the ecosystem is built from.</p>

      <Overview totals={model.totals} categories={model.categories} />
      <ExposedSecrets types={model.credentialTypes} leaks={model.leaks} />
      <Ecosystem db={db} categories={model.referenceCategories} />
    </div>
  );
}
