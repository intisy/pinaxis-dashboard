export function compactNumber(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }
  if (value < 1000) {
    return String(value);
  }
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function relativeTime(iso: string | null): string {
  if (!iso) {
    return "unknown";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "unknown";
  }
  const seconds = Math.round((Date.now() - then) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size || unit === "minute") {
      return formatter.format(-Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
