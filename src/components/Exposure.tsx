import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Exposure as ExposureData, FileType } from "../data/types";
import { compactNumber, relativeTime } from "../lib/format";
import { GRID, INK, SERIES } from "../lib/palette";
import { MODE } from "../data/source";
import { ChartTooltip, StatTile } from "./ui";

export function Exposure({ exposure, fileTypes }: { exposure: ExposureData; fileTypes: FileType[] }) {
  return (
    <section>
      <h2>Where the exposure sits</h2>
      <p className="section-note">
        How findings spread across repositories, and the kinds of file they were sitting in. Repository
        names are withheld from the public view so this page cannot serve as a target list.
      </p>

      <div className="tiles">
        <StatTile value={compactNumber(exposure.repositories)} label="repositories affected" />
        <StatTile value={compactNumber(exposure.findings)} label="findings in place" />
        <StatTile value={compactNumber(exposure.worst)} label="findings in the worst repository" />
      </div>

      <div className="card">
        <h3>Findings per repository</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={exposure.histogram} margin={{ left: 8, right: 24 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="bucket" stroke={INK.muted} tick={{ fill: INK.secondary, fontSize: 12 }} />
            <YAxis stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} />
            <Tooltip cursor={{ fill: "#ffffff10" }} content={<ChartTooltip />} />
            <Bar dataKey="repos" name="repositories" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>What kind of file leaked</h3>
        <ResponsiveContainer width="100%" height={Math.max(140, fileTypes.length * 32)}>
          <BarChart layout="vertical" data={fileTypes.slice(0, 12)} margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="extension"
              width={120}
              stroke={INK.muted}
              tick={{ fill: INK.secondary, fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: "#ffffff10" }} content={<ChartTooltip />} />
            <Bar dataKey="findings" name="findings" fill={SERIES[1]} radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {MODE === "private" && (
        <div className="card">
          <h3>Most affected repositories</h3>
          <table>
            <thead>
              <tr>
                <th>repository</th>
                <th>findings</th>
                <th>targets</th>
                <th>last seen</th>
              </tr>
            </thead>
            <tbody>
              {exposure.topRepositories.map((row) => (
                <tr key={row.repository}>
                  <td className="mono">{row.repository}</td>
                  <td>{compactNumber(row.findings)}</td>
                  <td>{row.targets.join(", ")}</td>
                  <td>{relativeTime(row.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
