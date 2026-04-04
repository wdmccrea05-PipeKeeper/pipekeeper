import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/components/utils/navigation";
import { differenceInCalendarDays, differenceInMonths, formatDistanceToNow } from "date-fns";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { base44 } from "@/api/base44Client";
import { filterAiEligibleItems } from "@/components/platform/aiEligibility";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { sanitizeRecommendationText } from "@/components/utils/aiTextNormalization";
import {
  Brain,
  RotateCcw,
  Leaf,
  Shield,
  Sparkles,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Maximum insights shown by default (prevents cognitive overload)
const DEFAULT_VISIBLE = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Insight category labels — structured for future multi-module support
// (e.g. whiskey readiness, cigar aging, coffee freshness, cross-module pairings)
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = {
  usage: "usage",
  pairings: "pairings",
  collection_health: "collection_health",
  value: "value",
};

// ─────────────────────────────────────────────────────────────────────────────
// CollapsibleSection — section with a toggleable header
// ─────────────────────────────────────────────────────────────────────────────
function CollapsibleSection({ label, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-label={label}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-3 group focus-visible:outline-none rounded"
        aria-expanded={open}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider transition-colors" style={{ color: "rgba(180, 140, 75, 0.7)", fontFamily: "'Georgia', serif" }}>
          {label}
        </h3>
        {open ? (
          <ChevronUp className="w-4 h-4 transition-colors shrink-0" style={{ color: "rgba(180, 140, 75, 0.5)" }} aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 transition-colors shrink-0" style={{ color: "rgba(180, 140, 75, 0.5)" }} aria-hidden="true" />
        )}
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RotationDrillDownModal — targeted list of overdue pipes with Curator handoff
// ─────────────────────────────────────────────────────────────────────────────
function RotationDrillDownModal({ pipes, latestLogByPipe, open, onClose }) {
  const { t } = useTranslation();
  const now = new Date();

  const overduePipes = pipes.filter((p) => {
    const lastDate = latestLogByPipe[p.id];
    if (!lastDate) return true;
    try {
      return differenceInCalendarDays(now, new Date(lastDate)) > 60;
    } catch {
      return false;
    }
  });

  const handleBuildRotation = () => {
    const prompt = t("collectionIntelligence.rotationCuratorPrompt", 
      "Help me create a rotation plan for these underused pipes."
    );
    const params = new URLSearchParams();
    params.set('prompt', prompt);
    navigate(createPageUrl(`Curator?${params.toString()}`));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {t("collectionIntelligence.insightRotationTitle")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#E0D8C8]/70 -mt-1 mb-3">
          {overduePipes.length === 1
            ? t("collectionIntelligence.insightRotationDescOne")
            : t("collectionIntelligence.insightRotationDesc", { count: overduePipes.length })}
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {overduePipes.map((p) => {
            const lastDate = latestLogByPipe[p.id];
            let lastUsedLabel = t("collectionIntelligence.neverUsed");
            try {
              if (lastDate) {
                lastUsedLabel = formatDistanceToNow(new Date(lastDate), { addSuffix: true });
              }
            } catch {
              // ignore
            }
            return (
              <a
                key={p.id}
                href={createPageUrl(`PipeDetail?id=${encodeURIComponent(p.id)}`)}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: "rgba(50, 35, 22, 0.35)",
                  border: "1px solid rgba(120, 90, 65, 0.2)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#F5F1E7" }}>{p.name}</div>
                  {p.maker && (
                    <div className="text-xs truncate" style={{ color: "rgba(224, 216, 200, 0.6)" }}>{p.maker}</div>
                  )}
                </div>
                <div className="text-xs shrink-0" style={{ color: "rgba(224, 216, 200, 0.6)" }}>{lastUsedLabel}</div>
              </a>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(120,90,65,0.2)" }}>
          <Button
            onClick={handleBuildRotation}
            className="w-full"
            style={{
              background: "linear-gradient(135deg, rgba(139,58,58,0.95), rgba(109,46,46,1))",
              border: "none"
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("collectionIntelligence.buildRotationCurator")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InsightCard — single readable insight with Curator-connected actions
// ─────────────────────────────────────────────────────────────────────────────
function InsightCard({ insight, onAction }) {
  const { t } = useTranslation();
  const iconMap = {
    clock: RotateCcw,
    leaf: Leaf,
    shield: Shield,
    sparkles: Sparkles,
    activity: Activity,
  };
  const Icon = iconMap[insight.icon] || Activity;

  const handleCuratorAction = () => {
    if (insight.curatorPrompt) {
      const params = new URLSearchParams();
      params.set('prompt', insight.curatorPrompt);
      navigate(createPageUrl(`Curator?${params.toString()}`));
    }
  };

  const actionButton = insight.actionLabel ? (
    insight.actionUrl ? (
      <a
        href={insight.actionUrl}
        className="self-start ml-7 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        style={{
          color: "rgba(180, 140, 75, 1)",
          border: "1px solid rgba(120, 90, 65, 0.4)",
          background: "rgba(100, 70, 45, 0.15)",
        }}
      >
        {insight.actionLabel}
        <ArrowRight className="w-3 h-3" />
      </a>
    ) : insight.curatorPrompt ? (
      <button
        type="button"
        onClick={handleCuratorAction}
        className="self-start ml-7 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        style={{
          color: "rgba(180, 140, 75, 1)",
          border: "1px solid rgba(120, 90, 65, 0.4)",
          background: "rgba(100, 70, 45, 0.15)",
        }}
      >
        <MessageSquare className="w-3 h-3" />
        {insight.actionLabel}
      </button>
    ) : onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="self-start ml-7 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        style={{
          color: "rgba(180, 140, 75, 1)",
          border: "1px solid rgba(120, 90, 65, 0.4)",
          background: "rgba(100, 70, 45, 0.15)",
        }}
      >
        {insight.actionLabel}
        <ArrowRight className="w-3 h-3" />
      </button>
    ) : null
  ) : null;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{
      background: "rgba(50, 35, 22, 0.35)",
      border: "1px solid rgba(120, 90, 65, 0.2)",
    }}>
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "rgba(180, 140, 75, 0.9)" }} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-snug" style={{ color: "#F5F1E7" }}>{insight.title}</div>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(224, 216, 200, 0.75)" }}>{insight.description}</p>
        </div>
      </div>
      {actionButton}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RecommendationCard — pairing recommendation with a clear reason
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationCard({ rec, t }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{
      background: "rgba(50, 35, 22, 0.35)",
      border: "1px solid rgba(120, 90, 65, 0.2)",
    }}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(180, 140, 75, 1)" }}>
        {t("collectionIntelligence.recommendedPairing")}
      </div>
      <p className="text-sm font-medium leading-snug" style={{ color: "#F5F1E7" }}>
        {rec.pipe_name}{" "}
        <span className="font-normal" style={{ color: "rgba(224, 216, 200, 0.75)" }}>
          {t("collectionIntelligence.pairsWith")}
        </span>{" "}
        {rec.tobacco_name}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "rgba(224, 216, 200, 0.65)" }}>
        <span className="font-semibold" style={{ color: "rgba(224, 216, 200, 0.85)" }}>
          {t("collectionIntelligence.reason")}:
        </span>{" "}
        {rec.reason}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateFeedItem — AI update with Curator action
