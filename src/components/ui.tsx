import type { ReactNode } from "react";
import { SURFACE, INK } from "../lib/palette";

export function StatTile({ value, label, alarm }: { value: ReactNode; label: string; alarm?: boolean }) {
  return (
    <div className="tile">
      <div className={alarm ? "value alarm" : "value"}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

export function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        background: SURFACE,
        border: "1px solid #33322f",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 12,
      }}
    >
      <div style={{ color: INK.primary, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: INK.secondary, display: "flex", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: entry.color, marginTop: 2 }} />
          <span>
            {entry.name}: {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
