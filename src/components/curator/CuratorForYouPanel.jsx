/**
 * CuratorForYouPanel.jsx
 *
 * The "For You" landing view inside the Collection Curator.
 * Displays proactive, module-aware insights generated from the user's
 * collection without waiting for them to ask a question.
 *
 * Each insight is explainable (reason), actionable (suggested_action +
 * action buttons), and respects AI exclusion rules.
 *
 * Supports future modules: the insight engine is module-aware; new module
 * types automatically surface here once their generators are registered.
 */

import React, { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { generateProactiveInsights } from "@/components/platform/proactiveInsights";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";
import {
  Brain,
  RotateCcw,
  Leaf,
  Sparkles,
  Shield,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Icon mapping ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  rotation: RotateCcw,
  pairing: Sparkles,
  diversity: Leaf,
  aging: AlertTriangle,
  inventory: Activity,
  value: TrendingUp,
  collection_health: Shield,
  acquisition_opportunity: Brain,
  maintenance: Activity,
  usage_pattern: Activity,
};

// ─── Severity styles ──────────────────────────────────────────────────────────

const SEVERITY_ACCENT = {
  high: "border-l-2 border-red-400/60",
  medium: "border-l-2 border-amber-400/60",
  low: "border-l-2 border-stone-500/40",
};

const SEVERITY_ICON_COLOR = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-[#E0D8C8]/50",
};

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({ insight, onAskCurator, onDismiss, onOpenWhatIf }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const Icon = CATEGORY_ICONS[insight.category] || Activity;
  const accentClass = SEVERITY_ACCENT[insight.severity] || "";
  const iconColor = SEVERITY_ICON_COLOR[insight.severity] || "text-[#E0D8C8]/50";

  const handleDismiss = useCallback(
    (e) => {
      e.stopPropagation();
      onDismiss?.(insight.id);
    },
    [onDismiss, insight.id]
  );

  const handleAskCurator = useCallback(() => {
    onAskCurator?.(insight);
  }, [onAskCurator, insight]);

  const handleWhatIf = useCallback(() => {
    onOpenWhatIf?.(insight);
  }, [onOpenWhatIf, insight]);

  return (
    <div
      className={`rounded-xl bg-white/5 p-4 flex flex-col gap-3 transition-colors hover:bg-white/[0.07] ${accentClass}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <Icon
          className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-[#E0D8C8] text-sm leading-snug">
              {insight.title}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 text-[#E0D8C8]/30 hover:text-[#E0D8C8]/60 transition-colors -mt-0.5"
              aria-label={t("curator.forYou.dismiss")}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-[#E0D8C8]/70 mt-1 leading-relaxed">
            {insight.summary}
          </p>
        </div>
      </div>

      {/* Expand/collapse reason */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-[#E0D8C8]/50 hover:text-[#E0D8C8]/70 transition-colors self-start ml-7"
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" aria-hidden="true" />
            {t("curator.forYou.hideReason")}
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" aria-hidden="true" />
            {t("curator.forYou.whyThisInsight")}
          </>
        )}
      </button>

      {expanded && (
        <div className="ml-7 rounded-lg bg-white/5 p-3 space-y-2">
          <p className="text-xs text-[#E0D8C8]/70 leading-relaxed">
            <span className="font-semibold text-[#E0D8C8]/80">
              {t("curator.forYou.reason")}:
            </span>{" "}
            {insight.reason}
          </p>
          {insight.suggested_action && (
            <p className="text-xs text-[#E0D8C8]/70 leading-relaxed">
              <span className="font-semibold text-[#E0D8C8]/80">
                {t("curator.forYou.suggestedAction")}:
              </span>{" "}
              {insight.suggested_action}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 ml-7">
        {insight.scope === "pipe" || insight.scope === "cross_module" ? (
          <a
            href={createPageUrl("Pipes")}
            className="text-xs font-medium text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400/10 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
            {t("curator.forYou.viewPipes")}
          </a>
        ) : null}
        {insight.scope === "tobacco" || insight.scope === "cross_module" ? (
          <a
            href={createPageUrl("Tobacco")}
            className="text-xs font-medium text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400/10 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
            {t("curator.forYou.viewTobacco")}
          </a>
        ) : null}
        <button
          type="button"
          onClick={handleWhatIf}
          className="text-xs font-medium text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg hover:bg-amber-400/10 transition-colors flex items-center gap-1"
          aria-label={t("curator.forYou.exploreCurator")}
        >
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          {t("curator.forYou.exploreThis")}
        </button>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ t }) {
  return (
    <div className="text-center py-10 space-y-3">
      <Brain
        className="w-12 h-12 mx-auto text-[#E0D8C8]/20"
        aria-hidden="true"
      />
      <p className="text-[#E0D8C8]/60 text-sm">
        {t("curator.forYou.emptyState")}
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <a href={createPageUrl("Pipes")}>
          <Button size="sm" variant="outline" className="text-xs">
            {t("curator.forYou.addPipe")}
          </Button>
        </a>
        <a href={createPageUrl("Tobacco")}>
          <Button size="sm" variant="outline" className="text-xs">
            {t("curator.forYou.addTobacco")}
          </Button>
        </a>
      </div>
    </div>
  );
}

// ─── CuratorForYouPanel ───────────────────────────────────────────────────────

/**
 * Proactive "For You" panel for the Collection Curator.
 *
 * @param {object} props
 * @param {object[]} props.pipes
 * @param {object[]} props.blends
 * @param {function} [props.onAskCurator]   - Called with an insight to open Curator with prefill.
 * @param {function} [props.onOpenWhatIf]   - Called with an insight to open Curator with what-if prompt.
 */
export default function CuratorForYouPanel({ pipes = [], blends = [], onAskCurator, onOpenWhatIf }) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [dismissed, setDismissed] = useState(new Set());

  // Fetch smoking logs to build latest-log-by-pipe map
  const { data: smokingLogs = [] } = useQuery({
    queryKey: ["smokingLogs", user?.email],
    queryFn: async () => {
      const result = await fetchAllEntities(
        base44.entities.SmokingLog,
        { created_by: user?.email },
        '-date',
        5000,
        200,
        'CuratorForYouPanel:SmokingLog',
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  // Fetch pairings for cross-module pairing insights
  const { data: pairings = [] } = useQuery({
    queryKey: ["pairings", user?.email],
    queryFn: async () => {
      const result = await base44.entities.PipeTobaccoPairing.filter({
        created_by: user?.email,
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  // Build latest-log-by-pipe map
  const latestLogByPipe = useMemo(() => {
    const map = {};
    for (const log of smokingLogs) {
      if (!log.pipe_id) continue;
      const existing = map[log.pipe_id];
      const logDate = log.date || log.created_at;
      if (!logDate) continue;
      if (!existing || logDate > existing) {
        map[log.pipe_id] = logDate;
      }
    }
    return map;
  }, [smokingLogs]);

  // Generate proactive insights
  const allInsights = useMemo(
    () =>
      generateProactiveInsights({
        pipes,
        blends,
        pairings,
        latestLogByPipe,
      }),
    // Keying on lengths is a deliberate performance trade-off: regenerate when items
    // are added or removed. Edits to individual item fields (e.g. name) do not
    // affect insight logic which depends on ai_excluded, blend_type, status, and
    // dates — all of which require re-fetching to change latestLogByPipe or the
    // pairings/blends arrays that come from React Query's staleTime-controlled cache.
    [pipes.length, blends.length, pairings.length, smokingLogs.length]
  );

  const visibleInsights = useMemo(
    () => allInsights.filter((i) => !dismissed.has(i.id)),
    [allInsights, dismissed]
  );

  const handleDismiss = useCallback((id) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const handleAskCurator = useCallback(
    (insight) => {
      onAskCurator?.(insight);
    },
    [onAskCurator]
  );

  const handleOpenWhatIf = useCallback(
    (insight) => {
      onOpenWhatIf?.(insight);
    },
    [onOpenWhatIf]
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#E0D8C8]">
            {t("curator.forYou.title")}
          </h3>
          <p className="text-sm text-[#E0D8C8]/60 mt-0.5">
            {t("curator.forYou.subtitle")}
          </p>
        </div>
        {visibleInsights.length > 0 && (
          <span className="text-xs text-[#E0D8C8]/40">
            {visibleInsights.length}{" "}
            {visibleInsights.length === 1
              ? t("curator.forYou.insight")
              : t("curator.forYou.insights")}
          </span>
        )}
      </div>

      {/* Insight cards */}
      {visibleInsights.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAskCurator={handleAskCurator}
              onDismiss={handleDismiss}
              onOpenWhatIf={handleOpenWhatIf}
            />
          ))}
        </div>
      )}
    </div>
  );
}