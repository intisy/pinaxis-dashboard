import type {
  CategoryCount,
  Coverage,
  CredentialType,
  Exposure,
  FileType,
  LeakedSecret,
  ReferenceRow,
  TimelinePoint,
  Totals,
  VersionSpread,
} from "./types";

// Everything the dashboard renders, precomputed at build time by scripts/build-summary.mjs. A public
// build leaves `leaks` empty; a private build fills it with masked entries.
export interface Model {
  totals: Totals;
  categories: CategoryCount[];
  credentialTypes: CredentialType[];
  leaks: LeakedSecret[];
  referenceCategories: string[];
  references: Record<string, ReferenceRow[]>;
  exposure: Exposure;
  fileTypes: FileType[];
  versionSpread: VersionSpread[];
  timeline: TimelinePoint[];
  coverage: Coverage;
}
