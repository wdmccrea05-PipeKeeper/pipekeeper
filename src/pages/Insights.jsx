import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
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
  X,
  Sparkles,
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

// ── Inline SVG patterns for card texture ──────────────────────────────────────
function CardPattern({ type = "dots", accent }) {
  if (type === "dots") {
    return (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`dots-${accent.replace("#","")}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={accent} fillOpacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${accent.replace("#","")})`} />
      </svg>
    );
  }
  if (type === "diagonal") {
    return (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`diag-${accent.replace("#","")}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="16" stroke={accent} strokeWidth="0.5" strokeOpacity="0.10" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diag-${accent.replace("#","")})`} />
      </svg>
    );
  }
  if (type === "grid") {
    return (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-${accent.replace("#","")}`} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={accent} strokeWidth="0.4" strokeOpacity="0.10" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${accent.replace("#","")})`} />
      </svg>
    );
  }
  return null;
}

// ── Snapshot metric cards (top row) ───────────────────────────────────────────
function SnapshotCard({ icon: Icon, label, value, accent = "#4A7C9C", sub }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col gap-3 p-4 min-h-[100px]"
      style={{
        background: `linear-gradient(145deg, #1e2f40 0%, #151f2b 60%, ${accent}22 100%)`,
        border: `1px solid ${accent}44`,
        boxShadow: `0 0 0 1px ${accent}18, 0 4px 20px -4px ${accent}30`,
      }}
    >
      {/* Subtle dot-pattern texture */}
      <CardPattern type="dots" accent={accent} />

      {/* Top-left accent glow blob */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)`,
          transform: "translate(30%, -30%)",
        }}
      />

      <div className="relative flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}40 0%, ${accent}20 100%)`,
            border: `1px solid ${accent}50`,
            boxShadow: `0 0 14px ${accent}35, inset 0 1px 0 ${accent}30`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent}cc)` }} />
        </div>
        <span className="text-[11px] text-[#E0D8C8]/55 uppercase tracking-[0.09em] font-semibold leading-tight">
          {label}
        </span>
      </div>

      <div className="relative">
        <div
          className="text-3xl font-bold leading-none tracking-tight"
          style={{ color: "#F5F1E7", textShadow: `0 0 20px ${accent}40` }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] mt-1" style={{ color: `${accent}99` }}>
            {sub}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }}
      />
    </div>
  );
}

// ── Highlight card (story card grid item) ─────────────────────────────────────
const PATTERN_TYPES = ["dots", "diagonal", "grid", "dots", "diagonal", "grid"];

function HighlightCard({ title, value, sub, accent = "#C87941", icon: Icon, onShare, onStory, cardRef, patternIndex = 0 }) {
  const patternType = PATTERN_TYPES[patternIndex % PATTERN_TYPES.length];

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[200px] cursor-default group"
      style={{
        background: `linear-gradient(155deg, #1a2535 0%, #0e1520 45%, ${accent}28 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `0 0 0 1px ${accent}22, 0 12px 40px -8px ${accent}50, 0 4px 12px rgba(0,0,0,0.5)`,
      }}
    >
      {/* SVG texture pattern */}
      <CardPattern type={patternType} accent={accent} />

      {/* Ambient corner glow */}
      <div
        className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          transform: "translate(30%, 30%)",
        }}
      />
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          transform: "translate(-30%, -30%)",
        }}
      />

      {/* Top accent bar — thicker and glowing */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ee 35%, ${accent}ff 50%, ${accent}ee 65%, ${accent}00 100%)`,
          boxShadow: `0 0 8px ${accent}cc`,
        }}
      />

      {/* Main content */}
      <div className="relative p-5 pb-3 flex flex-col gap-4 flex-1">
        {/* Top row: icon + share */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="rounded-2xl flex items-center justify-center shrink-0"
            style={{
              width: "3.25rem",
              height: "3.25rem",
              background: `linear-gradient(135deg, ${accent}50 0%, ${accent}28 100%)`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 18px ${accent}50, inset 0 1px 0 ${accent}40`,
            }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent}cc)` }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Story card trigger */}
            {onStory && (
              <button
                onClick={onStory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 opacity-0 group-hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}30`,
                  border: `1px solid ${accent}50`,
                  color: accent,
                }}
                title="View story card"
              >
                <Sparkles className="w-3 h-3" />
                Story
              </button>
            )}
            {/* Share button */}
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 opacity-40 hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}25`,
                  border: `1px solid ${accent}45`,
                }}
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" style={{ color: accent }} />
              </button>
            )}
          </div>
        </div>

        {/* Story text hierarchy */}
        <div className="space-y-1.5">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-bold"
            style={{ color: `${accent}dd` }}
          >
            {title}
          </div>
          <div
            className="text-3xl font-bold leading-tight tracking-tight"
            style={{ color: "#F5F1E7", textShadow: `0 0 24px ${accent}50` }}
          >
            {value ?? "—"}
          </div>
          {sub && (
            <div
              className="text-xs leading-snug pt-0.5 font-medium"
              style={{ color: `${accent}bb` }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* Bottom branding + share bar */}
      <div
        className="relative px-5 py-2.5 flex items-center justify-between"
        style={{ borderTop: `1px solid ${accent}20` }}
      >
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-bold select-none"
          style={{ color: `${accent}60` }}
        >
          PipeKeeper
        </span>
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide font-semibold rounded-md px-2 py-1 transition-all duration-200 opacity-50 hover:opacity-100 active:opacity-100"
            style={{
              color: `${accent}cc`,
              border: `1px solid ${accent}30`,
              background: `${accent}12`,
            }}
          >
            <Share2 className="w-2.5 h-2.5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}

// ── Full-screen Story / Share card modal ──────────────────────────────────────
function StoryCardModal({ title, value, sub, accent, icon: Icon, onClose, onExport, storyRef }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Story card — portrait oriented */}
      <div
        ref={storyRef}
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-hidden"
        style={{
          width: "min(340px, 90vw)",
          height: "min(560px, 85vh)",
          borderRadius: "24px",
          background: `linear-gradient(175deg, #0e1520 0%, #131d2a 30%, ${accent}35 70%, ${accent}55 100%)`,
          border: `1px solid ${accent}66`,
          boxShadow: `0 0 0 1px ${accent}30, 0 32px 80px -16px ${accent}70, 0 8px 32px rgba(0,0,0,0.6)`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* SVG dot texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="story-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill={accent} fillOpacity="0.10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#story-dots)" />
        </svg>

        {/* Large ambient glow blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}55 0%, transparent 65%)`,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-40px",
            left: "-40px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}28 0%, transparent 65%)`,
          }}
        />

        {/* Top glow bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ff 50%, ${accent}00 100%)`,
            boxShadow: `0 0 12px ${accent}cc`,
          }}
        />

        {/* Header branding */}
        <div className="relative flex items-center justify-between px-7 pt-7 pb-0">
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: `${accent}99` }}
          >
            PipeKeeper
          </div>
          <div
            className="text-[9px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}44`,
              color: `${accent}cc`,
            }}
          >
            Highlight
          </div>
        </div>

        {/* Central content — vertically centered */}
        <div className="relative flex flex-col items-center justify-center flex-1 px-7 text-center gap-6">
          {/* Icon orb */}
          <div
            className="flex items-center justify-center"
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "24px",
              background: `linear-gradient(135deg, ${accent}60 0%, ${accent}30 100%)`,
              border: `1.5px solid ${accent}66`,
              boxShadow: `0 0 40px ${accent}60, inset 0 1px 0 ${accent}50`,
            }}
          >
            <Icon
              style={{
                width: "44px",
                height: "44px",
                color: accent,
                filter: `drop-shadow(0 0 12px ${accent}dd)`,
              }}
            />
          </div>

          {/* Category label */}
          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ color: `${accent}cc` }}
          >
            {title}
          </div>

          {/* Main stat — huge */}
          <div
            className="font-bold leading-none tracking-tighter"
            style={{
              fontSize: "clamp(2.5rem, 10vw, 3.5rem)",
              color: "#F5F1E7",
              textShadow: `0 0 40px ${accent}70, 0 2px 8px rgba(0,0,0,0.5)`,
            }}
          >
            {value ?? "—"}
          </div>

          {/* Sub text */}
          {sub && (
            <div
              className="text-base font-semibold leading-snug"
              style={{ color: `${accent}cc` }}
            >
              {sub}
            </div>
          )}
        </div>

        {/* Bottom export action */}
        <div
          className="relative flex items-center justify-center gap-3 px-7 pb-7 pt-4"
          style={{ borderTop: `1px solid ${accent}22` }}
        >
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}99 100%)`,
              color: "#0e1520",
              boxShadow: `0 0 20px ${accent}60`,
              border: `1px solid ${accent}aa`,
            }}
          >
            <Share2 className="w-4 h-4" />
            Share / Export
          </button>
        </div>
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
  const storyRef = useRef(null);
  // activeStory: { title, value, sub, accent, icon } | null
  const [activeStory, setActiveStory] = useState(null);

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

  // ── Share: capture a DOM node and share/download as image ─────────────────
  const captureAndShare = async (node, filename) => {
    const canvas = await html2canvas(node, {
      backgroundColor: "#0e1520",
      scale: 3,
      useCORS: true,
      logging: false,
    });
    const dataUrl = canvas.toDataURL("image/png");
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${filename}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My PipeKeeper Highlight" });
          return;
        }
      } catch (shareErr) {
        if (shareErr?.name === "AbortError") return;
      }
    }
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareCard = async (key) => {
    const node = highlightRefs.current[key];
    if (!node) return;
    try {
      await captureAndShare(node, `pipekeeper-highlight-${key}`);
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(t("insights.shareError", { defaultValue: "Could not share card" }));
      }
    }
  };

  const handleExportStory = async () => {
    const node = storyRef.current;
    if (!node) return;
    try {
      await captureAndShare(node, "pipekeeper-story-card");
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(t("insights.shareError", { defaultValue: "Could not share card" }));
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Story Card Modal ────────────────────────────────── */}
      {activeStory && (
        <StoryCardModal
          {...activeStory}
          storyRef={storyRef}
          onClose={() => setActiveStory(null)}
          onExport={handleExportStory}
        />
      )}

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="relative">
        {/* Subtle background glow behind header */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, #C8794118 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3 py-1">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6aabc040 0%, #6aabc020 100%)",
                  border: "1px solid #6aabc050",
                  boxShadow: "0 0 16px #6aabc030",
                }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: "#6aabc0", filter: "drop-shadow(0 0 6px #6aabc099)" }} />
              </div>
              <h1
                className="text-3xl font-bold font-serif tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #F5F1E7 0%, #C8B89A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t("insights.title")}
              </h1>
              {hasPaid && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  {t("subscription.proBadge", { defaultValue: "Pro" })}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#E0D8C8]/55 pl-12">{t("insights.subtitle")}</p>
          </div>
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
          accent="#C4963A"
        />
        <SnapshotCard
          icon={Clock}
          label={t("insights.snapshotStreak", { defaultValue: "Longest Streak" })}
          value={`${longestStreak}d`}
          accent="#8B5CF6"
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
          accent="#22D3EE"
          sub={t("insights.snapshotSessionsPerWeek", { defaultValue: "sessions / week" })}
        />
      </div>

      {/* ── TOP HIGHLIGHTS ────────────────────────────────── */}
      {hasData && (
        <div className="space-y-6">
          {/* Dramatic section heading */}
          <div className="relative">
            {/* Background glow strip */}
            <div
              className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 0%, #F59E0B55 40%, #F59E0B55 60%, transparent 100%)" }}
            />
            <div className="relative flex items-center gap-4 py-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #F59E0B35 0%, #F59E0B18 100%)",
                  border: "1px solid #F59E0B45",
                  boxShadow: "0 0 24px #F59E0B35, inset 0 1px 0 #F59E0B30",
                }}
              >
                <Trophy
                  className="w-6 h-6"
                  style={{ color: "#F59E0B", filter: "drop-shadow(0 0 8px #F59E0Bcc)" }}
                />
              </div>
              <div>
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #F5F1E7 0%, #F59E0B 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("insights.topHighlights", { defaultValue: "Top Highlights" })}
                </h2>
                <p className="text-[11px] text-[#E0D8C8]/45 uppercase tracking-[0.14em] font-semibold mt-0.5">
                  {t("insights.topHighlightsSub", { defaultValue: "Your collector story" })}
                </p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#E0D8C8]/30 font-semibold">
                <Sparkles className="w-3 h-3" />
                Tap a card for story view
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mostUsedPipe && (
              <HighlightCard
                title={t("insights.highlightMostSmoked", { defaultValue: "Most Smoked Pipe" })}
                value={mostUsedPipe.pipe.name}
                sub={`${mostUsedPipe.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`}
                accent="#C87941"
                icon={Star}
                patternIndex={0}
                cardRef={(el) => (highlightRefs.current["mostPipe"] = el)}
                onShare={() => handleShareCard("mostPipe")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightMostSmoked", { defaultValue: "Most Smoked Pipe" }),
                  value: mostUsedPipe.pipe.name,
                  sub: `${mostUsedPipe.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`,
                  accent: "#C87941",
                  icon: Star,
                })}
              />
            )}
            {mostUsedBlend && (
              <HighlightCard
                title={t("insights.highlightFavoriteBlend", { defaultValue: "Favorite Blend" })}
                value={mostUsedBlend.blend.name}
                sub={`${mostUsedBlend.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`}
                accent="#4A9C6A"
                icon={Leaf}
                patternIndex={1}
                cardRef={(el) => (highlightRefs.current["mostBlend"] = el)}
                onShare={() => handleShareCard("mostBlend")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightFavoriteBlend", { defaultValue: "Favorite Blend" }),
                  value: mostUsedBlend.blend.name,
                  sub: `${mostUsedBlend.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`,
                  accent: "#4A9C6A",
                  icon: Leaf,
                })}
              />
            )}
            {longestStreak > 0 && (
              <HighlightCard
                title={t("insights.highlightLongestStreak", { defaultValue: "Longest Streak" })}
                value={`${longestStreak} days`}
                sub={t("insights.highlightConsecutive", { defaultValue: "consecutive smoking days" })}
                accent="#8B5CF6"
                icon={Zap}
                patternIndex={2}
                cardRef={(el) => (highlightRefs.current["streak"] = el)}
                onShare={() => handleShareCard("streak")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightLongestStreak", { defaultValue: "Longest Streak" }),
                  value: `${longestStreak} days`,
                  sub: t("insights.highlightConsecutive", { defaultValue: "consecutive smoking days" }),
                  accent: "#8B5CF6",
                  icon: Zap,
                })}
              />
            )}
            {mostValuablePipe && (
              <HighlightCard
                title={t("insights.highlightMostValuable", { defaultValue: "Most Valuable Pipe" })}
                value={mostValuablePipe.name}
                sub={formatCurrency(mostValuablePipe.estimated_value)}
                accent="#C0392B"
                icon={Award}
                patternIndex={3}
                cardRef={(el) => (highlightRefs.current["valuePipe"] = el)}
                onShare={() => handleShareCard("valuePipe")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightMostValuable", { defaultValue: "Most Valuable Pipe" }),
                  value: mostValuablePipe.name,
                  sub: formatCurrency(mostValuablePipe.estimated_value),
                  accent: "#C0392B",
                  icon: Award,
                })}
              />
            )}
            {smokingLogs.length > 0 && (
              <HighlightCard
                title={t("insights.highlightTotalSessions", { defaultValue: "Total Sessions Logged" })}
                value={smokingLogs.length}
                sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`}
                accent="#22D3EE"
                icon={Flame}
                patternIndex={4}
                cardRef={(el) => (highlightRefs.current["totalSessions"] = el)}
                onShare={() => handleShareCard("totalSessions")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightTotalSessions", { defaultValue: "Total Sessions Logged" }),
                  value: smokingLogs.length,
                  sub: `${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`,
                  accent: "#22D3EE",
                  icon: Flame,
                })}
              />
            )}
            {blends.length > 0 && (
              <HighlightCard
                title={t("insights.highlightCellarValue", { defaultValue: "Collection Value" })}
                value={formatCurrency(Math.round(totalCollectionValue))}
                sub={`${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`}
                accent="#10B981"
                icon={TrendingUp}
                patternIndex={5}
                cardRef={(el) => (highlightRefs.current["collectionValue"] = el)}
                onShare={() => handleShareCard("collectionValue")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightCellarValue", { defaultValue: "Collection Value" }),
                  value: formatCurrency(Math.round(totalCollectionValue)),
                  sub: `${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`,
                  accent: "#10B981",
                  icon: TrendingUp,
                })}
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
