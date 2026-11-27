import React from "react";
import { CAMPAIGN_STATUS_STYLES } from "./emailLanguages";

/** Delivery history for every campaign ever prepared. */
export default function CampaignHistory({ campaigns, selectedId, onSelect }) {
  if (!campaigns.length) {
    return <p className="text-xs" style={{ color: "rgba(224,216,200,0.5)" }}>No campaigns yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ color: "rgba(224,216,200,0.55)" }}>
            <th className="text-left py-1.5 pr-3">Campaign</th>
            <th className="text-left py-1.5 pr-3">Status</th>
            <th className="text-left py-1.5 pr-3">Eligible</th>
            <th className="text-left py-1.5 pr-3">Sent</th>
            <th className="text-left py-1.5 pr-3">Failed</th>
            <th className="text-left py-1.5 pr-3">Approved by</th>
            <th className="text-left py-1.5">Created</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const status = CAMPAIGN_STATUS_STYLES[campaign.status] || CAMPAIGN_STATUS_STYLES.draft;
            const active = campaign.id === selectedId;
            return (
              <tr
                key={campaign.id}
                onClick={() => onSelect(campaign.id)}
                className="cursor-pointer"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  background: active ? "rgba(212,165,116,0.08)" : "transparent",
                }}
              >
                <td className="py-1.5 pr-3" style={{ color: "rgba(224,216,200,0.9)" }}>{campaign.name}</td>
                <td className="py-1.5 pr-3" style={{ color: status.color }}>{status.label}</td>
                <td className="py-1.5 pr-3">{campaign.audience_snapshot?.eligible ?? "—"}</td>
                <td className="py-1.5 pr-3">{campaign.sent_count ?? 0}</td>
                <td className="py-1.5 pr-3">{campaign.failed_count ?? 0}</td>
                <td className="py-1.5 pr-3" style={{ color: "rgba(224,216,200,0.6)" }}>{campaign.approved_by || "—"}</td>
                <td className="py-1.5" style={{ color: "rgba(224,216,200,0.6)" }}>
                  {campaign.created_date ? new Date(campaign.created_date).toLocaleString() : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}