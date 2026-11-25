import React from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { CARD_BG, CARD_BORDER_GOLD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION, MODULE_GOLD } from "@/lib/theme/tokens";

export default function ComplementaryReport({ groups = [] }) {
  const { t } = useTranslation();

  if (!groups.length) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER_GOLD}` }}>
        <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: MODULE_GOLD }} />
        <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
          {t("collectionReports.emptyComplementary", "Add more items and sessions to unlock suggestions.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER_GOLD}` }}>
          <h3 className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>
            {t(`collectionReports.complementary.${group.key}`, group.title)}
          </h3>
          {group.description && (
            <p className="text-xs mt-1 mb-3" style={{ color: TEXT_CAPTION }}>
              {t(`collectionReports.complementaryDesc.${group.key}`, group.description)}
            </p>
          )}

          <div className="space-y-3 mt-2">
            {group.entries.map((entry, index) => (
              <div
                key={`${group.key}-${index}`}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(180,140,75,0.12)" }}
              >
                <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  {entry.title}
                </p>
                {entry.meta && (
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: MODULE_GOLD }}>
                    {entry.meta}
                  </p>
                )}
                {entry.detail && (
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                    {entry.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}