import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Moon, RefreshCw, ChevronRight, Brain, Save, Wine, Pipette, FlaskConical } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { getAIEligibleModuleIds } from "@/components/utils/moduleAccess";
import { MODULE_ICONS } from "@/components/branding/moduleAssets";

const SESSION_MODES = [
  { value: "balanced", label: "Balanced" },
  { value: "rotation", label: "Rotation" },
  { value: "favorites", label: "Favorites" },
  { value: "exploration", label: "Exploration" },
  { value: "relaxed", label: "Relaxed" },
];

const MODULE_OPTIONS = [
  { value: "pipe_blend", label: "Pipe + Blend", icon: null, isPipeIcon: true },
  { value: "whiskey", label: "Whiskey Only", icon: Wine },
  { value: "pipe_blend_whiskey", label: "Pipe + Blend + Whiskey", icon: Sparkles },
];

const CACHE_KEY = "ck_tonight_session_v3";
const CACHE_TTL = 4 * 60 * 60 * 1000;

function getCached(mode, moduleScope) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data, cachedMode, cachedScope } = JSON.parse(raw);
    if (cachedMode !== mode || cachedScope !== moduleScope) return null;
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCached(mode, moduleScope, data) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), cachedMode: mode, cachedScope: moduleScope, data })
    );
  } catch {
    // ignore
  }
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickBest(items, fieldCandidates = []) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return [...items].sort((a, b) => {
    const aScore = fieldCandidates.reduce((sum, key) => sum + numeric(a?.[key]), 0);
    const bScore = fieldCandidates.reduce((sum, key) => sum + numeric(b?.[key]), 0);
    return bScore - aScore;
  })[0];
}

function buildFallback({ pipes, blends, bottles, mode, moduleScope }) {
  const includePipe = moduleScope !== "whiskey";
  const includeWhiskey = moduleScope !== "pipe_blend";

  const favoritePipe = includePipe ? pickBest(pipes, ["rating", "manual_rating", "times_smoked"]) : null;
  const favoriteBlend = includePipe ? pickBest(blends, ["rating", "manual_rating", "times_smoked"]) : null;
  const favoriteBottle = includeWhiskey ? pickBest(bottles, ["rating", "average_rating", "times_tasted"]) : null;

  if (!favoritePipe && !favoriteBlend && !favoriteBottle) return null;

  const pipeName = favoritePipe?.name || null;
  const blendName = favoriteBlend?.name || null;
  const bottleName = favoriteBottle?.name || null;

  return {
    pipe_id: favoritePipe?.id || null,
    pipe: pipeName,
    blend_id: favoriteBlend?.id || null,
    blend: blendName,
    whiskey_id: favoriteBottle?.id || null,
    whiskey: bottleName,
    flavor_theme:
      mode === "favorites"
        ? "Comforting favorite"
        : mode === "exploration"
          ? "Something worth revisiting"
          : "Balanced evening pairing",
    rationale: "Based on your current collection, this is your strongest ready-to-enjoy combination tonight.",
    learning_context: "Using your collection data for this recommendation.",
    mode_bias: mode,
  };
}

function ModeChip({ value, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
      style={{
        background: selected ? "rgba(180,140,75,0.25)" : "rgba(255,255,255,0.04)",
        border: selected ? "1px solid rgba(180,140,75,0.6)" : "1px solid rgba(120,90,65,0.25)",
        color: selected ? "rgba(224,200,140,1)" : "rgba(224,216,200,0.55)",
      }}
    >
      {label}
    </button>
  );
}

function RecommendationSlot({ label, value, accent = "#D4A574" }) {
  if (!value) return null;
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(40,28,18,0.7)",
        border: `1px solid ${accent}30`,
      }}
    >
      <p className="text-xs uppercase tracking-widest mb-1.5 font-semibold" style={{ color: `${accent}99` }}>
        {label}
      </p>
      <p className="text-sm font-semibold leading-snug break-words" style={{ color: "#F5F1E7" }}>
        {value}
      </p>
    </div>
  );
}

