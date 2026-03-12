import React, { useMemo, useState } from "react";
import { Target, TrendingUp, Leaf, Clock, X, ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { getKeeperIntelligence, PipesModule, TobaccoModule } from "@/components/keeperIntelligence";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sanitizeRecommendationText } from "@/components/utils/aiTextNormalization";

const ICON_MAP = {
  Target,
  TrendingUp,
  Leaf,
  Clock
};

const ACCENT_MAP = {
  pipes: {
    "keeper.pipes.rotationTitle": "#C87941",
    "keeper.pipes.restTitle": "#D4743B",
    "keeper.pipes.growthTitle": "#4A9C6A",
    "keeper.pipes.loggingTitle": "#8B5CF6"
  },
  tobacco: {
    "keeper.tobacco.diversityTitle": "#5A7C5A",
    "keeper.tobacco.agingTitle": "#F59E0B",
    "keeper.tobacco.cellarTitle": "#6B7280"
  }
};

/**
 * ProactiveCuratorPanel — Keeper Intelligence Display
 * Displays insights from Keeper Intelligence engine
 */
// Generate What If prompt based on insight type
function generateWhatIfPrompt(insight, t) {
  const titleKey = insight.title;
  
  // Map insight types to contextual What If prompts
  const promptMap = {
    "keeper.pipes.rotationTitle": t("curator.whatif.rotation", "What if I rotate three underused pipes this week instead of smoking my usual favorites?"),
    "keeper.pipes.restTitle": t("curator.whatif.rest", "What if I let my most-used pipe rest for a few days and rotate alternatives?"),
    "keeper.pipes.growthTitle": t("curator.whatif.growth", "What if I add another pipe to expand my rotation?"),
    "keeper.pipes.loggingTitle": t("curator.whatif.logging", "What insights would improve if I logged my next five sessions?"),
    "keeper.tobacco.diversityTitle": t("curator.whatif.diversity", "What if I add a Virginia or Balkan blend to improve cellar diversity?"),
    "keeper.tobacco.agingTitle": t("curator.whatif.aging", "What if I open one of my older blends instead of a newer tin?"),
    "keeper.tobacco.cellarTitle": t("curator.whatif.cellar", "What if I cellar a few tins of my favorite blend for aging?"),
  };
  
  return promptMap[titleKey] || t("curator.whatif.default", "Tell me more about this recommendation");
}

