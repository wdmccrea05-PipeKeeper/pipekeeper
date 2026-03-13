import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import CuratorWorkspace from "@/components/curator/CuratorWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n/safeTranslation";

const CURATOR_ICON =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png";

function getRoutedPrompt() {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("prompt") || "").trim();
  } catch {
    return "";
  }
}

function clearRouteState() {
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
  const [routedPrompt, setRoutedPrompt] = useState(getRoutedPrompt());

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

  useEffect(() => {
    const prompt = getRoutedPrompt();
    if (prompt) setRoutedPrompt(prompt);
  }, []);

  const handlePromptConsumed = () => {
    clearRouteState();
    setRoutedPrompt("");
  };

  const subtitle = useMemo(() => {
    return routedPrompt
      ? t("curator.workspaceSubtitleRouted", { defaultValue: "Opening Curator with your selected prompt…" })
      : t("curator.workspaceSubtitle", { defaultValue: "Ask questions, follow up on recommendations, and get collection-specific guidance." });
  }, [routedPrompt, t]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="border-b border-[#1a2c42]/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <img src={CURATOR_ICON} alt={t("curator.workspaceTitle", { defaultValue: "Curator" })} className="w-full h-full object-cover" />
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
            preFilledPrompt={routedPrompt}
            onPromptConsumed={handlePromptConsumed}
          />
        </CardContent>
      </Card>
    </div>
  );
}
