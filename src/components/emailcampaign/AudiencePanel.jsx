import React from "react";
import { Button } from "@/components/ui/button";
import { EMAIL_LANGUAGE_LABELS } from "./emailLanguages";

const GOLD = "#D4A574";

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(180,140,75,0.18)" }}>
      <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "rgba(224,216,200,0.55)" }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: "#F5F1E7" }}>{value}</p>
      {hint && <p className="text-[10px] mt-0.5" style={{ color: "rgba(224,216,200,0.45)" }}>{hint}</p>}
    </div>
  );
}

/** Live eligible recipient population with the reason every exclusion applies. */
export default function AudiencePanel({ audience, loading, onRefresh }) {
  const totals = audience?.totals || {};
  const byLanguage = audience?.by_language || {};
  const exclusions = audience?.exclusions || [];
  const sample = audience?.sample || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>
          Recalculated from live accounts, subscriptions and consent records on every refresh.
        </p>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>{loading ? "Calculating…" : "Recalculate"}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Eligible recipients" value={totals.eligible ?? "—"} hint="Will receive the email" />
        <Stat label="Excluded" value={totals.excluded ?? "—"} hint="See reasons below" />
        <Stat label="Suppressed addresses" value={totals.suppressed_addresses ?? "—"} hint="Unsubscribed / bounced" />
        <Stat label="Already emailed" value={totals.already_emailed ?? "—"} hint="Duplicate protection" />
      </div>

      {audience && audience.deliverable === false && (
        <p className="text-xs rounded-lg p-3" style={{ background: "rgba(224,155,155,0.12)", color: "#F0B9A8" }}>
          The redemption window is closed, so this email cannot be distributed.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#F5F1E7" }}>Language breakdown</p>
          {Object.keys(byLanguage).length === 0 ? (
            <p className="text-xs" style={{ color: "rgba(224,216,200,0.5)" }}>No eligible recipients.</p>
          ) : (
            <ul className="space-y-1">
              {Object.entries(byLanguage).map(([code, count]) => (
                <li key={code} className="flex items-center justify-between text-xs">
                  <span style={{ color: "rgba(224,216,200,0.8)" }}>{EMAIL_LANGUAGE_LABELS[code] || code}</span>
                  <span style={{ color: GOLD }}>{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#F5F1E7" }}>Exclusions</p>
          {exclusions.length === 0 ? (
            <p className="text-xs" style={{ color: "rgba(224,216,200,0.5)" }}>Nobody is excluded.</p>
          ) : (
            <ul className="space-y-1">
              {exclusions.map((row) => (
                <li key={row.reason} className="flex items-center justify-between text-xs">
                  <span style={{ color: "rgba(224,216,200,0.8)" }}>{row.label}</span>
                  <span style={{ color: "rgba(224,216,200,0.6)" }}>{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {sample.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#F5F1E7" }}>First recipients</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ color: "rgba(224,216,200,0.55)" }}>
                  <th className="text-left py-1 pr-3">Email</th>
                  <th className="text-left py-1">Language</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((row) => (
                  <tr key={row.email} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <td className="py-1 pr-3" style={{ color: "rgba(224,216,200,0.85)" }}>{row.email}</td>
                    <td className="py-1" style={{ color: "rgba(224,216,200,0.65)" }}>{EMAIL_LANGUAGE_LABELS[row.language] || row.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}