export default function ProactiveCuratorPanel({ pipes, blends, logs, onDismiss, curatorEnabled = true, onInsightClick }) {
  const { t, lang } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [cleared, setCleared] = useState(false);

  const handleClick = (insight) => {
    if (onInsightClick) {
      // Build a contextual What-If prompt based on insight category
      let whatIfPrompt = '';
      
      if (insight.category === 'Rotation') {
        whatIfPrompt = `I have pipes that haven't been used in a while. Help me create a rotation plan to bring them back into regular use.`;
      } else if (insight.category === 'Cellar') {
        whatIfPrompt = `Some of my cellared blends have reached aging milestones. When should I open them and how should I evaluate their development?`;
      } else if (insight.category === 'Discovery') {
        whatIfPrompt = `My collection has limited variety. What should I add to improve balance and diversity?`;
      } else if (insight.category === 'Stewardship') {
        whatIfPrompt = `How can I better care for and maintain my collection?`;
      } else {
        whatIfPrompt = t(insight.action, insight.vars) || '';
      }
      
      onInsightClick({
        ...insight,
        whatif_prompt: whatIfPrompt
      });
    }
  };

  const insights = useMemo(() => {
    if (!curatorEnabled || cleared) return [];

    // Initialize engine
    const engine = getKeeperIntelligence();
    
    // Register and activate modules
    if (!engine.modules.pipes) {
      engine.registerModule("pipes", PipesModule);
      engine.registerModule("tobacco", TobaccoModule);
    }
    
    engine.activateModule("pipes");
    engine.activateModule("tobacco");

    // Collect data
    const data = {
      pipes: pipes || [],
      blends: blends || [],
      logs: logs || []
    };

    // Synchronously analyze (no await in useMemo)
    const generated = [];
    
    for (const moduleName of engine.getActiveModules()) {
      const module = engine.modules[moduleName];
      if (!module) continue;

      try {
        const analysis = module.analyzeCollection(data);
        const moduleInsights = module.generateInsights(analysis);
        
        moduleInsights.forEach(insight => {
          generated.push({
            module: moduleName,
            ...insight,
            // Normalize text to prevent multilingual bleed
            insight: sanitizeRecommendationText(insight.insight, lang),
            title: sanitizeRecommendationText(insight.title, lang),
          });
        });
      } catch (error) {
        console.error(`Error analyzing ${moduleName}:`, error);
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    generated.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 3;
      const bPriority = priorityOrder[b.priority] ?? 3;
      return aPriority - bPriority;
    });

    return generated.slice(0, 3); // Show max 3 insights
  }, [pipes, blends, logs, curatorEnabled, cleared, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
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
        boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(100, 70, 45, 0.5), rgba(80, 55, 35, 0.6))",
              border: "1px solid rgba(120, 90, 65, 0.45)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)"
            }}
          >
            <img 
              src="https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png" 
              alt={t("curator.title")}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.innerHTML = '🎩';
                fallback.style.fontSize = '24px';
                fallback.style.display = 'flex';
                fallback.style.alignItems = 'center';
                fallback.style.justifyContent = 'center';
                e.currentTarget.parentElement.appendChild(fallback);
              }}
            />
          </div>
          <div>
            <h3 
              className="text-lg font-semibold" 
              style={{ 
                color: "#F5F1E7",
                fontFamily: "'Georgia', serif"
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
                border: "1px solid rgba(120,90,65,0.25)"
              }}
            >
              <X className="w-4 h-4" style={{ color: "rgba(224,216,200,0.6)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Insights or empty state */}
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
              border: "1px solid rgba(120,90,65,0.4)"
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("curator.refreshAdvice")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => {
          const Icon = ICON_MAP[insight.icon];
          const moduleAccents = ACCENT_MAP[insight.module] || {};
          const accent = moduleAccents[insight.title] || "#C87941";
          
          return (
            <button
              key={`${insight.module}-${insight.category}-${index}`}
              onClick={() => handleClick(insight)}
              className="w-full rounded-lg p-4 text-left transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, rgba(50,35,25,0.6), rgba(40,28,20,0.8))",
                border: `1px solid ${accent}30`,
                boxShadow: `0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 ${accent}15`
              }}
              aria-label={`Explore: ${t(insight.title, insight.vars || {})}`}
            >
              <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${accent}20`,
                  border: `1px solid ${accent}40`
                }}
              >
                {Icon && <Icon className="w-4 h-4" style={{ color: accent }} />}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 
                      className="text-sm font-semibold mb-0.5" 
                      style={{ color: accent }}
                    >
                      {t(insight.title, insight.vars)}
                    </h4>
                    <p 
                      className="text-sm leading-relaxed" 
                      style={{ color: "rgba(224,216,200,0.85)" }}
                    >
                      {t(insight.insight, insight.vars)}
                    </p>
                  </div>
                  {insight.category && (
                    <div
                      className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap mt-0.5 leading-tight"
                      style={{
                        background: `${accent}15`,
                        color: accent,
                        border: `1px solid ${accent}25`,
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        hyphens: "none"
                      }}
                    >
                      {t(`curator.category.${insight.category.toLowerCase()}`, insight.category)}
                    </div>
                  )}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  style={{
                    background: `${accent}25`,
                    border: `1px solid ${accent}40`,
                    color: accent,
                    boxShadow: `0 1px 3px rgba(0,0,0,0.3)`
                  }}
                >
                  {t("curator.forYou.exploreThis")}
                  <ArrowRight className="w-3 h-3" />
                </div>
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