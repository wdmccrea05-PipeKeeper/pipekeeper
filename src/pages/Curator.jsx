import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import CuratorWorkspace from "@/components/curator/CuratorWorkspace";
import CuratorActionBar from "@/components/curator/CuratorActionBar";
import CuratorOptimizePanel from "@/components/curator/CuratorOptimizePanel";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { useEnabledModules } from "@/components/hooks/useEnabledModules";
import { buildEnabledCuratorScopes } from "@/components/curator/curatorActionVisibility";
import { Sparkles, Cigarette } from "lucide-react";
import WhiskeyKeeperIcon from "@/components/icons/WhiskeyKeeperIcon";

import PipeIcon from "@/components/icons/PipeIcon";

const CURATOR_ICON =
  "https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png";

function readStoredCuratorContext() {
  try {
    const stored = sessionStorage.getItem("pk_curator_context");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    console.warn("Failed to parse curator context:", e);
    return null;
  }
}

function getUrlPrompt() {
  try {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("prompt") || "").trim();
  } catch {
    return "";
  }
}

function resolveLaunchContext() {
   const stored = readStoredCuratorContext();
   const urlPrompt = getUrlPrompt();

   if (!stored && !urlPrompt) {
     return {
       source: "none",
       initialPrompt: "",
       recommendationContext: null,
     };
   }

   const ctx = stored || {};

   // CRITICAL FIX:
   // Prefer the clicked recommendation text over the generic mapped prompt.
   const initialPrompt =
     String(ctx.originalPrompt || "").trim() ||
     String(ctx.originalInsight || "").trim() ||
     String(ctx.whatif_prompt || "").trim() ||
     String(ctx.prompt || "").trim() ||
     urlPrompt ||
     "";

   // Pre-seed context in sessionStorage for instant UI rendering
   if (initialPrompt) {
     try {
       sessionStorage.setItem("pk_curator_seeded_prompt", initialPrompt);
     } catch {}
   }

   return {
     source:
       (ctx.originalPrompt && "stored.originalPrompt") ||
       (ctx.originalInsight && "stored.originalInsight") ||
       (ctx.whatif_prompt && "stored.whatif_prompt") ||
       (ctx.prompt && "stored.prompt") ||
       (urlPrompt && "url.prompt") ||
       "none",
     initialPrompt,
     recommendationContext: ctx || null,
   };
}

