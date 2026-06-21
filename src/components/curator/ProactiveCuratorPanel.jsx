import React, { useMemo, useState, useEffect, useRef } from "react";
import { Target, TrendingUp, Leaf, Clock, X, ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { getKeeperIntelligence, PipesModule, TobaccoModule } from "@/components/keeperIntelligence";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sanitizeRecommendationText } from "@/components/utils/aiTextNormalization";
import { CuratorEvents } from "@/components/utils/curatorEventLogger";

const ICON_MAP = {
  Target,
  TrendingUp,
  Leaf,
  Clock,
};

const ACCENT_MAP = {
  pipes: {
    "keeper.pipes.balancedRotationTitle": "#C87941",
    "keeper.pipes.overusedTitle": "#D4743B",
    "keeper.pipes.foundationTitle": "#4A9C6A",
    "keeper.pipes.shapeVarietyTitle": "#8B5CF6",
    "keeper.pipes.restingTitle": "#D4743B",
  },
  tobacco: {
    "keeper.tobacco.agingOpportunityTitle": "#F59E0B",
    "keeper.tobacco.diversityTitle": "#5A7C5A",
    "keeper.tobacco.styleDiscoveryTitle": "#6B7280",
    "keeper.tobacco.stewardshipStorageTitle": "#7C5A3A",
  },
};

function generateWhatIfPrompt(insight, t) {
  if (insight?.whatif_prompt) return insight.whatif_prompt;

  const titleKey = insight?.titleKey || insight?.rawTitle || insight?.title || "";

  const promptMap = {
    "keeper.pipes.balancedRotationTitle": t("curator.whatif.balancedRotation"),
    "keeper.pipes.overusedTitle": t("curator.whatif.overused"),
    "keeper.pipes.foundationTitle": t("curator.whatif.foundation"),
    "keeper.pipes.shapeVarietyTitle": t("curator.whatif.shapeVariety"),
    "keeper.pipes.restingTitle": t("curator.whatif.rest"),
    "keeper.tobacco.agingOpportunityTitle": t("curator.whatif.aging"),
    "keeper.tobacco.diversityTitle": t("curator.whatif.diversity"),
    "keeper.tobacco.styleDiscoveryTitle": t("curator.whatif.styleDiscovery"),
    "keeper.tobacco.stewardshipStorageTitle": t("curator.whatif.cellarStorage"),
  };

  return promptMap[titleKey] || t("curator.whatif.default");
}

function buildRecommendationPrompt(displayTitle, displayInsight, whatIfPrompt) {
  const title = String(displayTitle || "").trim();
  const insight = String(displayInsight || "").trim();
  const whatIf = String(whatIfPrompt || "").trim();

  if (insight) {
    return `Please expand on this recommendation from Curator:\n\n${insight}`;
  }

  if (title && whatIf) {
    return `Please expand on this Curator recommendation: ${title}\n\n${whatIf}`;
  }

  return whatIf || title || "Tell me more about this recommendation.";
}

