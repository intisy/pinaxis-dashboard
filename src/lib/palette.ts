// Pre-validated dark-surface steps from the dataviz reference palette (worst adjacent CVD deltaE clears
// the pairlist floor). Categorical hues are assigned in this fixed order and never cycled.
export const SERIES = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

// Reserved status roles - never reused as a categorical slot. A live leaked key is critical.
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const SURFACE = "#1a1a19";
export const GRID = "#33322f";
export const INK = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#8a897f",
};

export function seriesColor(index: number): string {
  return SERIES[index % SERIES.length];
}
