import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Coverage as CoverageData, TimelinePoint } from "../data/types";
import { compactNumber } from "../lib/format";
import { GRID, INK, SERIES } from "../lib/palette";
import { ChartTooltip } from "./ui";

export function Coverage({ coverage, timeline }: { coverage: CoverageData; timeline: TimelinePoint[] }) {
  return (
    <section>
      <h2>Coverage and method</h2>
      <p className="section-note">
        Pinaxis crawls public code search, stores what it finds, and republishes the dataset on every
        run. These numbers say how far it has got, so nothing here reads as more complete than it is.
      </p>

      <div className="card">
        <h3>Discovery over time</h3>
        {timeline.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline} margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="date" stroke={INK.muted} tick={{ fill: INK.secondary, fontSize: 12 }} />
              <YAxis stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="findings" name="findings" stroke={SERIES[0]} dot={false} />
              <Line type="monotone" dataKey="credentials" name="credentials" stroke={SERIES[1]} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            The current dataset covers a single day ({timeline[0]?.date ?? "no data yet"}). A trend
            appears here once a second day of crawling lands.
          </p>
        )}
      </div>

      <div className="card">
        <h3>How much has been counted</h3>
        <table>
          <thead>
            <tr>
              <th>target</th>
              <th>counted</th>
              <th>discovered</th>
            </tr>
          </thead>
          <tbody>
            {coverage.byTarget.map((row) => (
              <tr key={row.target}>
                <td>{row.target}</td>
                <td>{compactNumber(row.counted)}</td>
                <td>{compactNumber(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {compactNumber(coverage.backlog)} queries are still queued. Sources in use:{" "}
          {coverage.sources.join(", ")}. Discovery reads only the first page of each search, popularity
          counts come back rounded to multiples of 1024, and this page is a snapshot taken at deploy time.
        </p>
      </div>
    </section>
  );
}
