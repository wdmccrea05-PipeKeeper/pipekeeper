import React from "react";
import { Flame } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { CARD_BG, CARD_BORDER_GOLD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION, MODULE_GOLD } from "@/lib/theme/tokens";

function ScoreBar({ score }) {
  const width = Math.max(2, Math.min(100, Number(score || 0) * 10));
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: MODULE_GOLD }} />
    </div>
  );
}

export default function PipePairingChartReport({ rows = [], includePhotos = true, includeExplanations = true }) {
  const { t } = useTranslation();

  if (!rows.length) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER_GOLD}` }}>
        <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: MODULE_GOLD }} />
        <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
          {t("collectionReports.emptyPairing", "Add pipes and blends to build your pairing chart.")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <div key={row.pipeId} className="rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER_GOLD}` }}>
          <div className="flex items-start gap-3">
            {includePhotos && row.photo ? (
              <img src={row.photo} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            ) : null}

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold leading-snug" style={{ color: TEXT_PRIMARY }}>
                {row.name}
              </h3>
              {(row.maker || row.shape || row.material) && (
                <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>
                  {[row.maker, row.shape, row.material].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: MODULE_GOLD }}>
                {t("collectionReports.specialization", "Specialization")}: {row.specialization}
                {row.chamber ? ` · ${row.chamber}` : ""}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold leading-none" style={{ color: MODULE_GOLD }}>
                {Number(row.topScore || 0).toFixed(1)}
              </p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: TEXT_CAPTION }}>
                {t("collectionReports.bestMatch", "Best match")}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {row.matches.length === 0 && (
              <p className="text-sm" style={{ color: TEXT_CAPTION }}>
                {t("collectionReports.noBlends", "No blends in your collection yet.")}
              </p>
            )}

            {row.matches.map((match, index) => (
              <div key={match.blendId || `${row.pipeId}-${index}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium min-w-0" style={{ color: TEXT_PRIMARY }}>
                    <span style={{ color: MODULE_GOLD }}>{index + 1}.</span> {match.blendName}
                  </p>
                  <p className="text-xs font-semibold flex-shrink-0" style={{ color: TEXT_SECONDARY }}>
                    {Number(match.score || 0).toFixed(1)}/10
                  </p>
                </div>
                <div className="mt-1.5">
                  <ScoreBar score={match.score} />
                </div>
                {(match.blendType || match.manufacturer) && (
                  <p className="text-[11px] mt-1" style={{ color: TEXT_CAPTION }}>
                    {[match.manufacturer, match.blendType].filter(Boolean).join(" · ")}
                  </p>
                )}
                {includeExplanations && match.why && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                    {match.why}
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