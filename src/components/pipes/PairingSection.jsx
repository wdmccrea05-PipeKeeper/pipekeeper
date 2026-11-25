import React, { useState } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import PairingGrid from "@/components/home/PairingGrid";
import AdvancedPairingReport from "@/components/pipes/AdvancedPairingReport";
import { MODULE_ACCENTS } from "@/lib/theme/tokens";

export default function PairingSection({ user, pipes, blends, smokingLogs = [] }) {
  const { t } = useTranslation();
  const [view, setView] = useState("basic");
  const accent = MODULE_ACCENTS.pipekeeper;

  const views = [
    { key: "basic", label: t("insights.pairingsBasic", "Basic") },
    { key: "advanced", label: t("insights.pairingsAdvanced", "Advanced") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(180,140,75,0.28)", background: "rgba(255,255,255,0.03)" }}
          role="tablist"
          aria-label={t("insights.pairingsViewLabel", "Pairing report format")}
        >
          {views.map((v) => {
            const active = view === v.key;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.key)}
                className="px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  background: active ? `${accent}2E` : "transparent",
                  color: active ? "#F5F1E7" : "rgba(224,216,200,0.62)",
                  minHeight: 40,
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs" style={{ color: "rgba(224,216,200,0.55)" }}>
          {view === "basic"
            ? t("insights.pairingsBasicHint", "Quick grid: top 3 matches per pipe plus a score for any blend.")
            : t("insights.pairingsAdvancedHint", "Detailed chart: five matches per pipe with specialization and reasoning.")}
        </p>
      </div>

      {view === "basic" ? (
        <PairingGrid user={user} pipes={pipes} blends={blends} />
      ) : (
        <AdvancedPairingReport user={user} pipes={pipes} blends={blends} smokingLogs={smokingLogs} />
      )}
    </div>
  );
}