// ─────────────────────────────────────────────────────────────────────────────
function UpdateFeedItem({ update }) {
  const { t } = useTranslation();
  let timeLabel = "";
  try {
    if (update.timeAgo) {
      timeLabel = formatDistanceToNow(new Date(update.timeAgo), { addSuffix: true });
    }
  } catch {
    // ignore invalid date
  }

  const handleExplain = () => {
    let prompt = "";
    if (update.id === "pairing_matrix") {
      prompt = t("collectionIntelligence.pairingExplainPrompt", "Explain what changed in my pairing matrix and how I should use it.");
    } else if (update.id === "optimization") {
      prompt = t("collectionIntelligence.optimizationExplainPrompt", "Explain the latest collection optimization recommendations and their impact.");
    } else {
      prompt = t("collectionIntelligence.updateExplainPrompt", `Explain the ${update.title} update.`);
    }
    const params = new URLSearchParams();
    params.set('prompt', prompt);
    navigate(createPageUrl(`Curator?${params.toString()}`));
  };

  return (
    <div className="rounded-lg" style={{
      background: "rgba(50, 35, 22, 0.35)",
      border: "1px solid rgba(120, 90, 65, 0.2)",
    }}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#46BD5C" }} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug" style={{ color: "#F5F1E7" }}>{update.title}</div>
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "rgba(224, 216, 200, 0.6)" }}>{update.description}</div>
          {timeLabel && (
            <div className="text-xs mt-0.5" style={{ color: "rgba(224, 216, 200, 0.5)" }}>{timeLabel}</div>
          )}
        </div>
      </div>
      <div className="px-3 pb-3">
        <button
          onClick={handleExplain}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          style={{
            color: "rgba(180, 140, 75, 1)",
            border: "1px solid rgba(120, 90, 65, 0.4)",
            background: "rgba(100, 70, 45, 0.15)",
          }}
        >
          <MessageSquare className="w-3 h-3" />
          {t("collectionIntelligence.explainThis")}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionIntelligencePanel — unified Collection Intelligence section
