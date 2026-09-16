export interface CategoryCount {
  category: string;
  findings: number;
  distinctTargets: number;
}

export interface CredentialType {
  target: string;
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
  liveCredentials: number;
  references: number;
  lastUpdated: string | null;
}
