import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import CuratorWorkspace from "@/components/curator/CuratorWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n/safeTranslation";

const CURATOR_ICON =
  "https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png";

function getUrlPrompt() {
  try {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("prompt") || "").trim();
  } catch {
    return "";
  }
}

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

  // This is the key fix:
  // prefer recommendation-specific routed content over generic fallback prompt strings.
  const initialPrompt =
    String(ctx.whatif_prompt || "").trim() ||
    String(ctx.originalPrompt || "").trim() ||
    String(ctx.originalInsight || "").trim() ||
    String(ctx.prompt || "").trim() ||
    urlPrompt ||
    "";

  return {
    source:
      (ctx.whatif_prompt && "stored.whatif_prompt") ||
      (ctx.originalPrompt && "stored.originalPrompt") ||
      (ctx.originalInsight && "stored.originalInsight") ||
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

export default function Curator() {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const [launchContext, setLaunchContext] = useState(() => resolveLaunchContext());

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

  const handlePromptConsumed = () => {
    clearRouteState();
    setLaunchContext({
      source: "none",
      initialPrompt: "",
      recommendationContext: null,
    });
  };

  const subtitle = useMemo(() => {
    const ctx = launchContext?.recommendationContext;

    if (ctx?.originalTitle) {
      return `${ctx.originalTitle} — ${t("curator.workspaceSubtitleRouted", {
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
        <CardHeader className="border-b border-[#1a2c42]/20">
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

        <CardContent className="pt-6">
          <CuratorWorkspace
            pipes={pipes}
            blends={blends}
            launchContext={launchContext}
            preFilledPrompt={launchContext?.initialPrompt || ""}
            routedContext={launchContext?.recommendationContext || null}
            onPromptConsumed={handlePromptConsumed}
          />
        </CardContent>
      </Card>
    </div>
  );
}