import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryCount, Totals } from "../data/types";
import { compactNumber } from "../lib/format";
import { GRID, INK, SERIES } from "../lib/palette";
import { ChartTooltip, StatTile } from "./ui";

export function Overview({ totals, categories }: { totals: Totals; categories: CategoryCount[] }) {
  const livePercent =
    totals.credentials > 0 ? Math.round((totals.liveCredentials / totals.credentials) * 100) : 0;
  return (
    <section>
      <h2>Overview</h2>
      <p className="section-note">Everything Pinaxis has surfaced from public code, at a glance.</p>
      <div className="tiles">
        <StatTile value={compactNumber(totals.findings)} label="total findings" />
        <StatTile value={compactNumber(totals.credentials)} label="exposed credentials" />
        <StatTile
          value={`${compactNumber(totals.liveCredentials)} (${livePercent}%)`}
          label="still live"
          alarm={totals.liveCredentials > 0}
        />
        <StatTile value={compactNumber(totals.references)} label="ecosystem references" />
      </div>

      <div className="card">
        <h3>Findings by category</h3>
        <ResponsiveContainer width="100%" height={Math.max(140, categories.length * 42)}>
          <BarChart layout="vertical" data={categories} margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="category"
              width={120}
              stroke={INK.muted}
              tick={{ fill: INK.secondary, fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: "#ffffff10" }} content={<ChartTooltip />} />
            <Bar dataKey="findings" name="findings" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
