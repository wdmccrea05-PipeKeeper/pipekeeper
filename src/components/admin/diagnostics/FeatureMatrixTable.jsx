import React from "react";
import { Badge } from "@/components/ui/badge";
import { COLLECTION_FEATURE_MATRIX, collectionFeaturesByGroup } from "@/lib/entitlements/collectionFeatureMatrix";

const GROUP_LABELS = {
  collection: "Collection records",
  storage: "Storage",
  documents: "Documents",
  reports: "Reports and exports",
  intelligence: "Curator intelligence",
  value: "Valuation",
  sharing: "Sharing and gifting",
  navigation: "Navigation",
  tools: "Collection tools",
};

/**
 * Read-only view of the entitlement matrix. Live rows are enforced today;
 * proposed rows are decisions waiting for approval and block nothing.
 */
export default function FeatureMatrixTable() {
  const grouped = collectionFeaturesByGroup();

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, features]) => (
        <div key={group} className="space-y-2">
          <h3 className="text-sm font-semibold text-[#F5F1E7]">
            {GROUP_LABELS[group] || group}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#E0D8C8]/55">
                  <th className="py-1 pr-3 font-medium">Feature</th>
                  <th className="py-1 pr-3 font-medium">Level</th>
                  <th className="py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature) => (
                  <tr key={feature.id} className="border-t border-white/5 align-top">
                    <td className="py-2 pr-3 text-[#E0D8C8]">
                      <span className="block break-words">{feature.label}</span>
                      {feature.note && (
                        <span className="mt-0.5 block text-[11px] text-[#E0D8C8]/50 break-words">
                          {feature.note}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={feature.requiredTier === "free" ? "secondary" : "default"}>
                        {feature.requiredTier === "free" ? "Free" : "Pro"}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          feature.enforcement === "live"
                            ? "text-[#7FB08C]"
                            : "text-[#E8B87A]"
                        }
                      >
                        {feature.enforcement === "live" ? "Enforced now" : "Awaiting approval"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-xs text-[#E0D8C8]/50">
        {COLLECTION_FEATURE_MATRIX.length} features reviewed. Nothing marked “awaiting approval”
        is blocked in the app.
      </p>
    </div>
  );
}