function clearRouteState() {
  try {
    sessionStorage.removeItem("pk_curator_context");
  } catch {}

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("prompt");
    url.searchParams.delete("tab");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

const SCOPE_OPTION_DEFS = [
  { value: "all", icon: Sparkles, isPipeIcon: false, labelKey: "hub.allModules", labelFallback: "All Modules" },
  { value: "pipekeeper", isPipeIcon: true, labelKey: "hub.pipekeeper", labelFallback: "PipeKeeper" },
  { value: "whiskeykeeper", icon: WhiskeyKeeperIcon, isPipeIcon: false, labelKey: "hub.whiskeykeeper", labelFallback: "WhiskeyKeeper" },
  { value: "cigarkeeper", icon: Cigarette, isPipeIcon: false, labelKey: "hub.cigarkeeper", labelFallback: "CigarKeeper" },
];

export default function Curator() {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { isModuleEnabled } = useEnabledKeeperModules();
  const { enabled } = useEnabledModules();
  const location = useLocation();
  const chatRef = useRef(null);

  const [launchContext, setLaunchContext] = useState(() => {
    // Hydrate from React Router location.state.seedPrompt (e.g. from BottleDetail)
    const stateSeed = location?.state?.seedPrompt;
    const stateScope = location?.state?.scope;
    if (stateSeed) {
      return {
        source: "location.state.seedPrompt",
        initialPrompt: stateSeed,
        recommendationContext: location.state || null,
      };
    }
    return resolveLaunchContext();
  });

  // Optimize panel is the primary results surface — always shown by default.
  // Users can dismiss it to access the chat workspace below.
  const [isOptimizeMode, setIsOptimizeMode] = useState(true);

  const [curatorScope, setCuratorScope] = useState(
    location?.state?.scope || "all"
  );

  // Once enabled modules are known, correct the default scope if needed
  useEffect(() => {
    if (!location?.state?.scope) {
      const activeModules = [
        enabled.pipekeeper && "pipekeeper",
        enabled.whiskeykeeper && "whiskeykeeper",
        enabled.cigarkeeper && "cigarkeeper",
      ].filter(Boolean);
      if (activeModules.length === 1) {
        setCuratorScope(activeModules[0]);
      }
    }

  }, [enabled.pipekeeper, enabled.whiskeykeeper, enabled.cigarkeeper]);

  const handleScopeChange = (newScope) => {
    setCuratorScope(newScope);
  };

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

  const { data: bottles = [] } = useQuery({
    queryKey: ["bottles", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && isModuleEnabled('whiskeykeeper'),
    staleTime: 10000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 50);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ["tasting-logs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 50);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && isModuleEnabled('whiskeykeeper'),
    staleTime: 10000,
  });

  const { data: cigars = [] } = useQuery({
    queryKey: ["cigars", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Cigar.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && isModuleEnabled('cigarkeeper'),
    staleTime: 10000,
  });

  const { data: cigarSessions = [] } = useQuery({
    queryKey: ["cigar-sessions-curator", user?.email],
    queryFn: async () => {
      const result = await base44.entities.CigarSession.filter({ created_by: user?.email }, '-date', 50);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && isModuleEnabled('cigarkeeper'),
    staleTime: 10000,
  });

  const { data: wantListItems = [] } = useQuery({
    queryKey: ["want-list-curator", user?.email],
    queryFn: async () => {
      const result = await base44.entities.AcquisitionItem.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: userProfile = null } = useQuery({
    queryKey: ["user-profile-curator", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.UserProfile.filter({ user_email: user.email });
      return results?.[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // Filter data based on selected scope
  const scopedPipes = (curatorScope === "whiskeykeeper" || curatorScope === "cigarkeeper") ? [] : (pipes || []);
  const scopedBlends = (curatorScope === "whiskeykeeper" || curatorScope === "cigarkeeper") ? [] : blends;
  const scopedBottles = (curatorScope === "pipekeeper" || curatorScope === "cigarkeeper") ? [] : bottles;
  const scopedTastingLogs = (curatorScope === "pipekeeper" || curatorScope === "cigarkeeper") ? [] : tastingLogs;
  const scopedSmokingLogs = (curatorScope === "whiskeykeeper" || curatorScope === "cigarkeeper") ? [] : smokingLogs;
  const scopedCigars = (curatorScope === "pipekeeper" || curatorScope === "whiskeykeeper") ? [] : cigars;
  const scopedCigarSessions = (curatorScope === "pipekeeper" || curatorScope === "whiskeykeeper") ? [] : cigarSessions;

  // Available scope options based on enabled modules
  // If only PipeKeeper is enabled, skip the "All Modules" option to keep UI clean
  const availableScopes = useMemo(() => {
    return buildEnabledCuratorScopes(enabled).map((s) => {
      const def = SCOPE_OPTION_DEFS.find((o) => o.value === s.key);
      if (def) {
        return { ...def, label: t(def.labelKey, def.labelFallback) };
      }
      return { value: s.key, label: s.label, isPipeIcon: false };
    });
  }, [enabled, t]);

  const handlePromptConsumed = () => {
    clearRouteState();
    setLaunchContext({
      source: "none",
      initialPrompt: "",
      recommendationContext: null,
    });
  };

  const handleExpertAction = useCallback((actionLaunchContext) => {
    // Clicking "Optimize Collection" from the action bar should open the grouped
    // recommendations panel, not pre-fill the chat with an AI query.
    if (
      actionLaunchContext?.actionType === 'optimize_collection' ||
      actionLaunchContext?.sourceAction?.id === 'optimize_collection'
    ) {
      setIsOptimizeMode(true);
      return;
    }
    setLaunchContext(actionLaunchContext);
  }, []);

  // Called from CuratorOptimizePanel when user clicks "Ask Curator" or "Review Details"
  // Pre-fills the chat prompt without auto-submitting — user must press send manually
  const handleOptimizeAskCurator = useCallback((promptText) => {
    setLaunchContext({
      source: "optimize_panel",
      initialPrompt: promptText,
      recommendationContext: null,
    });
    // Scroll to the chat workspace area
    if (chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  }, []);

  const subtitle = useMemo(() => {
    const ctx = launchContext?.recommendationContext;

    const routedTitle = ctx?.displayTitle || ctx?.originalTitle || "";
    if (routedTitle) {
      return `${routedTitle} — ${t("curator.workspaceSubtitleRouted", {
        defaultValue: "Opening Curator with your selected prompt…",
      })}`;
    }

    if (launchContext?.initialPrompt) {
      return t("curator.workspaceSubtitleRouted", {
        defaultValue: "Opening Curator with your selected prompt…",
      });
    }

    return t("curator.workspaceSubtitle", {
      defaultValue: "Ask questions, follow up on recommendations, and get collection-specific guidance.",
    });
  }, [launchContext, t]);

  return (
    <div className="space-y-5">
      {/* Optimize Panel — primary grouped recommendations surface (default view) */}
      {isOptimizeMode && (
        <CuratorOptimizePanel
          pipes={scopedPipes}
          blends={scopedBlends}
          cigars={scopedCigars}
          bottles={scopedBottles}
          smokeLogs={scopedSmokingLogs}
          tastingLogs={scopedTastingLogs}
          cigarSessions={scopedCigarSessions}
          wantListItems={wantListItems}
          onClose={() => setIsOptimizeMode(false)}
          onAskCurator={handleOptimizeAskCurator}
        />
      )}

      {/* Hero Section — shown collapsed when optimize panel is active */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(35,24,15,0.97), rgba(22,15,10,0.98))',
          border: '1px solid rgba(140,105,65,0.25)',
        }}
      >
        {/* Top bar: icon + title + scope chips */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={CURATOR_ICON}
                alt={t("curator.workspaceTitle", { defaultValue: "Curator" })}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold leading-tight"
                style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
              >
                {t("curator.workspaceTitle", { defaultValue: "Curator" })}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {t("curator.heroTagline", { defaultValue: "Your personal collection intelligence" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Back to Optimize button — only shown when optimize panel is closed */}
            {!isOptimizeMode && (
              <button
                type="button"
                onClick={() => setIsOptimizeMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: "rgba(180,140,75,0.15)",
                  border: "1px solid rgba(180,140,75,0.35)",
                  color: "rgba(212,165,116,0.9)",
                }}
              >
                <Sparkles className="w-3 h-3" />
                View Recommendations
              </button>
            )}

            {/* Scope selector chips — inline with header */}
            {availableScopes.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableScopes.map((opt) => {
                  const selected = curatorScope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleScopeChange(opt.value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: selected ? "rgba(163,92,92,0.25)" : "rgba(255,255,255,0.05)",
                        border: selected ? "1px solid rgba(163,92,92,0.55)" : "1px solid rgba(120,90,65,0.2)",
                        color: selected ? "#F5F1E7" : "rgba(224,216,200,0.5)",
                      }}
                    >
                      {opt.isPipeIcon ? (
                        <PipeIcon className="w-3 h-3" color={selected ? "#F5F1E7" : "rgba(224,216,200,0.5)"} />
                      ) : opt.icon ? (
                        <opt.icon className="w-3 h-3" />
                      ) : null}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Subtitle / prompt state */}
        {subtitle !== t("curator.workspaceSubtitle", { defaultValue: "Ask questions, follow up on recommendations, and get collection-specific guidance." }) && (
          <div
            className="mx-5 mb-4 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(163,92,92,0.12)', border: '1px solid rgba(163,92,92,0.25)', color: 'rgba(240,200,185,0.85)' }}
          >
            {subtitle}
          </div>
        )}

        {/* Expert action area — grouped layout */}
        <div className="px-4 pb-5">
          <CuratorActionBar
            pipes={scopedPipes}
            blends={scopedBlends}
            bottles={scopedBottles}
            tastingLogs={scopedTastingLogs}
            smokingLogs={scopedSmokingLogs}
            cigars={scopedCigars}
            cigarSessions={scopedCigarSessions}
            userProfile={userProfile}
            curatorScope={curatorScope}
            enabledModules={enabled}
            onActionSelect={handleExpertAction}
          />
        </div>
      </div>

      {/* Main Workspace — chat interface */}
      <div ref={chatRef}>
      <Card>
        <CardContent className="p-0 sm:p-2">
          <div key={`curator-workspace-${curatorScope}`}>
            <CuratorWorkspace
              pipes={scopedPipes}
              blends={scopedBlends}
              bottles={scopedBottles}
              smokingLogs={scopedSmokingLogs}
              tastingLogs={scopedTastingLogs}
              cigars={scopedCigars}
              cigarSessions={scopedCigarSessions}
              userProfile={userProfile}
              launchContext={launchContext}
              preFilledPrompt={launchContext?.initialPrompt || ""}
              routedContext={launchContext?.recommendationContext || null}
              onPromptConsumed={handlePromptConsumed}
              curatorScope={curatorScope}
            />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}