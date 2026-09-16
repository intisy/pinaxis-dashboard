export interface CategoryCount {
  category: string;
  findings: number;
  distinctTargets: number;
}

export type Verification = "validated" | "format-only";

export interface CredentialType {
  target: string;
  category: string;
  verification: Verification;
  total: number;
  live: number;
  dead: number;
}

export interface LeakedSecret {
  target: string;
  value: string;
  valid: boolean;
  repository: string | null;
  occurrences: number;
  lastSeen: string;
}

export interface ReferenceRow {
  target: string;
  value: string;
  registry: string | null;
  category: string | null;
  popularity: number | null;
  sightings: number;
}

export interface Totals {
  findings: number;
  credentials: number;
  validatedChecked: number;
  validatedLive: number;
  formatMatches: number;
  publicKeys: number;
  references: number;
  repositories: number;
  locations: number;
  backlog: number;
  lastUpdated: string | null;
}

export interface ExposureBucket {
  bucket: string;
  repos: number;
}

export interface TopRepository {
  repository: string;
  findings: number;
  targets: string[];
  lastSeen: string;
}

export interface Exposure {
  repositories: number;
  findings: number;
  worst: number;
  histogram: ExposureBucket[];
  topRepositories: TopRepository[];
}

export interface FileType {
  extension: string;
  findings: number;
}

export interface VersionSpread {
  target: string;
  value: string;
  variants: { variant: string; sightings: number }[];
}
