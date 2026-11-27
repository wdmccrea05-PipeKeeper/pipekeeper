import React from "react";
import { Button } from "@/components/ui/button";

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

const percent = (value) => (value == null ? "—" : `${Math.round(Number(value) * 1000) / 10}%`);

/** Email performance joined with the appreciation campaign's attribution. */
export default function CampaignAnalytics({ report, loading, onRefresh }) {
  const totals = report?.totals || {};
  const channels = report?.activation_channels || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>
          {report?.generated_at ? `Updated ${new Date(report.generated_at).toLocaleString()}` : "Not loaded yet."}
        </p>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Eligible recipients" value={totals.eligible ?? "—"} />
        <Stat label="Emails queued" value={totals.queued ?? "—"} />
        <Stat label="Emails sent" value={totals.sent ?? "—"} />
        <Stat label="Successful deliveries" value={totals.delivered ?? "—"} />
        <Stat label="Failed deliveries" value={totals.failed ?? "—"} />
        <Stat label="Bounces" value={totals.bounced ?? "—"} />
        <Stat label="Unsubscribes" value={totals.unsubscribed ?? "—"} />
        <Stat label="Link clicks" value={totals.clicks ?? "—"} hint={`Click rate ${percent(totals.click_rate)}`} />
        <Stat label="Pro activations" value={totals.activations ?? "—"} hint={`Activation rate ${percent(totals.activation_rate)}`} />
        <Stat label="Paid conversions" value={totals.conversions ?? "—"} hint={`Conversion rate ${percent(totals.conversion_rate)}`} />
        <Stat label="Attributable revenue" value={totals.attributable_revenue != null ? `$${totals.attributable_revenue}` : "—"} />
        <Stat label="Email-driven activations" value={channels.email ?? 0} hint={`Facebook ${channels.facebook ?? 0} · Organic ${channels.organic ?? 0}`} />
      </div>

      {report?.campaigns?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ color: "rgba(224,216,200,0.55)" }}>
                <th className="text-left py-1.5 pr-3">Campaign</th>
                <th className="text-left py-1.5 pr-3">Status</th>
                <th className="text-left py-1.5 pr-3">Sent</th>
                <th className="text-left py-1.5 pr-3">Clicks</th>
                <th className="text-left py-1.5 pr-3">Activations</th>
                <th className="text-left py-1.5 pr-3">Failed</th>
                <th className="text-left py-1.5">Unsubscribed</th>
              </tr>
            </thead>
            <tbody>
              {report.campaigns.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="py-1.5 pr-3" style={{ color: "rgba(224,216,200,0.9)" }}>{row.name}</td>
                  <td className="py-1.5 pr-3" style={{ color: GOLD }}>{row.status}</td>
                  <td className="py-1.5 pr-3">{row.sent}</td>
                  <td className="py-1.5 pr-3">{row.clicks}</td>
                  <td className="py-1.5 pr-3">{row.activations}</td>
                  <td className="py-1.5 pr-3">{row.failed}</td>
                  <td className="py-1.5">{row.unsubscribed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px]" style={{ color: "rgba(224,216,200,0.4)" }}>{report?.attribution_rule}</p>
    </div>
  );
}