//
// Architecture notes (future multi-module support):
//   - Each insight carries a `category` field (usage | pairings | collection_health | value)
//   - Insight generation is pure/local — no extra API calls beyond cached queries
//   - `filterAiEligibleItems` enforces the platform-level ai_excluded rule throughout
//   - Future modules (WhiskeyKeeper, CigarKeeper, etc.) can inject their own insights
//     by extending the insight generation logic or passing an `extraInsights` prop
// ─────────────────────────────────────────────────────────────────────────────
export default function CollectionIntelligencePanel({ pipes, blends, bottles = [], tastings = [], user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [rotationModalOpen, setRotationModalOpen] = useState(false);

  // ── Data fetching (all cached — does not block page render) ─────────────────

  // Smoking logs: reuse existing cache key so no duplicate network calls
  const { data: logs = [] } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: () =>
      base44.entities.SmokingLog.filter({ created_by: user?.email }, "-date", 1000),
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  // Active pairing matrix: reuse existing cache key
  const { data: activePairings } = useQuery({
    queryKey: ["activePairings", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
    staleTime: 60_000,
  });

  // Active collection optimization: reuse existing cache key
  const { data: activeOpt } = useQuery({
    queryKey: ["activeOptimization", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.CollectionOptimization.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
    staleTime: 60_000,
  });

  // ── Insight & health generation (memoised — no side-effects) ────────────────
  const { insights, healthMetrics, topRecommendations, aiUpdates, latestLogByPipe, overduePipes } = useMemo(() => {
    const lang = localStorage.getItem('pk_lang') || 'en-US';
    const eligiblePipes = filterAiEligibleItems(pipes || []);
    const eligibleBlends = filterAiEligibleItems(blends || []);
    const eligibleBottles = filterAiEligibleItems(bottles || []);
    const excludedCount =
      (pipes?.length || 0) + (blends?.length || 0) + (bottles?.length || 0) -
      eligiblePipes.length - eligibleBlends.length - eligibleBottles.length;

    const now = new Date();
    const insights = [];

    // Build a quick map: pipe_id → most recent log date
    const latestLogByPipe = {};
    for (const log of logs || []) {
      if (!log.pipe_id) continue;
      const logDate = log.date ? new Date(log.date) : null;
      if (!logDate) continue;
      if (!latestLogByPipe[log.pipe_id] || logDate > new Date(latestLogByPipe[log.pipe_id])) {
        latestLogByPipe[log.pipe_id] = log.date;
      }
    }

    // ── Insight 1: Rotation opportunity ──────────────────────────────────────
    const overduePipes = eligiblePipes.filter((p) => {
      const lastDate = latestLogByPipe[p.id];
      if (!lastDate) return true;
      try { return differenceInCalendarDays(now, new Date(lastDate)) > 60; } catch { return false; }
    });

    if (overduePipes.length > 0) {
      insights.push({
        id: "rotation_opportunity",
        category: CATEGORIES.usage,
        icon: "clock",
        title: t("collectionIntelligence.insightRotationTitle"),
        description: overduePipes.length === 1
          ? t("collectionIntelligence.insightRotationDescOne")
          : t("collectionIntelligence.insightRotationDesc", { count: overduePipes.length }),
        actionLabel: overduePipes.length === 1
          ? t("collectionIntelligence.reviewOnePipe")
          : t("collectionIntelligence.reviewPipes", { count: overduePipes.length }),
        actionUrl: null,
        isDrillDown: true,
        curatorPrompt: t("collectionIntelligence.rotationCuratorPrompt", "Help me create a rotation plan for the pipes I have not used in over 60 days."),
      });
    }

    // ── Insight 2: Cellar readiness ──────────────────────────────────────────
    const peakBlends = eligibleBlends.filter((b) => {
      const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
      if (dates.length === 0) return false;
      const oldest = dates.reduce((a, d) => (d < a ? d : a));
      try {
        const months = differenceInMonths(now, new Date(oldest));
        if (b.aging_potential === "Excellent" && months >= 18) return true;
        if (b.aging_potential === "Good" && months >= 9) return true;
        if (b.aging_potential === "Fair" && months >= 3) return true;
      } catch { /* ignore */ }
      return false;
    });

    if (peakBlends.length > 0) {
      insights.push({
        id: "cellar_readiness",
        category: CATEGORIES.collection_health,
        icon: "leaf",
        title: t("collectionIntelligence.insightCellarTitle"),
        description: peakBlends.length === 1
          ? t("collectionIntelligence.insightCellarDescOne")
          : t("collectionIntelligence.insightCellarDesc", { count: peakBlends.length }),
        actionLabel: t("collectionIntelligence.askCurator"),
        actionUrl: null,
        curatorPrompt: t("collectionIntelligence.cellarCuratorPrompt", "Which of my aged blends should I review or open first, and why?"),
      });
    }

    // ── Insight 3: Whiskey untasted ──────────────────────────────────────────
    if (eligibleBottles.length > 0) {
      const tastedBottleIds = new Set((tastings || []).map(t => t.bottle_id).filter(Boolean));
      const untastedCount = eligibleBottles.filter(b => !tastedBottleIds.has(b.id)).length;
      if (untastedCount > 0) {
        insights.push({
          id: "whiskey_untasted",
          category: CATEGORIES.usage,
          icon: "sparkles",
          title: `${untastedCount} bottle${untastedCount === 1 ? '' : 's'} not yet tasted`,
          description: "Log a tasting to build your whiskey history and improve recommendations.",
          actionLabel: "Log a Tasting",
          actionUrl: "/Tastings?action=log",
        });
      }
    }

    // ── Insight 3b: Whiskey tasting cadence ────────────────────────────────
    if (eligibleBottles.length >= 3 && (tastings || []).length > 0) {
      const now30 = new Date();
      const thirtyDaysAgo = new Date(now30.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentTastings = (tastings || []).filter((tt) => {
        try { return new Date(tt.tasting_date || tt.date || tt.created_date) >= thirtyDaysAgo; } catch { return false; }
      });
      if (recentTastings.length === 0) {
        insights.push({
          id: 'whiskey_cadence',
          category: CATEGORIES.usage,
          icon: 'activity',
          title: 'No tastings logged in the last 30 days',
          description: 'Keep your tasting cadence active to improve future whiskey recommendations.',
          actionLabel: 'Log a Tasting',
          actionUrl: '/Tastings?action=log',
        });
      }
    }

    // ── Insight 3c: Highly rated bottles without notes ───────────────────────
    if (eligibleBottles.length > 0 && (tastings || []).length > 0) {
      const ratingsByBottle = {};
      for (const tt of tastings || []) {
        if (tt.bottle_id && tt.rating) {
          if (!ratingsByBottle[tt.bottle_id]) ratingsByBottle[tt.bottle_id] = [];
          ratingsByBottle[tt.bottle_id].push(Number(tt.rating));
        }
      }
      const highRatedWithoutNotes = eligibleBottles.filter((b) => {
        const ratings = ratingsByBottle[b.id] || [];
        if (ratings.length === 0) return false;
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        return avg >= 4 && !b.notes;
      });
      if (highRatedWithoutNotes.length > 0) {
        insights.push({
          id: 'whiskey_high_rated_no_notes',
          category: CATEGORIES.value,
          icon: 'sparkles',
          title: `${highRatedWithoutNotes.length} highly-rated bottle${highRatedWithoutNotes.length > 1 ? 's' : ''} without notes`,
          description: 'Add tasting notes to your top-rated bottles to build a richer flavor profile.',
          actionLabel: 'View Tastings',
          actionUrl: '/Tastings',
        });
      }
    }

    // ── Insight 4: Collector-only items ─────────────────────────────────────

    const blendTypes = new Set(eligibleBlends.map((b) => b.blend_type).filter(Boolean));
    if (eligibleBlends.length > 0) {
      if (blendTypes.size < 3) {
        insights.push({
          id: "blend_diversity_low",
          category: CATEGORIES.value,
          icon: "sparkles",
          title: t("collectionIntelligence.insightDiversityLowTitle"),
          description: t("collectionIntelligence.insightDiversityLowDesc", { count: blendTypes.size }),
          actionLabel: t("collectionIntelligence.askCurator"),
          actionUrl: null,
          curatorPrompt: t("collectionIntelligence.diversityCuratorPrompt", "Analyze my tobacco cellar variety and tell me what additions would improve balance."),
        });
      } else if (blendTypes.size >= 5) {
        insights.push({
          id: "blend_diversity_high",
          category: CATEGORIES.value,
          icon: "sparkles",
          title: t("collectionIntelligence.insightDiversityHighTitle"),
          description: t("collectionIntelligence.insightDiversityHighDesc", { count: blendTypes.size }),
          actionLabel: t("collectionIntelligence.askCurator"),
          actionUrl: null,
          curatorPrompt: t("collectionIntelligence.diversityAnalysisCuratorPrompt", "Explain how my tobacco cellar variety supports different smoking experiences."),
        });
      }
    }

    // ── Insight 6: Collection gap from latest optimization ───────────────────
    const gaps = activeOpt?.collection_gaps?.missing_coverage || [];
    if (gaps.length > 0) {
      const firstGap = gaps[0];
      const gapName = typeof firstGap === "string" ? firstGap : firstGap?.blend_type || firstGap?.gap_blend_type || null;
      if (gapName) {
        insights.push({
          id: "collection_gap",
          category: CATEGORIES.collection_health,
          icon: "activity",
          title: t("collectionIntelligence.insightGapTitle"),
          description: t("collectionIntelligence.insightGapDesc", { type: gapName }),
          actionLabel: t("collectionIntelligence.exploreCurator"),
          actionUrl: null,
          curatorPrompt: `My collection has a gap in ${gapName}. What should I consider adding to improve coverage?`,
        });
      }
    }

    // ── Collection Health summary ────────────────────────────────────────────
    const recentlyUsedCount = eligiblePipes.filter((p) => {
      const lastDate = latestLogByPipe[p.id];
      if (!lastDate) return false;
      try { return differenceInCalendarDays(now, new Date(lastDate)) <= 60; } catch { return false; }
    }).length;

    const rotationRatio = eligiblePipes.length === 0 ? null : recentlyUsedCount / eligiblePipes.length;
    const rotationBalance = rotationRatio === null ? "\u2014"
      : rotationRatio >= 0.6 ? t("collectionIntelligence.healthGood")
      : rotationRatio >= 0.3 ? t("collectionIntelligence.healthModerate")
      : t("collectionIntelligence.healthLow");

    const blendDiversity = blendTypes.size >= 5 ? t("collectionIntelligence.healthStrong")
      : blendTypes.size >= 3 ? t("collectionIntelligence.healthModerate")
      : blendTypes.size >= 1 ? t("collectionIntelligence.healthLow") : "\u2014";

    const cellaredBlendCount = eligibleBlends.filter(
      (b) => (Number(b.tin_tins_cellared) || 0) > 0 || (Number(b.bulk_cellared) || 0) > 0 || (Number(b.pouch_pouches_cellared) || 0) > 0
    ).length;

    const cellarReadiness = peakBlends.length >= 3 ? t("collectionIntelligence.healthStrong")
      : peakBlends.length >= 1 ? t("collectionIntelligence.healthModerate")
      : cellaredBlendCount > 0 ? t("collectionIntelligence.healthGood") : "\u2014";

    const whiskeyHealth = eligibleBottles.length === 0 ? null
      : (tastings || []).length >= 5 ? t("collectionIntelligence.healthGood")
      : (tastings || []).length >= 1 ? t("collectionIntelligence.healthModerate")
      : t("collectionIntelligence.healthLow");

    const healthMetrics = [
      { label: t("collectionIntelligence.healthRotation"), value: rotationBalance },
      { label: t("collectionIntelligence.healthDiversity"), value: blendDiversity },
      { label: t("collectionIntelligence.healthCellar"), value: cellarReadiness },
      ...(whiskeyHealth ? [{ label: "Whiskey Activity", value: whiskeyHealth }] : []),
    ];

    // ── Top AI recommendations ────────────────────────────────────────────────
    const topRecommendations = (activePairings?.pairings || [])
      .filter((p) => p.score >= 7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((p) => ({
        pipe_name: sanitizeRecommendationText(p.pipe_name, lang),
        tobacco_name: sanitizeRecommendationText(p.tobacco_name, lang),
        score: p.score,
        blend_type: p.blend_type,
        reason: sanitizeRecommendationText(
          p.blend_type
            ? t("collectionIntelligence.pairingReasonBlendType", { blendType: p.blend_type })
            : t("collectionIntelligence.pairingReasonDefault"),
          lang
        ),
      }));

    // ── AI Updates feed ───────────────────────────────────────────────────────
    const aiUpdates = [];
    if (activePairings) {
      aiUpdates.push({ id: "pairing_matrix", title: t("collectionIntelligence.updatePairingMatrix"), description: t("collectionIntelligence.updatePairingDesc"), timeAgo: activePairings.generated_date || activePairings.created_date || null });
    }
    if (activeOpt) {
      aiUpdates.push({ id: "optimization", title: t("collectionIntelligence.updateOptimization"), description: t("collectionIntelligence.updateOptimizationDesc"), timeAgo: activeOpt.generated_date || activeOpt.created_date || null });
    }

    return { insights, healthMetrics, topRecommendations, aiUpdates, latestLogByPipe, overduePipes };
  }, [pipes, blends, bottles, tastings, logs, activePairings, activeOpt, t]);

  // Don't render if the collection is completely empty
  if (!pipes?.length && !blends?.length && !bottles?.length) return null;

  const visibleInsights = expanded
    ? insights
    : insights.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = insights.length - DEFAULT_VISIBLE;

  return (
    <>
      <div 
        className="p-6 space-y-5 rounded-lg"
        style={{
          background: "linear-gradient(145deg, rgba(50, 35, 22, 0.75), rgba(38, 26, 18, 0.88))",
          border: "1px solid rgba(120, 90, 65, 0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(180,140,100,0.1), inset 0 -1px 2px rgba(0,0,0,0.25)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3.5">
          <div
            className="w-9 h-9 rounded flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))`,
              border: `1px solid rgba(120, 90, 65, 0.4)`,
              boxShadow: `0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180, 140, 100, 0.15)`,
            }}
          >
            <Brain className="w-4 h-4" style={{ color: "rgba(180, 140, 75, 1)", filter: "drop-shadow(0 0 3px rgba(180,140,75,0.6))" }} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
              {t("collectionIntelligence.title")}
            </h2>
            <p className="text-sm" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
              {t("collectionIntelligence.subtitle")}
            </p>
          </div>
        </div>

        {/* ── Collection Health — expanded by default ─────────────────────── */}
        <CollapsibleSection
          label={t("collectionIntelligence.healthTitle")}
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {healthMetrics.map((m, i) => {
              const isGood =
                m.value === t("collectionIntelligence.healthGood") ||
                m.value === t("collectionIntelligence.healthStrong");
              const isMod = m.value === t("collectionIntelligence.healthModerate");
              const isLow = m.value === t("collectionIntelligence.healthLow");
              return (
                <div
                  key={i}
                  className="flex justify-between items-center px-3 py-2.5 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(55, 40, 25, 0.45), rgba(45, 32, 22, 0.55))",
                    border: "1px solid rgba(120, 90, 65, 0.3)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(180,140,100,0.08)",
                  }}
                >
                  <span className="text-sm" style={{ color: "rgba(224, 216, 200, 0.8)" }}>{m.label}</span>
                  <span
                    className={`text-sm font-semibold`}
                    style={{
                      color: isGood
                        ? "#46BD5C"
                        : isMod
                        ? "#F59E0B"
                        : isLow
                        ? "#E85D5D"
                        : "rgba(224, 216, 200, 0.4)"
                    }}
                  >
                    {m.value}
                  </span>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* ── Insights — collapsed by default ────────────────────────────── */}
        {insights.length > 0 && (
          <CollapsibleSection
            label={t("collectionIntelligence.insightsTitle")}
            defaultOpen={false}
          >
            <div className="space-y-3">
              {visibleInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onAction={
                    insight.isDrillDown
                      ? () => setRotationModalOpen(true)
                      : undefined
                  }
                />
              ))}
            </div>
            {insights.length > DEFAULT_VISIBLE && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-3 flex items-center gap-1.5 text-sm text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    {t("collectionIntelligence.showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    {t("collectionIntelligence.showMore", {
                      count: hiddenCount,
                    })}
                  </>
                )}
              </button>
            )}
          </CollapsibleSection>
        )}

        {/* ── AI Updates — collapsed by default ──────────────────────────── */}
        {(topRecommendations.length > 0 || aiUpdates.length > 0) && (
          <CollapsibleSection
            label={t("collectionIntelligence.updatesTitle")}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {topRecommendations.length > 0 && (
                <div>
                  <div className="text-xs text-[#E0D8C8]/50 uppercase tracking-wider mb-2">
                    {t("collectionIntelligence.recommendationsTitle")}
                  </div>
                  <div className="space-y-3">
                    {topRecommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} t={t} />
                    ))}
                  </div>
                </div>
              )}
              {aiUpdates.length > 0 && (
                <div className="space-y-2">
                  {aiUpdates.map((update) => (
                    <UpdateFeedItem key={update.id} update={update} />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* ── Rotation drill-down modal ─────────────────────────────────────── */}
      <RotationDrillDownModal
        pipes={overduePipes}
        latestLogByPipe={latestLogByPipe}
        open={rotationModalOpen}
        onClose={() => setRotationModalOpen(false)}
      />
    </>
  );
}