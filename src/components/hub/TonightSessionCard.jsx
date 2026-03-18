import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Moon, RefreshCw, ChevronRight, Brain, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { getAIEligibleModuleIds } from "@/components/utils/moduleAccess";

const SESSION_MODES = [
  { value: "balanced", label: "session.modes.balanced" },
  { value: "rotation", label: "session.modes.rotation" },
  { value: "favorites", label: "session.modes.favorites" },
  { value: "exploration", label: "session.modes.exploration" },
  { value: "relaxed", label: "session.modes.relaxed" },
];

const CACHE_KEY = "ck_tonight_session_v2";
const CACHE_TTL = 4 * 60 * 60 * 1000;

function getCached(mode) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data, cachedMode } = JSON.parse(raw);
    if (cachedMode !== mode) return null;
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCached(mode, data) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), cachedMode: mode, data })
    );
  } catch {
    // ignore cache failures
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

function buildFallbackRecommendation({ pipes, blends, bottles, mode, t }) {
  const favoritePipe = pickBest(pipes, ["rating", "manual_rating", "times_smoked"]);
  const favoriteBlend = pickBest(blends, ["rating", "manual_rating", "times_smoked"]);
  const favoriteBottle = pickBest(bottles, ["rating", "average_rating", "times_tasted"]);

  if (!favoritePipe && !favoriteBlend && !favoriteBottle) return null;

  const pipeName = favoritePipe?.name || favoritePipe?.pipe_name || null;
  const blendName = favoriteBlend?.name || favoriteBlend?.blend_name || null;
  const bottleName = favoriteBottle?.name || favoriteBottle?.bottle_name || null;

  const rationaleParts = [];
  if (pipeName) rationaleParts.push(pipeName);
  if (blendName) rationaleParts.push(blendName);
  if (bottleName) rationaleParts.push(bottleName);

  return {
    pipe_id: favoritePipe?.id || null,
    pipe: pipeName,
    blend_id: favoriteBlend?.id || null,
    blend: blendName,
    whiskey_id: favoriteBottle?.id || null,
    whiskey: bottleName,
    flavor_theme:
      mode === "favorites"
        ? t("session.favoriteTheme", "Comforting favorite")
        : mode === "exploration"
          ? t("session.explorationTheme", "Something worth revisiting")
          : t("session.balancedTheme", "Balanced evening pairing"),
    rationale:
      rationaleParts.length > 0
        ? t(
            "session.fallbackRationale",
            "Based on your current collection, this is your strongest ready-to-enjoy combination tonight."
          )
        : null,
    learning_context: t(
      "session.localFallback",
      "Using an on-device fallback recommendation from your collection."
    ),
    mode_bias: mode,
  };
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
  const { moduleStates } = useEnabledKeeperModules();

  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("balanced");
  const [savingSession, setSavingSession] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);

  const hasData = pipes.length > 0 || blends.length > 0 || bottles.length > 0;

  const fallbackRecommendation = useMemo(
    () => buildFallbackRecommendation({ pipes, blends, bottles, mode, t }),
    [pipes, blends, bottles, mode, t]
  );

  async function generateRecommendation(forceRefresh = false) {
    if (!hasData) return;

    if (!forceRefresh) {
      const cached = getCached(mode);
      if (cached) {
        setRecommendation(cached);
        return;
      }
    }

    setLoading(true);

    try {
      const enabledModules = getAIEligibleModuleIds(moduleStates);
      const result = await base44.functions.invoke("generateSessionRecommendation", {
        pipes,
        blends,
        bottles,
        tasteProfile,
        userProfile: profile,
        mode,
        previousPairings: [],
        sessionHistory,
        enabledModules,
      });

      const serverRecommendation = result?.data;
      const usable =
        serverRecommendation &&
        (serverRecommendation.pipe || serverRecommendation.blend || serverRecommendation.whiskey)
          ? serverRecommendation
          : fallbackRecommendation;

      setRecommendation(usable || null);
      if (usable) setCached(mode, usable);

      if (serverRecommendation) {
        setSessionHistory((prev) =>
          [
            {
              pipe_id: serverRecommendation.pipe_id,
              blend_id: serverRecommendation.blend_id,
              whiskey_id: serverRecommendation.whiskey_id,
              mode: serverRecommendation.mode || mode,
              timestamp: Date.now(),
            },
            ...prev,
          ].slice(0, 5)
        );
      }
    } catch (error) {
      console.error("[TonightSessionCard] recommendation error:", error);
      setRecommendation(fallbackRecommendation || null);
      if (fallbackRecommendation) setCached(mode, fallbackRecommendation);
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
        notes:
          t("session.recordedNote", "Recommended session") +
          ` (${mode} ${t("session.mode", "mode")})`,
      });

      toast.success(t("session.recorded", "Session recorded!"));
    } catch (error) {
      console.error("[TonightSessionCard] record failed:", error);
      toast.error(t("session.recordFailed", "Failed to record session"));
    } finally {
      setSavingSession(false);
    }
  }

  useEffect(() => {
    if (!hasData) return;
    generateRecommendation(false);
  }, [hasData, mode, pipes.length, blends.length, bottles.length]);

  if (!hasData) return null;

  const current = recommendation || fallbackRecommendation;

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{
        background: "linear-gradient(135deg, rgba(30, 20, 12, 0.95), rgba(42, 28, 16, 0.9))",
        border: "1px solid rgba(180, 140, 75, 0.35)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(180,140,75,0.25), rgba(140,105,50,0.35))",
              border: "1px solid rgba(180,140,75,0.4)",
            }}
          >
            <Moon className="w-5 h-5" style={{ color: "rgba(180,140,75,1)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-base font-bold"
              style={{ color: "#F5F1E7", fontFamily: "Georgia, serif" }}
            >
              {t("session.tonightTitle", "Tonight's Session")}
            </h3>
            <p className="text-xs" style={{ color: "rgba(224,216,200,0.55)" }}>
              {tasteProfile?.confidence > 0.2
                ? t("session.adaptedFrom", "Adapted from your ratings, sessions, and favorites")
                : t("session.personalized", "Personalized recommendation from your collection")}
            </p>
          </div>
        </div>

        <button
          onClick={() => generateRecommendation(true)}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40 flex-shrink-0 ml-2"
          title={t("common.refresh", "Refresh")}
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            style={{ color: "rgba(180,140,75,0.7)" }}
          />
        </button>
      </div>

      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-widest"
          style={{ color: "rgba(180,140,75,0.6)" }}
        >
          {t("session.recommendationMode", "Recommendation Mode")}
        </label>

        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger
            className="w-full"
            style={{
              background: "rgba(20, 14, 10, 0.55)",
              border: "1px solid rgba(120,90,65,0.35)",
              color: "#F5F1E7",
            }}
          >
            <SelectValue>
              {t(
                SESSION_MODES.find((m) => m.value === mode)?.label || "session.modes.balanced",
                "Balanced"
              )}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {SESSION_MODES.map((sessionMode) => (
              <SelectItem key={sessionMode.value} value={sessionMode.value}>
                {t(sessionMode.label, sessionMode.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && !current ? (
        <div className="flex items-center gap-3 py-4">
          <Sparkles className="w-5 h-5 animate-pulse" style={{ color: "rgba(180,140,75,0.6)" }} />
          <span className="text-sm" style={{ color: "rgba(224,216,200,0.6)" }}>
            {t("session.crafting", "Crafting your perfect session…")}
          </span>
        </div>
      ) : current ? (
        <div className="space-y-4">
          {current.flavor_theme ? (
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{
                background: "rgba(180,140,75,0.15)",
                border: "1px solid rgba(180,140,75,0.3)",
                color: "rgba(180,140,75,1)",
              }}
            >
              {current.flavor_theme}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {current.pipe ? (
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(60,40,25,0.5)", border: "1px solid rgba(120,90,65,0.3)" }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(180,140,75,0.6)" }}>
                  {t("common.pipe", "Pipe")}
                </p>
                <p className="text-sm font-medium leading-snug" style={{ color: "#E0D8C8" }}>
                  {current.pipe}
                </p>
              </div>
            ) : null}

            {current.blend ? (
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(60,40,25,0.5)", border: "1px solid rgba(120,90,65,0.3)" }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(180,140,75,0.6)" }}>
                  {t("common.tobacco", "Tobacco")}
                </p>
                <p className="text-sm font-medium leading-snug" style={{ color: "#E0D8C8" }}>
                  {current.blend}
                </p>
              </div>
            ) : null}

            {current.whiskey ? (
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(60,40,25,0.5)", border: "1px solid rgba(120,90,65,0.3)" }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(180,140,75,0.6)" }}>
                  {t("common.whiskey", "Whiskey")}
                </p>
                <p className="text-sm font-medium leading-snug" style={{ color: "#E0D8C8" }}>
                  {current.whiskey}
                </p>
              </div>
            ) : null}
          </div>

          {current.rationale ? (
            <p className="text-sm leading-relaxed" style={{ color: "rgba(224,216,200,0.7)" }}>
              {current.rationale}
            </p>
          ) : null}

          <div className="space-y-1">
            {current.learning_context ? (
              <div className="flex items-center gap-1.5">
                <Brain className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(180,140,75,0.5)" }} />
                <span className="text-xs" style={{ color: "rgba(180,140,75,0.5)" }}>
                  {current.learning_context}
                </span>
              </div>
            ) : null}

            {current.mode_bias ? (
              <div className="text-xs" style={{ color: "rgba(180,140,75,0.4)" }}>
                {t("session.modeBias", "Mode bias")}: {current.mode_bias}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={recordSession}
              disabled={savingSession || !current?.pipe_id || !current?.blend_id}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {t("session.recordSession", "Record Session")}
            </Button>

            <Button
              onClick={() =>
                navigate(
                  "/Curator?prompt=" +
                    encodeURIComponent(
                      t(
                        "session.curatorPrompt",
                        `Tell me more about tonight's session: ${current.pipe || ""} with ${current.blend || ""}${current.whiskey ? ` and ${current.whiskey}` : ""}`
                      )
                    )
                )
              }
              className="flex-1 sm:flex-none"
              style={{
                background: "linear-gradient(135deg, rgba(139,58,58,0.9), rgba(109,46,46,1))",
                border: "none",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
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
  );
}