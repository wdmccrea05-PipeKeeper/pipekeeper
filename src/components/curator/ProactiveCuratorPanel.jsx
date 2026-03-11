import React, { useMemo } from "react";
import { Sparkles, TrendingUp, Leaf, Clock, Target, X, BookOpen } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { differenceInMonths } from "date-fns";

/**
 * ProactiveCuratorPanel — AI-generated collection insights
 * Automatically analyzes collection health and provides recommendations
 */
export default function ProactiveCuratorPanel({ pipes, blends, logs, onDismiss, curatorEnabled = true }) {
  const { t } = useTranslation();

  const insights = useMemo(() => {
    if (!curatorEnabled) return [];
    
    const generated = [];

    // Collection growth insight
    if (pipes.length > 0 && pipes.length < 5) {
      generated.push({
        id: "growth-early",
        icon: TrendingUp,
        accent: "#4A9C6A",
        title: t("curator.collectionGrowth", { defaultValue: "Collection Growth" }),
        message: t("curator.growthEarly", { 
          defaultValue: "Your pipe collection is expanding nicely. Consider building a rotation schedule to avoid overusing favorites.",
          count: pipes.length
        })
      });
    } else if (pipes.length >= 5 && pipes.length < 15) {
      generated.push({
        id: "growth-moderate",
        icon: Target,
        accent: "#C87941",
        title: t("curator.rotationPlanning", { defaultValue: "Rotation Planning" }),
        message: t("curator.growthModerate", { 
          defaultValue: "With {{count}} pipes, you have enough variety to build a proper rotation. This helps each pipe rest between sessions.",
          count: pipes.length
        })
      });
    }

    // Cellar diversity insight
    if (blends.length > 0) {
      const blendTypes = new Set(blends.map(b => b.blend_type).filter(Boolean));
      if (blendTypes.size < 3) {
        generated.push({
          id: "cellar-diversity",
          icon: Leaf,
          accent: "#4A7C9C",
          title: t("curator.cellarDiversity", { defaultValue: "Cellar Diversity" }),
          message: t("curator.diversityLow", { 
            defaultValue: "Your cellar could benefit from adding variety. Consider exploring Virginia, Balkan, or English blends to increase diversity."
          })
        });
      }
    }

    // Usage consistency insight
    if (logs.length > 0 && logs.length < 10) {
      generated.push({
        id: "usage-consistency",
        icon: Sparkles,
        accent: "#8B5CF6",
        title: t("curator.usageInsight", { defaultValue: "Usage Insights" }),
        message: t("curator.consistencyEncourage", { 
          defaultValue: "You have logged several sessions recently. Consistent logging will help reveal your true favorites and usage patterns."
        })
      });
    }

    // Aging insight
    const agingBlends = blends.filter(b => {
      const hasCellared = (Number(b.tin_tins_cellared) || 0) > 0 || 
                          (Number(b.bulk_cellared) || 0) > 0 || 
                          (Number(b.pouch_pouches_cellared) || 0) > 0;
      if (!hasCellared) return false;
      
      const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
      if (dates.length === 0) return false;
      
      const oldestDate = dates.reduce((oldest, d) => {
        try {
          const dTime = new Date(d).getTime();
          const oldTime = new Date(oldest).getTime();
          return dTime < oldTime ? d : oldest;
        } catch {
          return oldest;
        }
      });
      
      try {
        const months = differenceInMonths(new Date(), new Date(oldestDate));
        const potential = b.aging_potential;
        
        if (potential === "Excellent" && months >= 24) return true;
        if (potential === "Good" && months >= 12) return true;
        if (potential === "Fair" && months >= 3) return true;
      } catch {
        return false;
      }
      
      return false;
    });

    if (agingBlends.length > 0) {
      generated.push({
        id: "aging-ready",
        icon: Clock,
        accent: "#F59E0B",
        title: t("curator.agingInsight", { defaultValue: "Aging Insight" }),
        message: t("curator.agingReady", { 
          defaultValue: "{{count}} blend(s) in your cellar have reached optimal aging windows. Consider sampling them to enjoy their matured flavors.",
          count: agingBlends.length
        })
      });
    }

    return generated.slice(0, 3); // Show max 3 insights
  }, [pipes, blends, logs, curatorEnabled, t]);

  if (!curatorEnabled || insights.length === 0) return null;

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
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15))",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              boxShadow: "0 0 16px rgba(139, 92, 246, 0.2)"
            }}
          >
            <BookOpen className="w-5 h-5" style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <h3 
              className="text-lg font-semibold" 
              style={{ 
                color: "#F5F1E7",
                fontFamily: "'Georgia', serif"
              }}
            >
              {t("curator.title", { defaultValue: "Collection Curator" })}
            </h3>
            <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>
              {t("curator.subtitle", { defaultValue: "AI-generated insights for your collection" })}
            </p>
          </div>
        </div>
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

      {/* Insights */}
      <div className="space-y-3">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className="rounded-lg p-4"
              style={{
                background: "linear-gradient(135deg, rgba(50,35,25,0.6), rgba(40,28,20,0.8))",
                border: `1px solid ${insight.accent}30`,
                boxShadow: `0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 ${insight.accent}15`
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: `${insight.accent}20`,
                    border: `1px solid ${insight.accent}40`
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: insight.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 
                    className="text-sm font-semibold mb-1" 
                    style={{ color: insight.accent }}
                  >
                    {insight.title}
                  </h4>
                  <p 
                    className="text-sm leading-relaxed" 
                    style={{ color: "rgba(224,216,200,0.85)" }}
                  >
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}