import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import CuratorWorkspace from "@/components/curator/CuratorWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { Wine, Sparkles } from "lucide-react";
import { MODULE_ICONS } from "@/components/branding/moduleAssets";

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

  const { data: bottles = [] } = useQuery({
    queryKey: ["bottles", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
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
    enabled: !!user?.email,
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

        <CardContent className="pt-6">
          <CuratorWorkspace
            pipes={pipes}
            blends={blends}
            bottles={bottles}
            tastingLogs={tastingLogs}
            userProfile={userProfile}
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