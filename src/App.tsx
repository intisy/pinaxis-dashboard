import { useEffect, useState } from "react";
import { loadModel } from "./data/source";
import type { Model } from "./data/model";
import { Overview } from "./components/Overview";
import { ExposedSecrets } from "./components/ExposedSecrets";
import { Exposure } from "./components/Exposure";
import { Ecosystem } from "./components/Ecosystem";
import { Coverage } from "./components/Coverage";
import { relativeTime } from "./lib/format";

type State =
  | { status: "loading" }
  | { status: "rebuilding" }
  | { status: "error"; message: string }
  | { status: "ready"; model: Model };

export default function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadModel()
      .then((model) => !cancelled && setState({ status: "ready", model }))
      .catch((cause) => {
        if (cancelled) {
          return;
        }
        // A dataset from before the schema change lacks the new columns; show a transient notice.
        const message = cause instanceof Error ? cause.message : String(cause);
        setState(/column|table|schema/i.test(message)
          ? { status: "rebuilding" }
          : { status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <Shell><div className="state">Loading the dataset{"…"}</div></Shell>;
  }
  if (state.status === "rebuilding") {
    return <Shell><div className="state">The dataset is being rebuilt. Check back after the next crawl.</div></Shell>;
  }
  if (state.status === "error") {
    return <Shell><div className="state error">Could not load the dataset. {state.message}</div></Shell>;
  }

  const { model } = state;
  return (
    <div className="app">
      <div className="masthead">
        <h1>Pinaxis</h1>
        <span className="updated">updated {relativeTime(model.totals.lastUpdated)}</span>
      </div>
      <p className="tagline">A live survey of public code: exposed secrets and what the ecosystem is built from.</p>
      <p className="section-note">
        Pinaxis crawls public code search for leaked credentials and for the dependencies, base images
        and CI actions that public projects are built from. It stores what it finds, re-checks whether
        the keys it can probe still work, and publishes the result as an open dataset.
      </p>

      <Overview totals={model.totals} categories={model.categories} />
      <ExposedSecrets types={model.credentialTypes} leaks={model.leaks} />
      <Exposure exposure={model.exposure} fileTypes={model.fileTypes} />
      <Ecosystem
        categories={model.referenceCategories}
        references={model.references}
        versionSpread={model.versionSpread}
      />
      <Coverage coverage={model.coverage} timeline={model.timeline} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app">{children}</div>;
}
