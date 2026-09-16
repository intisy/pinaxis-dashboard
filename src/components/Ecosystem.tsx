import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReferenceRow } from "../data/types";
import { compactNumber } from "../lib/format";
import { GRID, INK, SERIES } from "../lib/palette";
import { ChartTooltip } from "./ui";

export function Ecosystem({
  categories,
  references,
}: {
  categories: string[];
  references: Record<string, ReferenceRow[]>;
}) {
  const [category, setCategory] = useState(categories[0] ?? "");
  const chartData = (references[category] ?? [])
    .map((row) => ({ value: row.value, metric: row.popularity ?? row.sightings }))
    .filter((row) => row.metric > 0);

  return (
    <section>
      <h2>Ecosystem prevalence</h2>
      <p className="section-note">
        What public code is built from - the most common dependencies, tooling and CI actions Pinaxis
        has counted. Popularity is an approximate file count.
      </p>

      <div className="tabs">
        {categories.map((name) => (
          <button key={name} aria-pressed={name === category} onClick={() => setCategory(name)}>
            {name}
          </button>
        ))}
      </div>

      <div className="card">
        <h3>Most common in {category || "—"}</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 34)}>
            <BarChart layout="vertical" data={chartData} margin={{ left: 8, right: 32 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis
                type="number"
                stroke={INK.muted}
                tick={{ fill: INK.muted, fontSize: 12 }}
                tickFormatter={(value: number) => compactNumber(value)}
              />
              <YAxis
                type="category"
                dataKey="value"
                width={160}
                stroke={INK.muted}
                tick={{ fill: INK.secondary, fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "#ffffff10" }} content={<ChartTooltip />} />
              <Bar dataKey="metric" name="popularity" fill={SERIES[2]} radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No counted references in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}
