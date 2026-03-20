import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { useTasteProfile } from "@/components/curator/useTasteProfile";
import { buildAIEligibleCollection } from "@/components/utils/moduleAccess";
import { getCollectionHubSummary, getComingSoonModules } from "@/components/keeper-core";
import BrandLogo from "@/components/branding/BrandLogo";
import ModuleCard from "@/components/hub/ModuleCard";
import QuickLaunch from "@/components/hub/QuickLaunch";
import TonightSessionCard from "@/components/hub/TonightSessionCard";
import CollectionStoryCard from "@/components/hub/CollectionStoryCard";
import CuratorHub from "@/components/hub/CuratorHub";
import CollectionIntelligencePanel from "@/components/hub/CollectionIntelligencePanel";

import RecentActivity from "@/components/hub/RecentActivity";
import { useProfilePrivacy } from "@/components/hooks/useProfilePrivacy";

function sumBottleCollectionValue(bottles) {
  if (!Array.isArray(bottles)) return 0;
  return bottles.reduce((sum, b) => {
    // Priority chain: manual > ai > retail > purchase
    const v = Number(b?.collector_value) || Number(b?.aftermarket_price) || Number(b?.retail_price) || Number(b?.purchase_price) || 0;
    return sum + v;
  }, 0);
}

function sumTobaccoCollectionValue(blends) {
  if (!Array.isArray(blends)) return 0;
  return blends.reduce((sum, b) => {
    // Priority chain: manual > ai (per oz * total oz)
    const totalOz = (Number(b?.tin_total_quantity_oz) || 0) + (Number(b?.bulk_total_quantity_oz) || 0) + (Number(b?.pouch_total_quantity_oz) || 0);
    const perOz = Number(b?.manual_market_value) || Number(b?.ai_estimated_value) || 0;
    // manual_market_value and ai_estimated_value are total values, not per-oz
    return sum + perOz;
  }, 0);
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SummaryStat({ label, value, sub, color = "#D4A574" }) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: "linear-gradient(135deg, rgba(42, 30, 22, 0.6), rgba(32, 22, 15, 0.8))",
        border: "1px solid rgba(120, 90, 65, 0.25)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.08)",
      }}
    >
      <p
        className="text-xs uppercase tracking-wider"
        style={{ color: "rgba(180, 140, 75, 0.6)" }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      {sub ? (
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.55)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export default function CollectionHub() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { hideValues, hideCollectionCounts, hideHomeValues } = useProfilePrivacy();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    pipes: { count: 0, value: 0 },
    tobacco: { count: 0, value: 0 },
    whiskey: { count: 0, value: 0, bottleTypes: 0, totalBottles: 0 },
    total: { items: 0, value: 0 },
    enabledModuleCount: 0,
    hubContributorCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  const { enabledModules, isModuleEnabled, moduleStates } = useEnabledKeeperModules();

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const collectionSummary = await getCollectionHubSummary(user.email, moduleStates || null);
        if (!cancelled) setSummary(collectionSummary);
      } catch (error) {
        console.error("[CollectionHub] summary error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email, moduleStates]);

  const { data: pipes = [] } = useQuery({
    queryKey: ["hub-pipes", user?.email],
    queryFn: async () => (await base44.entities.Pipe.filter({ created_by: user?.email })) || [],
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["hub-blends", user?.email],
    queryFn: async () => (await base44.entities.TobaccoBlend.filter({ created_by: user?.email })) || [],
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: bottles = [] } = useQuery({
    queryKey: ["hub-bottles", user?.email],
    queryFn: async () => (await base44.entities.Bottle.filter({ created_by: user?.email })) || [],
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ["hub-smoking-logs", user?.email],
    queryFn: async () => (await base44.entities.SmokingLog.filter({ created_by: user?.email })) || [],
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: hubProfile = null } = useQuery({
    queryKey: ["hub-profile", user?.email],
    queryFn: async () => {
      const userId = user?.id || user?.auth_user_id;
      const email = user?.email;
      let records = [];
      if (userId) {
        try { records.push(...(await base44.entities.UserProfile.filter({ user_id: userId }))); } catch {}
      }
      if (email) {
        try { records.push(...(await base44.entities.UserProfile.filter({ user_email: email }))); } catch {}
      }
      if (!records.length) return null;
      const seen = new Set();
      const unique = records.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      return unique.sort((a, b) => (Date.parse(b?.updated_date || '') || 0) - (Date.parse(a?.updated_date || '') || 0))[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const { data: hubTastingLogs = [] } = useQuery({
    queryKey: ["hub-tasting-logs", user?.email],
    queryFn: async () =>
      (await base44.entities.TastingLog.filter({ created_by: user?.email }, "-tasting_date", 50)) || [],
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const tasteProfile = useTasteProfile({
    pipes,
    blends,
    bottles,
    smokingLogs,
    tastingLogs: hubTastingLogs,
    profile: hubProfile,
  });

  const aiCollection = useMemo(
    () => buildAIEligibleCollection(moduleStates, { pipes, blends, bottles }),
    [moduleStates, pipes, blends, bottles]
  );

  const comingSoonModules = getComingSoonModules();

  const blendCount = blends.length;
  const totalBlendOz = blends.reduce(
    (sum, b) =>
      sum +
      (Number(b?.tin_total_quantity_oz) || 0) +
      (Number(b?.bulk_total_quantity_oz) || 0) +
      (Number(b?.pouch_total_quantity_oz) || 0),
    0
  );
  const totalBlendValue = blends.reduce(
    (sum, b) => sum + (Number(b?.manual_market_value) || Number(b?.ai_estimated_value) || 0),
    0
  );

  // FIXED: use canonical value resolver — same priority as WhiskeyKeeper/WhiskeyInsights
  const totalBottleValue = useMemo(() => sumBottleCollectionValue(bottles), [bottles]);

  const whiskeyBottleTypes = summary.whiskey?.bottleTypes ?? summary.whiskey?.count ?? 0;
  const whiskeyTotalBottles = summary.whiskey?.totalBottles ?? whiskeyBottleTypes;

  const featuredPipe = pipes.find((p) => Array.isArray(p?.photos) && p.photos.length > 0);
  const featuredBottle = bottles.find((b) => b?.photo);

  const activeModuleCards = enabledModules.map((module) => {
    const dashboardRoute =
      module.type === "pipes"
        ? "PipeKeeper"
        : module.type === "whiskey"
          ? "WhiskeyKeeper"
          : module.route;

    let stats = [];

    if (module.type === "pipes") {
      stats = [
        {
          label: t("hub.pipes", "Pipes"),
          value: displayCount(summary.pipes.count),
        },
        {
          label: t("hub.blends", "Blends"),
          value: displayCount(blendCount),
          sub: !hideCollectionCounts && totalBlendOz > 0 ? `${totalBlendOz.toFixed(0)} oz cellared` : undefined,
        },
        {
          label: t("hub.totalValue", "Total Value"),
          value: displayValue(money((summary.pipes.value || 0) + totalBlendValue)),
        },
      ];
    }

    if (module.type === "whiskey") {
      stats = [
        {
          label: t("hub.bottleTypes", "Bottle Types"),
          value: displayCount(whiskeyBottleTypes),
        },
        {
          label: t("hub.totalBottles", "Total Bottles"),
          value: displayCount(whiskeyTotalBottles),
        },
        {
          label: t("hub.totalValue", "Total Value"),
          value: displayValue(money(totalBottleValue)),
        },
      ];
    }

    return {
      ...module,
      route: dashboardRoute,
      itemCount:
        module.type === "pipes"
          ? summary.pipes.count
          : module.type === "whiskey"
            ? whiskeyBottleTypes
            : 0,
      stats,
      summary: null,
      bgImage:
        module.type === "pipes"
          ? featuredPipe?.photos?.[0]
          : module.type === "whiskey"
            ? featuredBottle?.photo
            : null,
      module: module,
    };
  });

  const totalDisplayedValue =
    (summary.pipes.value || 0) + totalBlendValue + (isModuleEnabled("whiskeykeeper") ? totalBottleValue : 0);

  // Privacy-masked display helpers
  const displayValue = (val) => (hideValues || hideHomeValues) ? "—" : val;
  const displayCount = (val) => hideCollectionCounts ? "—" : val;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="text-center space-y-4">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <BrandLogo
                compact={false}
                showWordmark={false}
                className="justify-center"
                imageClassName="w-24 h-24"
              />
            </div>

            <h1
              className="text-3xl md:text-4xl font-bold"
              style={{
                color: "#F5F1E7",
                fontFamily: "'Georgia', serif",
                textShadow: "0 2px 6px rgba(0,0,0,0.45)",
              }}
            >
              {t("hub.title", "CollectionKeeper")}
            </h1>
          </div>

          <p
            className="text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(224, 216, 200, 0.75)" }}
          >
            {t(
              "hub.description",
              "Your unified ecosystem for collecting pipes, whiskey, wine, and more. Manage, explore, and curate across all your collections in one place."
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          {t("hub.collectionSummary", "Collection Overview")}
        </h2>

        <div className={`grid gap-4 ${isModuleEnabled("whiskeykeeper") ? "grid-cols-2 md:grid-cols-6" : "grid-cols-2 md:grid-cols-4"}`}>
          <SummaryStat
            label={t("hub.totalValue", "Total Value")}
            value={displayValue(money(totalDisplayedValue))}
            color="#D4A574"
          />
          <SummaryStat
            label={t("hub.pipes", "Pipes")}
            value={displayCount(summary.pipes.count)}
            color="#B48C4B"
          />
          <SummaryStat
            label={t("hub.blends", "Blends")}
            value={displayCount(blendCount)}
            sub={!hideCollectionCounts && totalBlendOz > 0 ? `${totalBlendOz.toFixed(0)}oz` : undefined}
            color="#7B9B5B"
          />

          {isModuleEnabled("whiskeykeeper") ? (
            <>
              <SummaryStat
                label={t("hub.bottleTypes", "Bottle Types")}
                value={displayCount(whiskeyBottleTypes)}
                color="#C88A4A"
              />
              <SummaryStat
                label={t("hub.totalBottles", "Total Bottles")}
                value={displayCount(whiskeyTotalBottles)}
                color="#D99A56"
              />
            </>
          ) : null}

          <SummaryStat
            label={t("hub.activeModules", "Active Modules")}
            value={summary.hubContributorCount || activeModuleCards.length}
            color="#A35C5C"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          {t("hub.yourModules", "Your Collections")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeModuleCards.map((module) => (
            <ModuleCard
              key={module.type}
              module={t(module.titleKey, module.type)}
              icon={module.icon}
              itemCount={module.itemCount}
              summary={module.summary}
              stats={module.stats}
              action={module.route}
              isComingSoon={false}
              bgImage={module.bgImage}
            />
          ))}
        </div>
      </div>

      <QuickLaunch />

      <TonightSessionCard
        pipes={aiCollection.pipes}
        blends={aiCollection.blends}
        bottles={aiCollection.bottles}
        profile={hubProfile}
        tasteProfile={tasteProfile}
      />

      <CollectionStoryCard
        pipes={aiCollection.pipes}
        blends={aiCollection.blends}
        bottles={aiCollection.bottles}
      />
      <CuratorHub summary={summary} recentActivities={recentActivities} />

      <CollectionIntelligencePanel
        pipes={aiCollection.pipes}
        blends={aiCollection.blends}
        bottles={aiCollection.bottles}
        logs={smokingLogs}
        profile={hubProfile}
        tasteProfile={tasteProfile}
      />

      <RecentActivity onActivitiesLoaded={setRecentActivities} />

      {comingSoonModules.length > 0 ? (
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-[0.12em] font-semibold"
            style={{ color: "rgba(180, 140, 75, 0.8)" }}
          >
            {t("hub.comingSoon", "Expanding Soon")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comingSoonModules.map((module) => (
              <ModuleCard
                key={module.type}
                module={t(module.titleKey, module.type)}
                icon={module.icon}
                itemCount={0}
                summary={null}
                action={null}
                isComingSoon
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}