export default function TonightSessionCard({
  pipes = [],
  blends = [],
  bottles = [],
  profile = null,
  tasteProfile = null,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { moduleStates, isModuleEnabled } = useEnabledKeeperModules();

  const whiskeyEnabled = isModuleEnabled("whiskeykeeper");

  // Determine valid module options based on what's enabled
  const availableModuleOptions = useMemo(() => {
    const opts = [];
    if (pipes.length > 0 || blends.length > 0) {
      opts.push(MODULE_OPTIONS[0]); // pipe_blend
    }
    if (whiskeyEnabled && bottles.length > 0) {
      opts.push(MODULE_OPTIONS[1]); // whiskey
    }
    if ((pipes.length > 0 || blends.length > 0) && whiskeyEnabled && bottles.length > 0) {
      opts.push(MODULE_OPTIONS[2]); // combined
    }
    return opts;
  }, [pipes.length, blends.length, bottles.length, whiskeyEnabled]);

  const defaultScope = useMemo(() => {
    if (availableModuleOptions.length === 0) return "pipe_blend";
    // Default to combined if available, else first option
    const combined = availableModuleOptions.find(o => o.value === "pipe_blend_whiskey");
    return combined ? combined.value : availableModuleOptions[0].value;
  }, [availableModuleOptions]);

  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("balanced");
  const [moduleScope, setModuleScope] = useState(defaultScope);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);

  // Sync moduleScope if default changes (e.g. data loads after mount)
  useEffect(() => {
    setModuleScope(defaultScope);
  }, [defaultScope]);

  const hasData = pipes.length > 0 || blends.length > 0 || bottles.length > 0;

  const fallbackRecommendation = useMemo(
    () => buildFallback({ pipes, blends, bottles, mode, moduleScope }),
    [pipes, blends, bottles, mode, moduleScope]
  );

  async function generateRecommendation(forceRefresh = false) {
    if (!hasData) return;

    if (!forceRefresh) {
      const cached = getCached(mode, moduleScope);
      if (cached) {
        setRecommendation(cached);
        return;
      }
    }

    setLoading(true);

    // Filter data based on moduleScope
    const includePipes = moduleScope !== "whiskey" ? pipes : [];
    const includeBlends = moduleScope !== "whiskey" ? blends : [];
    const includeBottles = moduleScope !== "pipe_blend" ? bottles : [];

    try {
      const enabledModules = getAIEligibleModuleIds(moduleStates);
      const result = await base44.functions.invoke("generateSessionRecommendation", {
        pipes: includePipes,
        blends: includeBlends,
        bottles: includeBottles,
        tasteProfile,
        userProfile: profile,
        mode,
        moduleScope,
        previousPairings: [],
        sessionHistory,
        enabledModules,
      });

      const serverData = result?.data;
      // Backend returns {recommendations: [...]} - map to {pipe, blend, whiskey} format
      const serverRec = mapServerRecommendation(serverData, mode, moduleScope);
      const usable = serverRec || fallbackRecommendation;

      setRecommendation(usable || null);
      if (usable) setCached(mode, moduleScope, usable);

      if (usable) {
        setSessionHistory((prev) =>
          [
            {
              pipe_id: usable.pipe_id,
              blend_id: usable.blend_id,
              whiskey_id: usable.whiskey_id,
              mode,
              timestamp: Date.now(),
            },
            ...prev,
          ].slice(0, 5)
        );
      }
    } catch (error) {
      console.error("[TonightSessionCard] recommendation error:", error);
      setRecommendation(fallbackRecommendation || null);
      if (fallbackRecommendation) setCached(mode, moduleScope, fallbackRecommendation);
    } finally {
      setLoading(false);
    }
  }

  async function recordSession() {
    if (!recommendation?.pipe_id || !recommendation?.blend_id) {
      toast.error(t("session.invalidData", "Need both a pipe and blend to record the session."));
      return;
    }

    setSavingSession(true);

    try {
      await base44.entities.SmokingLog.create({
        pipe_id: recommendation.pipe_id,
        pipe_name: recommendation.pipe,
        blend_id: recommendation.blend_id,
        blend_name: recommendation.blend,
        bowls_used: 1,
        date: new Date().toISOString().split("T")[0],
        is_break_in: false,
        notes: `Recommended session (${mode} mode)`,
      });

      toast.success(t("session.recorded", "Session recorded!"));
    } catch (error) {
      console.error("[TonightSessionCard] record failed:", error);
      toast.error(t("session.recordFailed", "Failed to record session"));
    } finally {
      setSavingSession(false);
    }
  }

  // Re-generate when mode or scope changes
  useEffect(() => {
    if (!hasData) return;
    setRecommendation(null);
    generateRecommendation(false);
  }, [hasData, mode, moduleScope, pipes.length, blends.length, bottles.length]);

  if (!hasData) return null;

  const current = recommendation || fallbackRecommendation;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(155deg, rgba(28, 19, 12, 0.97), rgba(40, 26, 16, 0.96))",
        border: "1px solid rgba(180, 140, 75, 0.35)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12)",
      }}
    >
      {/* Top accent line */}
      <div
        className="h-[2px] w-full"
        style={{
          background: "linear-gradient(90deg, rgba(180,140,75,0) 0%, rgba(180,140,75,0.7) 50%, rgba(180,140,75,0) 100%)",
        }}
      />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(180,140,75,0.22), rgba(140,105,50,0.32))",
              border: "1px solid rgba(180,140,75,0.38)",
            }}
          >
            <Moon className="w-5 h-5" style={{ color: "rgba(180,140,75,1)" }} />
          </div>
          <div className="min-w-0">
            <h3
              className="text-base font-bold"
              style={{ color: "#F5F1E7", fontFamily: "Georgia, serif" }}
            >
              {t("session.tonightTitle", "Tonight's Session")}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(224,216,200,0.5)" }}>
              {tasteProfile?.confidence > 0.2
                ? t("session.adaptedFrom", "Adapted from your ratings & sessions")
                : t("session.personalized", "Personalized from your collection")}
            </p>
          </div>
        </div>

        <button
          onClick={() => generateRecommendation(true)}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40 flex-shrink-0"
          title={t("common.refresh", "Refresh")}
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            style={{ color: "rgba(180,140,75,0.7)" }}
          />
        </button>
      </div>

      {/* Mode selector */}
      <div className="px-5 pb-3 space-y-2">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(180,140,75,0.55)" }}>
          {t("session.recommendationMode", "Recommendation Mode")}
        </p>
        <div className="flex flex-wrap gap-2">
          {SESSION_MODES.map((sm) => (
            <ModeChip
              key={sm.value}
              value={sm.value}
              label={t(`session.modes.${sm.value}`, sm.label)}
              selected={mode === sm.value}
              onClick={(v) => setMode(v)}
            />
          ))}
        </div>
      </div>

      {/* Module scope selector — only show if multiple options available */}
      {availableModuleOptions.length > 1 && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(180,140,75,0.55)" }}>
            {t("session.includeModules", "Include In Recommendation")}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableModuleOptions.map((opt) => {
              const selected = moduleScope === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setModuleScope(opt.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: selected ? "rgba(163,92,92,0.22)" : "rgba(255,255,255,0.04)",
                    border: selected ? "1px solid rgba(163,92,92,0.55)" : "1px solid rgba(120,90,65,0.25)",
                    color: selected ? "rgba(240,200,185,1)" : "rgba(224,216,200,0.55)",
                  }}
                >
                  {opt.isPipeIcon ? (
                    <img
                      src={MODULE_ICONS.pipeicon}
                      alt="pipe"
                      className="w-3 h-3 object-contain"
                      style={{ backgroundColor: "transparent" }}
                    />
                  ) : opt.icon ? (
                    <opt.icon className="w-3 h-3" />
                  ) : null}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div
        className="mx-5 mb-4 h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(180,140,75,0.18), transparent)" }}
      />

      {/* Recommendation content */}
      <div className="px-5 pb-5">
        {loading && !current ? (
          <div className="flex items-center gap-3 py-5">
            <Sparkles className="w-5 h-5 animate-pulse" style={{ color: "rgba(180,140,75,0.6)" }} />
            <span className="text-sm" style={{ color: "rgba(224,216,200,0.6)" }}>
              {t("session.crafting", "Crafting your perfect session…")}
            </span>
          </div>
        ) : current ? (
          <div className="space-y-4">
            {current.flavor_theme ? (
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide"
                style={{
                  background: "rgba(180,140,75,0.14)",
                  border: "1px solid rgba(180,140,75,0.28)",
                  color: "rgba(212,180,100,1)",
                }}
              >
                <Sparkles className="w-3 h-3" />
                {current.flavor_theme}
              </div>
            ) : null}

            {/* Recommendation slots */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {current.pipe ? (
                <RecommendationSlot label={t("common.pipe", "Pipe")} value={current.pipe} accent="#D4A574" />
              ) : null}
              {current.blend ? (
                <RecommendationSlot label={t("common.tobacco", "Tobacco")} value={current.blend} accent="#7AAA68" />
              ) : null}
              {current.whiskey ? (
                <RecommendationSlot label={t("common.whiskey", "Whiskey")} value={current.whiskey} accent="#74A5D4" />
              ) : null}
            </div>

            {current.rationale ? (
              <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.72)" }}>
                {current.rationale}
              </p>
            ) : null}

            {current.learning_context ? (
              <div className="flex items-start gap-2">
                <Brain className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(180,140,75,0.45)" }} />
                <span className="text-xs" style={{ color: "rgba(180,140,75,0.45)" }}>
                  {current.learning_context}
                </span>
              </div>
            ) : null}

            {/* Action row */}
            <div className="flex gap-2 pt-1 flex-wrap">
              <Button
                onClick={recordSession}
                disabled={savingSession || !current?.pipe_id || !current?.blend_id}
                size="sm"
                variant="outline"
                className="flex-1 min-w-0"
              >
                <Save className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                {t("session.recordSession", "Record Session")}
              </Button>

              <Button
                onClick={() =>
                  navigate(
                    "/Curator?prompt=" +
                      encodeURIComponent(
                        `Tell me more about tonight's session: ${current.pipe || ""}${current.blend ? ` with ${current.blend}` : ""}${current.whiskey ? ` and ${current.whiskey}` : ""}`
                      )
                  )
                }
                size="sm"
                className="flex-1 min-w-0"
                style={{
                  background: "linear-gradient(135deg, rgba(139,58,58,0.9), rgba(109,46,46,1))",
                  border: "none",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                {t("nav.curator", "Curator")}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm py-2" style={{ color: "rgba(224,216,200,0.6)" }}>
            {t("session.noRecommendation", "Add more collection data to generate a recommendation.")}
          </p>
        )}
      </div>
    </div>
  );
}