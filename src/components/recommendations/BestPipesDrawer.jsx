import React from "react";
import { X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PipeIcon from "@/components/icons/PipeIcon";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function BestPipesDrawer({
  isOpen,
  onClose,
  results,
  loading,
  error,
  onRetry,
  anchorName,
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-t-3xl flex flex-col"
        style={{
          background: "linear-gradient(145deg, rgba(38,26,18,0.99), rgba(25,17,12,1))",
          border: "1px solid rgba(180,140,75,0.2)",
          borderBottom: "none",
          height: "80vh",
          maxHeight: "80vh",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ borderColor: "rgba(180,140,75,0.15)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <PipeIcon className="w-4 h-4" color="#B48C4B" />
              <span className="font-semibold text-[#F5F1E7]">{t("auto.components_recommendations_BestPipesDrawer.best_pipe_matches_15gi4w")}</span>
            </div>
            {anchorName && (
              <p className="text-xs text-[#D8C7A6]/65 mt-0.5">{t("auto.components_recommendations_BestPipesDrawer.for_376gdo")} {anchorName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-[#D8C7A6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="w-9 h-9 rounded-full border-4 animate-spin"
                style={{ borderColor: "rgba(180,140,75,0.2)", borderTopColor: "#B48C4B" }}
              />
              <p className="text-sm text-[#D8C7A6]/70">{t("auto.components_recommendations_BestPipesDrawer.scoring_your_pipes_7vxv5c")}</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <p className="text-[#E0D8C8]/70 text-sm max-w-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-2" /> {t("auto.components_recommendations_BestPipesDrawer.try_again_4ztias")}
              </Button>
            </div>
          )}

          {!loading && !error && results && (
            <div className="space-y-4">
              {results.length === 0 ? (
                <p className="text-center text-[#D8C7A6]/60 text-sm py-10">
                  {t("auto.components_recommendations_BestPipesDrawer.no_pipes_in_your_collection_to_q9hxi2")}
                </p>
              ) : (
                results.map((item, i) => (
                  <div
                    key={item.pipe_id}
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      background: "rgba(255,255,255,0.035)",
                      border: "1px solid rgba(180,140,75,0.18)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(180,140,75,0.25)", color: "#D4A574" }}
                          >
                            {i + 1}
                          </span>
                          <div className="text-base font-semibold text-[#F5F1E7] break-words">{item.pipe_name}</div>
                        </div>
                        {item.maker && (
                          <div className="text-xs text-[#B48C4B] mt-0.5 ml-7">{item.maker}</div>
                        )}
                      </div>
                      <div
                        className="flex-shrink-0 text-sm font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: item.score >= 8
                            ? "rgba(46,125,92,0.25)"
                            : item.score >= 5
                            ? "rgba(180,140,75,0.2)"
                            : "rgba(163,92,92,0.2)",
                          color: item.score >= 8 ? "#6fcf97" : item.score >= 5 ? "#D4A574" : "#e07070",
                          border: `1px solid ${item.score >= 8 ? "rgba(46,125,92,0.4)" : item.score >= 5 ? "rgba(180,140,75,0.3)" : "rgba(163,92,92,0.3)"}`,
                        }}
                      >
                        {Math.round(item.score * 10) / 10}/10
                      </div>
                    </div>

                    {item.shape && (
                      <div className="flex flex-wrap gap-1.5 ml-7">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(180,140,75,0.1)", border: "1px solid rgba(180,140,75,0.2)", color: "rgba(224,216,200,0.8)" }}
                        >
                          {item.shape}
                        </span>
                        {item.bowl_material && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(180,140,75,0.1)", border: "1px solid rgba(180,140,75,0.2)", color: "rgba(224,216,200,0.8)" }}
                          >
                            {item.bowl_material}
                          </span>
                        )}
                      </div>
                    )}

                    {item.why && (
                      <p
                        className="text-xs italic pl-3 ml-4"
                        style={{ color: "rgba(212,165,116,0.8)", borderLeft: "2px solid rgba(180,140,75,0.3)" }}
                      >
                        {item.why}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (results || error) && (
          <div
            className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0"
            style={{ borderColor: "rgba(180,140,75,0.15)" }}
          >
            <button
              type="button"
              onClick={onRetry}
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: "#B48C4B" }}
            >
              <RefreshCw className="w-3 h-3" /> {t("auto.components_recommendations_BestPipesDrawer.refresh_183tk5")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs hover:opacity-80 transition-opacity"
              style={{ color: "rgba(216,199,166,0.6)" }}
            >
              {t("auto.components_recommendations_BestPipesDrawer.close_3lk8qj")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}