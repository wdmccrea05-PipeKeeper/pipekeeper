import React, { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { PKCard } from "@/components/ui/pk-surface";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { formatCurrency } from "@/components/utils/localeFormatters";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import { isAppleBuild } from "@/components/utils/appVariant";
import {
  BarChart3,
  Flame,
  Leaf,
  Star,
  Trophy,
  TrendingUp,
  Calendar,
  Award,
  Share2,
  Zap,
  Clock,
} from "lucide-react";
import { differenceInCalendarDays, subDays, isWithinInterval, parseISO } from "date-fns";
import { getBowlsUsed } from "@/components/utils/schemaCompatibility";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import { toast } from "sonner";

const DEFAULT_INSIGHTS_TAB = "log";

function getTabFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("tab") || DEFAULT_INSIGHTS_TAB;
  } catch {
    return DEFAULT_INSIGHTS_TAB;
  }
}

function SnapshotCard({ icon: Icon, label, value, accent = "#4A7C9C", sub }) {
  return (
    <PKCard className="p-4 flex flex-col gap-2 min-h-[90px]">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}25` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-xs text-[#E0D8C8]/60 uppercase tracking-wide font-medium leading-tight">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#E0D8C8] leading-none">{value}</div>
      {sub && <div className="text-xs text-[#E0D8C8]/50">{sub}</div>}
    </PKCard>
  );
}

function HighlightCard({ title, value, sub, accent = "#C87941", icon: Icon, onShare, cardRef }) {
  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[170px]"
      style={{
        background: `linear-gradient(145deg, #1a2535 0%, #111921 50%, ${accent}18 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `0 0 0 1px ${accent}20, 0 8px 32px -8px ${accent}40, 0 2px 8px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}00 0%, ${accent}cc 40%, ${accent}ff 60%, ${accent}00 100%)` }}
      />

      {/* Content */}
      <div className="p-5 pb-3 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          {/* Icon with glow */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accent}35 0%, ${accent}18 100%)`,
              border: `1px solid ${accent}40`,
              boxShadow: `0 0 12px ${accent}30`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent}80)` }} />
          </div>

          {/* Share button — elegant top-right placement */}
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 opacity-50 hover:opacity-100"
              style={{
                background: `${accent}20`,
                border: `1px solid ${accent}40`,
              }}
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" style={{ color: accent }} />
            </button>
          )}
        </div>

        {/* Text hierarchy */}
        <div className="space-y-1">
          <div
            className="text-[10px] uppercase tracking-[0.12em] font-bold"
            style={{ color: `${accent}cc` }}
          >
            {title}
          </div>
          <div className="text-2xl font-bold text-[#F0EAD8] leading-tight tracking-tight">
            {value ?? "—"}
          </div>
          {sub && (
            <div className="text-xs text-[#E0D8C8]/55 leading-snug pt-0.5">
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* Bottom branding strip */}
      <div
        className="px-5 py-2 flex items-center justify-end"
        style={{ borderTop: `1px solid ${accent}18` }}
      >
        <span className="text-[9px] uppercase tracking-[0.15em] font-semibold select-none" style={{ color: `${accent}50` }}>
          PipeKeeper
        </span>
      </div>
    </div>
  );
}

function computeLongestStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const days = [
    ...new Set(
      logs.map((l) => {
        try {
          return l.date ? l.date.slice(0, 10) : null;
        } catch {
          return null;
        }
      }).filter(Boolean)
    ),
  ].sort();
  if (days.length === 0) return 0;
  let maxStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = parseISO(days[i - 1]);
    const curr = parseISO(days[i]);
    const diff = differenceInCalendarDays(curr, prev);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diff > 1) {
      currentStreak = 1;
    }
  }
  return maxStreak;
}

export default function Insights() {
  const { t } = useTranslation();
  const { user, hasPaid } = useCurrentUser();
  const initialTab = getTabFromUrl();

  const highlightRefs = useRef({});

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ["cellar-logs-all", user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: () =>
      base44.entities.SmokingLog.filter({ created_by: user?.email }, "-date", 1000),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // ---- computed stats ----
  const totalPipeValue = useMemo(
    () => pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0),
    [pipes]
  );
  const totalTobaccoValue = useMemo(
    () => calculateTobaccoCollectionValue(blends, cellarLogs),
    [blends, cellarLogs]
  );
  const totalCellaredOz = useMemo(() => calculateCellaredOzFromLogs(cellarLogs), [cellarLogs]);
  const totalCollectionValue = totalPipeValue + totalTobaccoValue;

  const now = new Date();
  const oneWeekAgo = subDays(now, 7);
  const sessionsThisWeek = useMemo(
    () =>
      smokingLogs.filter((l) => {
        try {
          if (!l?.date) return false;
          const d = parseISO(l.date.slice(0, 10));
          return isWithinInterval(d, { start: oneWeekAgo, end: now });
        } catch {
          return false;
        }
      }).length,
    [smokingLogs]
  );

  // pipe usage counts
  const pipeUsage = useMemo(() => {
    const map = {};
    smokingLogs.forEach((l) => {
      if (l?.pipe_id) {
        map[l.pipe_id] = (map[l.pipe_id] || 0) + getBowlsUsed(l);
      }
    });
    return map;
  }, [smokingLogs]);

  const blendUsage = useMemo(() => {
    const map = {};
    smokingLogs.forEach((l) => {
      if (l?.blend_id) {
        map[l.blend_id] = (map[l.blend_id] || 0) + getBowlsUsed(l);
      }
    });
    return map;
  }, [smokingLogs]);

  const mostUsedPipe = useMemo(() => {
    if (!Object.keys(pipeUsage).length) return null;
    const topId = Object.entries(pipeUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
    const pipe = pipes.find((p) => p.id === topId);
    return pipe ? { pipe, count: pipeUsage[topId] } : null;
  }, [pipeUsage, pipes]);

  const mostUsedBlend = useMemo(() => {
    if (!Object.keys(blendUsage).length) return null;
    const topId = Object.entries(blendUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
    const blend = blends.find((b) => b.id === topId);
    return blend ? { blend, count: blendUsage[topId] } : null;
  }, [blendUsage, blends]);

  const mostValuablePipe = useMemo(() => {
    if (!pipes.length) return null;
    const top = [...pipes].sort(
      (a, b) => (Number(b?.estimated_value) || 0) - (Number(a?.estimated_value) || 0)
    )[0];
    return top?.estimated_value ? top : null;
  }, [pipes]);

  const longestStreak = useMemo(() => computeLongestStreak(smokingLogs), [smokingLogs]);

  const hasData = pipes.length > 0 || blends.length > 0 || smokingLogs.length > 0;

  const handleShareCard = async (key) => {
    const node = highlightRefs.current[key];
    if (!node) return;
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#111921",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], "pipekeeper-highlight.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "My PipeKeeper Highlight" });
            return;
          }
        } catch (shareErr) {
          if (shareErr?.name === "AbortError") return;
          // Fall through to download
        }
      }
      // Fallback: download
      const link = document.createElement("a");
      link.download = `pipekeeper-highlight-${key}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(t("insights.shareError", { defaultValue: "Could not share card" }));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-[#6aabc0]" />
            <h1 className="text-2xl font-bold font-serif text-[#E0D8C8]">
              {t("insights.title")}
            </h1>
            {hasPaid && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                {t("subscription.proBadge", { defaultValue: "Pro" })}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#E0D8C8]/60">{t("insights.subtitle")}</p>
        </div>
      </div>

      {/* ── COLLECTION SNAPSHOT CARDS ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SnapshotCard
          icon={Flame}
          label={t("insights.snapshotSessions", { defaultValue: "Total Sessions" })}
          value={smokingLogs.length}
          accent="#C87941"
          sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`}
        />
        <SnapshotCard
          icon={isAppleBuild ? Leaf : BarChart3}
          label={t("home.pipesInCollection")}
          value={pipes.length}
          accent="#4A7C9C"
        />
        <SnapshotCard
          icon={Leaf}
          label={t("home.tobaccoBlends")}
          value={blends.length}
          accent="#4A7C59"
          sub={`${totalCellaredOz.toFixed(1)} oz ${t("home.cellared", { defaultValue: "cellared" })}`}
        />
        <SnapshotCard
          icon={TrendingUp}
          label={t("home.totalValue")}
          value={formatCurrency(Math.round(totalCollectionValue))}
          accent="#8b5e3a"
        />
        <SnapshotCard
          icon={Clock}
          label={t("insights.snapshotStreak", { defaultValue: "Longest Streak" })}
          value={`${longestStreak}d`}
          accent="#7c4a9c"
          sub={t("insights.snapshotConsecutiveDays", { defaultValue: "consecutive days" })}
        />
        <SnapshotCard
          icon={Calendar}
          label={t("insights.snapshotAvgWeek", { defaultValue: "Avg / Week" })}
          value={
            smokingLogs.length > 0
              ? (
                  smokingLogs.length /
                  Math.max(
                    1,
                    Math.ceil(
                      differenceInCalendarDays(
                        now,
                        parseISO(smokingLogs[smokingLogs.length - 1]?.date?.slice(0, 10) || now.toISOString().slice(0, 10))
                      ) / 7
                    )
                  )
                ).toFixed(1)
              : "—"
          }
          accent="#4A7C9C"
          sub={t("insights.snapshotSessionsPerWeek", { defaultValue: "sessions / week" })}
        />
      </div>

      {/* ── TOP HIGHLIGHTS (Spotify Wrapped style) ────────── */}
      {hasData && (
        <div className="space-y-4">
          {/* Premium section heading */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Trophy className="w-4 h-4 text-amber-400" style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.6))" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F0EAD8] tracking-tight">
                {t("insights.topHighlights", { defaultValue: "Top Highlights" })}
              </h2>
              <p className="text-[11px] text-[#E0D8C8]/40 uppercase tracking-[0.1em]">
                {t("insights.topHighlightsSub", { defaultValue: "Your collection at a glance" })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mostUsedPipe && (
              <HighlightCard
                title={t("insights.highlightMostSmoked", { defaultValue: "Most Smoked Pipe" })}
                value={mostUsedPipe.pipe.name}
                sub={`${mostUsedPipe.count} ${t("insights.highlightBowls", { defaultValue: "bowls" })}`}
                accent="#C87941"
                icon={Star}
                cardRef={(el) => (highlightRefs.current["mostPipe"] = el)}
                onShare={() => handleShareCard("mostPipe")}
              />
            )}
            {mostUsedBlend && (
              <HighlightCard
                title={t("insights.highlightFavoriteBlend", { defaultValue: "Favorite Blend" })}
                value={mostUsedBlend.blend.name}
                sub={`${mostUsedBlend.count} ${t("insights.highlightBowls", { defaultValue: "bowls" })}`}
                accent="#4A7C59"
                icon={Leaf}
                cardRef={(el) => (highlightRefs.current["mostBlend"] = el)}
                onShare={() => handleShareCard("mostBlend")}
              />
            )}
            {longestStreak > 0 && (
              <HighlightCard
                title={t("insights.highlightLongestStreak", { defaultValue: "Longest Streak" })}
                value={`${longestStreak} days`}
                sub={t("insights.highlightConsecutive", { defaultValue: "consecutive smoking days" })}
                accent="#7c4a9c"
                icon={Zap}
                cardRef={(el) => (highlightRefs.current["streak"] = el)}
                onShare={() => handleShareCard("streak")}
              />
            )}
            {mostValuablePipe && (
              <HighlightCard
                title={t("insights.highlightMostValuable", { defaultValue: "Most Valuable Pipe" })}
                value={mostValuablePipe.name}
                sub={formatCurrency(mostValuablePipe.estimated_value)}
                accent="#8b3a3a"
                icon={Award}
                cardRef={(el) => (highlightRefs.current["valuePipe"] = el)}
                onShare={() => handleShareCard("valuePipe")}
              />
            )}
            {smokingLogs.length > 0 && (
              <HighlightCard
                title={t("insights.highlightTotalSessions", { defaultValue: "Total Sessions Logged" })}
                value={smokingLogs.length}
                sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`}
                accent="#4A7C9C"
                icon={Flame}
                cardRef={(el) => (highlightRefs.current["totalSessions"] = el)}
                onShare={() => handleShareCard("totalSessions")}
              />
            )}
            {blends.length > 0 && (
              <HighlightCard
                title={t("insights.highlightCellarValue", { defaultValue: "Collection Value" })}
                value={formatCurrency(Math.round(totalCollectionValue))}
                sub={`${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`}
                accent="#5e8b3a"
                icon={TrendingUp}
                cardRef={(el) => (highlightRefs.current["collectionValue"] = el)}
                onShare={() => handleShareCard("collectionValue")}
              />
            )}
          </div>
        </div>
      )}

      {/* ── FULL ANALYTICS PANEL ─────────────────────────── */}
      <CollectionInsightsPanel
        pipes={pipes}
        blends={blends}
        user={user}
        activeTab={initialTab}
      />
    </div>
  );
}
