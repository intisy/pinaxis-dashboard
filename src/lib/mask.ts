// Credential findings hold the raw leaked secret in `value`. The dashboard must never present a
// browsable index of live keys, so any credential value is shown as a short prefix plus a redaction.
export function maskSecret(value: string): string {
  const visible = value.slice(0, Math.min(6, Math.max(0, value.length - 4)));
  return visible.length > 0 ? `${visible}…••••` : "••••";
}

export function isCredentialCategory(category: string | null | undefined): boolean {
  return category === "credentials";
}
