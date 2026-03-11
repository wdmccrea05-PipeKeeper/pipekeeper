import React, { useMemo } from "react";
import { Sparkles, TrendingUp, Leaf, Clock, Target, X, BookOpen, ArrowRight, Calendar, BarChart3 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { differenceInMonths, differenceInDays } from "date-fns";
import { createPageUrl } from "@/components/utils/createPageUrl";

/**
 * ProactiveCuratorPanel — Actionable AI collection insights
 * Analyzes collection health and provides specific recommendations
 */
export default function ProactiveCuratorPanel({ pipes, blends, logs, onDismiss, curatorEnabled = true }) {
  const { t } = useTranslation();

  const insights = useMemo(() => {
    if (!curatorEnabled) return [];
    
    const generated = [];

    // Analyze pipe usage from logs
    const pipeUsage = {};
    logs.forEach(log => {
      if (log?.pipe_id) {
        pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + (log.bowls_used || 1);
      }
    });

    const underusedPipes = pipes.filter(p => !pipeUsage[p.id] || pipeUsage[p.id] < 3);

    // 1. Rotation Planning - actionable with specific count
    if (pipes.length >= 5 && underusedPipes.length >= 3) {
      generated.push({
        id: "rotation-planning",
        icon: Target,
        accent: "#C87941",
        title: t("curator.rotationPlanning"),
        message: t("curator.growthModerate", { count: pipes.length }),
        action: t("curator.growthModerateAction"),
        ctaLabel: t("curator.openRotationView"),
        ctaLink: "Insights?tab=rotation"
      });
    }

    // 2. Cellar Diversity - actionable
    if (blends.length > 0) {
      const blendTypes = new Set(blends.map(b => b.blend_type).filter(Boolean));
      if (blendTypes.size < 3) {
        generated.push({
          id: "cellar-diversity",
          icon: Leaf,
          accent: "#5A7C5A",
          title: t("curator.cellarDiversity"),
          message: t("curator.diversityLow"),
          action: t("curator.diversityAction"),
          ctaLabel: t("curator.browseBlendTypes"),
          ctaLink: "Tobacco"
        });
      }
    }

    // 3. Logging Opportunity - actionable
    if (pipes.length >= 3 && logs.length < 10) {
      generated.push({
        id: "logging-opportunity",
        icon: BookOpen,
        accent: "#8B5CF6",
        title: t("curator.usageInsight"),
        message: t("curator.consistencyEncourage"),
        action: t("curator.consistencyAction"),
        ctaLabel: t("curator.logSession"),
        ctaLink: "Insights?tab=log"
      });
    }

    // 4. Aging Opportunity - actionable with count
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
        id: "aging-opportunity",
        icon: Clock,
        accent: "#F59E0B",
        title: t("curator.agingInsight"),
        message: t("curator.agingReady", { count: agingBlends.length }),
        action: t("curator.agingAction"),
        ctaLabel: t("curator.viewAgedBlends"),
        ctaLink: "Insights?tab=aging"
      });
    }

    // 5. Early collection growth - actionable
    if (pipes.length > 0 && pipes.length < 5 && !generated.some(g => g.id === "rotation-planning")) {
      generated.push({
        id: "growth-early",
        icon: TrendingUp,
        accent: "#4A9C6A",
        title: t("curator.collectionGrowth"),
        message: t("curator.growthEarly"),
        action: t("curator.growthEarlyAction"),
        ctaLabel: t("curator.openRotationView"),
        ctaLink: "Insights?tab=rotation"
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
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h4 
                      className="text-sm font-semibold mb-0.5" 
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
                  {insight.action && (
                    <p 
                      className="text-xs font-medium" 
                      style={{ color: "rgba(180,140,75,0.75)" }}
                    >
                      → {insight.action}
                    </p>
                  )}
                  {insight.ctaLink && (
                    <a
                      href={createPageUrl(insight.ctaLink)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all hover:scale-105"
                      style={{
                        background: `${insight.accent}25`,
                        border: `1px solid ${insight.accent}40`,
                        color: insight.accent,
                        boxShadow: `0 1px 3px rgba(0,0,0,0.3)`
                      }}
                    >
                      {insight.ctaLabel}
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}