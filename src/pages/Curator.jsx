import React, { useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import CuratorWorkspace from "@/components/curator/CuratorWorkspace";
import CuratorActionBar from "@/components/curator/CuratorActionBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { Sparkles } from "lucide-react";
import WhiskeyKeeperIcon from "@/components/icons/WhiskeyKeeperIcon";

import { MODULE_ICONS } from "@/components/branding/moduleAssets";
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

const SCOPE_OPTIONS = [
  { value: "all", label: "All Modules", icon: Sparkles, isPipeIcon: false },
  { value: "pipekeeper", label: "PipeKeeper", isPipeIcon: true },
  { value: "whiskeykeeper", label: "WhiskeyKeeper", icon: WhiskeyKeeperIcon, isPipeIcon: false },
];

function ScopeChip({ value, label, selected, onClick, isPipeIcon, icon: IconComponent }) {
   return (
     <button
       type="button"
       onClick={() => onClick(value)}
       className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
       style={{
         background: selected ? "rgba(163,92,92,0.2)" : "rgba(255,255,255,0.04)",
         border: selected ? "1px solid rgba(163,92,92,0.55)" : "1px solid rgba(120,90,65,0.25)",
         color: selected ? "rgba(240,200,185,1)" : "rgba(224,216,200,0.55)",
       }}
     >
       {isPipeIcon ? (
         <PipeIcon className="w-3 h-3" color={selected ? "rgba(240,200,185,1)" : "rgba(224,216,200,0.55)"} />
       ) : IconComponent ? (
         <IconComponent className="w-3 h-3" />
       ) : null}
       {label}
     </button>
   );
 }

export default function Curator() {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { isModuleEnabled } = useEnabledKeeperModules();
  const location = useLocation();
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
  const [curatorScope, setCuratorScope] = useState(() => {
    // Default to pipekeeper if only one module enabled, otherwise "all"
    const hasMultipleModules = isModuleEnabled("whiskeykeeper");
    return location?.state?.scope || (hasMultipleModules ? "all" : "pipekeeper");
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

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ["tasting-logs", user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 50);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && isModuleEnabled('whiskeykeeper'),
    staleTime: 10000,
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
  const scopedPipes = curatorScope === "whiskeykeeper" ? [] : pipes;
  const scopedBlends = curatorScope === "whiskeykeeper" ? [] : blends;
  const scopedBottles = curatorScope === "pipekeeper" ? [] : bottles;
  const scopedTastingLogs = curatorScope === "pipekeeper" ? [] : tastingLogs;

  // Available scope options based on enabled modules
  // If only PipeKeeper is enabled, skip the "All Modules" option to keep UI clean
  const availableScopes = useMemo(() => {
    const whiskeyScopeAvailable = isModuleEnabled("whiskeykeeper");
    if (!whiskeyScopeAvailable) {
      // Only PipeKeeper enabled - show just PipeKeeper option, default scope to pipekeeper
      setCuratorScope("pipekeeper");
      return [SCOPE_OPTIONS[1]];
    }
    // Multiple modules: show All, PipeKeeper, and WhiskeyKeeper
    const opts = [SCOPE_OPTIONS[0], SCOPE_OPTIONS[1], SCOPE_OPTIONS[2]];
    return opts;
  }, [isModuleEnabled]);

  const handlePromptConsumed = () => {
    clearRouteState();
    setLaunchContext({
      source: "none",
      initialPrompt: "",
      recommendationContext: null,
    });
  };

  const handleExpertAction = useCallback((actionLaunchContext) => {
    setLaunchContext(actionLaunchContext);
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
      <Card>
        <CardHeader className="border-b border-[#8b6239]/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={CURATOR_ICON}
                alt={t("curator.workspaceTitle", { defaultValue: "Curator" })}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-xl text-[#E0D8C8] leading-tight mb-1">
                {t("curator.workspaceTitle", { defaultValue: "Curator" })}
              </CardTitle>
              <p className="text-sm text-[#E0D8C8]/70">{subtitle}</p>
            </div>
          </div>
        </CardHeader>

        {availableScopes.length > 1 && (
          <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'rgba(139,98,57,0.2)' }}>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(180,140,75,0.6)' }}>
              {t("curator.adviceScope", "Advice Scope")}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableScopes.map((opt) => (
                <ScopeChip
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  selected={curatorScope === opt.value}
                  onClick={handleScopeChange}
                  isPipeIcon={opt.isPipeIcon}
                  icon={opt.icon}
                />
              ))}
            </div>
          </div>
        )}

        <CardContent className="p-0 sm:p-2" key={`curator-${curatorScope}`}>
          <div className="space-y-4 sm:space-y-5">
            {/* Expert Action Buttons */}
            <CuratorActionBar
              pipes={scopedPipes}
              blends={scopedBlends}
              bottles={scopedBottles}
              tastingLogs={scopedTastingLogs}
              userProfile={userProfile}
              onActionSelect={handleExpertAction}
            />

            {/* Main Workspace */}
            <CuratorWorkspace
              pipes={scopedPipes}
              blends={scopedBlends}
              bottles={scopedBottles}
              tastingLogs={scopedTastingLogs}
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
  );
}
                alt={t("curator.workspaceTitle", { defaultValue: "Curator" })}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-xl text-[#E0D8C8] leading-tight mb-1">
                {t("curator.workspaceTitle", { defaultValue: "Curator" })}
              </CardTitle>
              <p className="text-sm text-[#E0D8C8]/70">{subtitle}</p>
            </div>
          </div>
        </CardHeader>

        {availableScopes.length > 1 && (
          <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'rgba(139,98,57,0.2)' }}>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(180,140,75,0.6)' }}>
              {t("curator.adviceScope", "Advice Scope")}
            </p>
        <CardContent className="p-0 sm:p-2" key={`curator-${curatorScope}`}>
          <div className="space-y-4 sm:space-y-5">
            {/* Expert Action Buttons */}
            <CuratorActionBar
              pipes={scopedPipes}
              blends={scopedBlends}
              bottles={scopedBottles}
              tastingLogs={scopedTastingLogs}
              userProfile={userProfile}
              onActionSelect={handleExpertAction}
            />

            {/* Main Workspace */}
            <CuratorWorkspace
              pipes={scopedPipes}
              blends={scopedBlends}
              bottles={scopedBottles}
              tastingLogs={scopedTastingLogs}
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
  );
}