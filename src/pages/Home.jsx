import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { PKCard } from "@/components/ui/pk-surface";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { formatCurrency, formatWeight } from "@/components/utils/localeFormatters";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import AIUpdatesPanel from "@/components/ai/AIUpdatesPanel";

export default function Home() {
  console.log("🏠 Home component rendering");

  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles?.[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs', user?.email],
    queryFn: async () => {
      const logs = await base44.entities.CellarLog.filter({ created_by: user?.email });
      return Array.isArray(logs) ? logs : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const totalPipeValue = pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0);
  const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);
  const totalTobaccoValue = calculateTobaccoCollectionValue(blends, cellarLogs);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          {t("home.title", "Pipe & Tobacco Collection")}
        </h1>

        <p className="text-lg opacity-80 max-w-3xl mx-auto">
          {t(
            "home.subtitle",
            "Manage your pipes and tobacco blends with AI-powered search, photo identification, pairing suggestions, and market valuations."
          )}
        </p>
      </div>

      {/* PIPE COLLECTION CARD */}
      <PKCard className="p-6">
        <h2 className="text-2xl font-semibold">
          {t("home.pipeCollectionTitle", "Pipe Collection")}
        </h2>

        <p className="opacity-70">
          {t("home.pipeCollectionSubtitle", "Track and value your pipes")}
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <div className="text-3xl font-bold">{pipes.length}</div>
            <div className="opacity-70">
              {t("home.pipesInCollection", "Pipes in Collection")}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold">{formatCurrency(totalPipeValue)}</div>
            <div className="opacity-70">
              {t("home.collectionValue", "Collection Value")}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button asChild>
            <a href={createPageUrl("Pipes")}>{t("home.viewCollection", "View Collection")}</a>
          </Button>
        </div>
      </PKCard>

      {/* TOBACCO CELLAR CARD */}
      <PKCard className="p-6">
        <h2 className="text-2xl font-semibold">
          {t("home.tobaccoCellarTitle", "Tobacco Cellar")}
        </h2>

        <p className="opacity-70">
          {t("home.tobaccoCellarSubtitle", "Manage your blends")}
        </p>

        <div className="mt-6 space-y-3">
          <div>
            <div className="text-3xl font-bold">{blends.length}</div>
            <div className="opacity-70">
              {t("home.tobaccoBlends", "Tobacco Blends")}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold">{formatWeight(totalCellaredOz, 'oz')}</div>
            <div className="opacity-70">
              {t("home.cellared", "Cellared")}
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold">≈ {formatCurrency(totalTobaccoValue)}</div>
            <div className="opacity-70">
              {t("home.collectionValue", "Collection Value")}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button asChild>
            <a href={createPageUrl("Tobacco")}>{t("home.viewCellar", "View Cellar")}</a>
          </Button>
        </div>
      </PKCard>

      {/* AI UPDATES PANEL */}
      <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />

      {/* COLLECTION INSIGHTS PANEL (Log, Pairing Grid, Rotation, Stats, Trends, Aging, Reports) */}
      <CollectionInsightsPanel pipes={pipes} blends={blends} user={user} />
    </div>
  );
}