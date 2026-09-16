import { type Database } from "sql.js";
import {
  categoryCounts,
  credentialTypes,
  referenceCategories,
  referencesByCategory,
  topLeakedSecrets,
  totals,
} from "./queries";
import type { CategoryCount, CredentialType, LeakedSecret, ReferenceRow, Totals } from "./types";

// Everything the dashboard renders, precomputed. The public build ships this shape as sanitized JSON
// with `leaks` emptied; the private build computes it live from the raw database, leaks included.
export interface Model {
  totals: Totals;
  categories: CategoryCount[];
  credentialTypes: CredentialType[];
  leaks: LeakedSecret[];
  referenceCategories: string[];
  references: Record<string, ReferenceRow[]>;
}

export function buildModel(db: Database): Model {
  return {
    totals: totals(db),
    categories: categoryCounts(db),
    credentialTypes: credentialTypes(db),
    leaks: topLeakedSecrets(db),
    referenceCategories: referenceCategories(db),
    references: referencesByCategory(db),
  };
}
