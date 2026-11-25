import React from "react";
import { Trophy } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { CARD_BG, CARD_BORDER_GOLD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION, MODULE_GOLD } from "@/lib/theme/tokens";

export default function TopMatchesReport({ groups = [], includePhotos = true, includeExplanations = true }) {
  const { t } = useTranslation();

  if (!groups.length) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER_GOLD}` }}>
        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: MODULE_GOLD }} />
        <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
          {t("collectionReports.emptyTop", "Add items to your collection to see top matches.")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <div key={group.key} className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER_GOLD}` }}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>
              {t(`collectionReports.top.${group.key}`, group.label)}
            </h3>
            <span className="text-xs" style={{ color: TEXT_CAPTION }}>
              {t("collectionReports.topTen", "Top")} {group.entries.length}
            </span>
          </div>
          {group.description && (
            <p className="text-xs mb-3" style={{ color: TEXT_CAPTION }}>
              {t(`collectionReports.topDesc.${group.key}`, group.description)}
            </p>
          )}

          <ol className="space-y-2.5">
            {group.entries.map((entry, index) => (
              <li key={`${group.key}-${entry.name}-${index}`} className="flex items-start gap-2.5">
                {includePhotos && entry.photo ? (
                  <img src={entry.photo} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(180,140,75,0.14)", color: MODULE_GOLD }}
                  >
                    {index + 1}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium min-w-0" style={{ color: TEXT_PRIMARY }}>
                      {entry.name}
                    </p>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: MODULE_GOLD }}>
                      {Number(entry.score || 0).toFixed(1)}
                    </span>
                  </div>
                  {entry.detail && (
                    <p className="text-[11px] mt-0.5" style={{ color: TEXT_CAPTION }}>
                      {entry.detail}
                    </p>
                  )}
                  {includeExplanations && entry.explanation && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                      {entry.explanation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}