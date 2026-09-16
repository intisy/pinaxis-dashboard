import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CredentialType, LeakedSecret } from "../data/types";
import { compactNumber, relativeTime } from "../lib/format";
import { GRID, INK, STATUS } from "../lib/palette";
import { MODE } from "../data/source";
import { ChartTooltip } from "./ui";

const PUBLISHABLE = "public-keys";

function isPublishable(row: CredentialType) {
  return row.category === PUBLISHABLE;
}

function verificationLabel(row: CredentialType) {
  if (isPublishable(row)) {
    return "publishable, not a secret";
  }
  return row.verification === "validated" ? "probed against the provider" : "format only";
}

function liveLabel(row: CredentialType) {
  if (isPublishable(row)) {
    return "not applicable";
  }
  return row.verification === "validated" ? compactNumber(row.live) : "unknown";
}

export function ExposedSecrets({
  types,
  leaks,
}: {
  types: CredentialType[];
  leaks: LeakedSecret[];
}) {
  const probed = types.filter((row) => row.verification === "validated");
  return (
    <section>
      <h2>Exposed secrets</h2>
      <p className="section-note">
        Leaked credentials found in public code. A <strong>live</strong> key still authenticates and is
        the dangerous case. Only some detectors can prove that: the rest match a key's format and stop
        there. Values are redacted here by design.
      </p>

      <div className="card">
        <h3>Detectors</h3>
        <table>
          <thead>
            <tr>
              <th>target</th>
              <th>verification</th>
              <th>found</th>
              <th>live</th>
            </tr>
          </thead>
          <tbody>
            {types.map((row) => (
              <tr key={row.target}>
                <td>{row.target}</td>
                <td>{verificationLabel(row)}</td>
                <td>{compactNumber(row.total)}</td>
                <td>{liveLabel(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Probed credential types (live vs dead)</h3>
        <ResponsiveContainer width="100%" height={Math.max(160, probed.length * 46)}>
          <BarChart layout="vertical" data={probed} margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" stroke={INK.muted} tick={{ fill: INK.muted, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="target"
              width={130}
              stroke={INK.muted}
              tick={{ fill: INK.secondary, fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: "#ffffff10" }} content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: INK.secondary }} />
            <Bar dataKey="live" name="live" stackId="s" fill={STATUS.critical} radius={[0, 0, 0, 0]} barSize={16} />
            <Bar dataKey="dead" name="dead" stackId="s" fill={INK.muted} radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {MODE === "public" ? (
        <div className="card">
          <h3>Widest-spread leaks</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            Per-secret detail (redacted values, repositories, spread) is withheld from the public view.
          </p>
        </div>
      ) : (
      <div className="card">
        <h3>Widest-spread leaks</h3>
        <table>
          <thead>
            <tr>
              <th>type</th>
              <th>value</th>
              <th>status</th>
              <th>repos</th>
              <th>last seen</th>
            </tr>
          </thead>
          <tbody>
            {leaks.map((leak, index) => (
              <tr key={`${leak.target}-${index}`}>
                <td>{leak.target}</td>
                <td className="mono">{leak.value}</td>
                <td>
                  <span className={leak.valid ? "pill live" : "pill dead"}>
                    {leak.valid ? "live" : "dead"}
                  </span>
                </td>
                <td>{compactNumber(leak.occurrences)}</td>
                <td>{relativeTime(leak.lastSeen)}</td>
              </tr>
            ))}
            {leaks.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No credential findings in the current dataset.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