export default function ProactiveCuratorPanel({
  pipes,
  blends,
  logs,
  onDismiss,
  curatorEnabled = true,
  onInsightClick,
}) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [cleared, setCleared] = useState(false);

  const insights = useMemo(() => {
    if (!curatorEnabled || cleared) return [];

    const engine = getKeeperIntelligence();

    if (!engine.modules.pipes) {
      engine.registerModule("pipes", PipesModule);
      engine.registerModule("tobacco", TobaccoModule);
    }

    engine.activateModule("pipes");
    engine.activateModule("tobacco");

    const data = {
      pipes: pipes || [],
      blends: blends || [],
      logs: logs || [],
    };

    const generated = [];

    for (const moduleName of engine.getActiveModules()) {
      const module = engine.modules[moduleName];
      if (!module) continue;

      try {
        const analysis = module.analyzeCollection(data);
        const moduleInsights = module.generateInsights(analysis);

        moduleInsights.forEach((insight) => {
          const displayTitle = t(insight.title, {
            defaultValue: sanitizeRecommendationText(insight.title, lang),
            ...(insight.vars || {}),
          });

          const displayInsight = t(insight.insight, {
            defaultValue: sanitizeRecommendationText(insight.insight, lang),
            ...(insight.vars || {}),
          });

          generated.push({
            module: moduleName,
            ...insight,
            titleKey: insight.title,
            insightKey: insight.insight,
            rawTitle: insight.title,
            rawInsight: insight.insight,
            displayTitle,
            displayInsight,
            title: displayTitle,
            insight: displayInsight,
            whatif_prompt: insight.whatif_prompt || null,
          });
        });
      } catch (error) {
        console.error(`Error analyzing ${moduleName}:`, error);
      }
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    generated.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 3;
      const bPriority = priorityOrder[b.priority] ?? 3;
      return aPriority - bPriority;
    });

    return generated.slice(0, 3);
  }, [pipes, blends, logs, curatorEnabled, cleared, refreshKey, lang, t]);

  // CRITICAL HARDENING: Deduplicated impression logging
  const loggedImpressionsRef = useRef(new Set());

  useEffect(() => {
    if (insights.length === 0) return;

    insights.forEach((insight) => {
      const recId = `${insight.module}_${insight.category}_${insight.titleKey}`;
      
      // Only log each recommendation once per component mount
      if (loggedImpressionsRef.current.has(recId)) return;
      
      loggedImpressionsRef.current.add(recId);
      
      CuratorEvents.recommendationShown({
        recommendationId: recId,
        recommendationContext: {
          titleKey: insight.titleKey,
          title: insight.displayTitle,
          module: insight.module,
          category: insight.category,
        },
        collectionContext: {
          pipes_count: pipes?.length || 0,
          blends_count: blends?.length || 0,
        },
      });
    });
  }, [insights, pipes?.length, blends?.length]);

  const handleClick = (insight) => {
    const whatIfPrompt = generateWhatIfPrompt(insight, t);
    const displayPrompt = buildRecommendationPrompt(
      insight.displayTitle,
      insight.displayInsight,
      whatIfPrompt
    );

    CuratorEvents.recommendationExplored({
      recommendationId: `${insight.module}_${insight.category}_${insight.titleKey}`,
      recommendationContext: {
        titleKey: insight.titleKey,
        title: insight.displayTitle,
        module: insight.module,
        category: insight.category,
        whatif_prompt: whatIfPrompt,
      },
    });

    if (onInsightClick) {
      onInsightClick({
        ...insight,
        whatif_prompt: whatIfPrompt,
        displayPrompt,
      });
      return;
    }

    const payload = {
      originalPrompt: displayPrompt,
      prompt: displayPrompt,
      whatif_prompt: whatIfPrompt,
      originalTitle: insight.displayTitle || "",
      originalInsight: insight.displayInsight || "",
      rawTitleKey: insight.titleKey || "",
      rawInsightKey: insight.insightKey || "",
      module: insight.module || "",
      category: insight.category || "",
      vars: insight.vars || {},
    };

    try {
      sessionStorage.setItem("pk_curator_context", JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save curator context:", e);
    }

    const params = new URLSearchParams();
    params.set("prompt", displayPrompt);
    navigate(`${createPageUrl("Curator")}?${params.toString()}`);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setCleared(false);
    toast.success(t("curator.adviceRefreshed"));
  };

  const handleClear = () => {
    setCleared(true);
    toast.success(t("curator.adviceCleared"));
  };

  if (!curatorEnabled || (insights.length === 0 && !cleared)) return null;

  return (
    <div
      className="rounded-lg p-6 space-y-4 relative"
      style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
        border: "1px solid rgba(140,105,65,0.35)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(100, 70, 45, 0.5), rgba(80, 55, 35, 0.6))",
              border: "1px solid rgba(120, 90, 65, 0.45)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)",
            }}
          >
            <img
              src="https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png"
              alt={t("curator.title")}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = document.createElement("div");
                fallback.innerHTML = "🎩";
                fallback.style.fontSize = "24px";
                fallback.style.display = "flex";
                fallback.style.alignItems = "center";
                fallback.style.justifyContent = "center";
                e.currentTarget.parentElement.appendChild(fallback);
              }}
            />
          </div>
          <div>
            <h3
              className="text-lg font-semibold"
              style={{
                color: "#F5F1E7",
                fontFamily: "'Georgia', serif",
              }}
            >
              {t("curator.title")}
            </h3>
            <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>
              {t("curator.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            className="h-8 px-2 hover:bg-white/5"
            title={t("curator.refreshAdvice")}
          >
            <RefreshCw className="w-4 h-4" style={{ color: "rgba(180,140,75,0.8)" }} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-8 px-2 hover:bg-white/5"
            title={t("curator.clearAdvice")}
          >
            <Trash2 className="w-4 h-4" style={{ color: "rgba(180,140,75,0.6)" }} />
          </Button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: "rgba(60,40,30,0.5)",
                border: "1px solid rgba(120,90,65,0.25)",
              }}
            >
              <X className="w-4 h-4" style={{ color: "rgba(224,216,200,0.6)" }} />
            </button>
          )}
        </div>
      </div>

      {cleared ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm" style={{ color: "rgba(224,216,200,0.6)" }}>
            {t("curator.adviceCleared")}
          </p>
          <Button
            onClick={handleRefresh}
            size="sm"
            className="mx-auto"
            style={{
              background: "linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))",
              border: "1px solid rgba(120,90,65,0.4)",
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("curator.refreshAdvice")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = ICON_MAP[insight.icon] || Target;
            const moduleAccents = ACCENT_MAP[insight.module] || {};
            const accent = moduleAccents[insight.titleKey] || "#C87941";

            return (
              <button
                key={`${insight.module}-${insight.category}-${index}`}
                onClick={() => handleClick(insight)}
                className="w-full rounded-lg p-4 text-left transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, rgba(50,35,25,0.6), rgba(40,28,20,0.8))",
                  border: `1px solid ${accent}30`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${accent}20`,
                      border: `1px solid ${accent}40`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-sm" style={{ color: "#F5F1E7" }}>
                        {insight.displayTitle}
                      </h4>
                      <ArrowRight
                        className="w-4 h-4 shrink-0"
                        style={{ color: "rgba(224,216,200,0.45)" }}
                      />
                    </div>

                    <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.72)" }}>
                      {insight.displayInsight}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}