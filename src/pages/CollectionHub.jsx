import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ModuleCard from '@/components/hub/ModuleCard';
import CuratorHub from '@/components/hub/CuratorHub';
import RecentActivity from '@/components/hub/RecentActivity';
import QuickLaunch from '@/components/hub/QuickLaunch';
import TonightSessionCard from '@/components/hub/TonightSessionCard';
import CollectionStoryCard from '@/components/hub/CollectionStoryCard';
import CollectionIntelligencePanel from '@/components/hub/CollectionIntelligencePanel';
import { useTasteProfile } from '@/components/curator/useTasteProfile';
import {
  getCollectionHubSummary,
  getComingSoonModules,
} from '@/components/keeper-core';
import BrandLogo from '@/components/branding/BrandLogo';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { buildAIEligibleCollection } from '@/components/utils/moduleAccess';

export default function CollectionHub() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    pipes: { count: 0, value: 0 },
    tobacco: { count: 0, value: 0 },
    whiskey: { count: 0, value: 0 },
    total: { items: 0, value: 0 },
    enabledModuleCount: 0,
    hubContributorCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // Module visibility — declared early so useEffect can use moduleStates
  const { enabledModules, isModuleEnabled, moduleStates } = useEnabledKeeperModules();

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        // Pass moduleStates so hidden modules are excluded from Hub totals
        const collectionSummary = await getCollectionHubSummary(user.email, moduleStates || null);

        if (!cancelled) {
          setSummary(collectionSummary);
        }
      } catch (error) {
        console.error('[CollectionHub] Error loading summary:', error);
        if (!cancelled) {
          setSummary({
            pipes: { count: 0, value: 0 },
            tobacco: { count: 0, value: 0 },
            whiskey: { count: 0, value: 0 },
            total: { items: 0, value: 0 },
            enabledModuleCount: 0,
            hubContributorCount: 0,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const { data: pipes = [] } = useQuery({
    queryKey: ['hub-pipes', user?.email],
    queryFn: async () => {
      const r = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(r) ? r : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['hub-blends', user?.email],
    queryFn: async () => {
      const r = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(r) ? r : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: bottles = [] } = useQuery({
    queryKey: ['hub-bottles', user?.email],
    queryFn: async () => {
      const r = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(r) ? r : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ['hub-smoking-logs', user?.email],
    queryFn: async () => {
      const r = await base44.entities.SmokingLog.filter({ created_by: user?.email });
      return Array.isArray(r) ? r : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: hubProfile = null } = useQuery({
    queryKey: ['hub-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const r = await base44.entities.UserProfile.filter({ user_email: user.email });
      return r?.[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const { data: hubSmokingLogs = [] } = useQuery({
    queryKey: ['hub-tasting-logs', user?.email],
    queryFn: async () => {
      const r = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 50);
      return Array.isArray(r) ? r : [];
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const tasteProfile = useTasteProfile({
    pipes,
    blends,
    bottles,
    smokingLogs,
    tastingLogs: hubSmokingLogs,
    profile: hubProfile,
  });

  const comingSoonModules = getComingSoonModules();

  // AI-eligible collection: only include data from enabled/visible modules
  const aiCollection = buildAIEligibleCollection(moduleStates, { pipes, blends, bottles });

  // Map module registry to card data with module-specific stats
  // Compute blend quantity metrics from raw blend data
  const blendCount = blends.length; // Number of distinct blends
  const totalBlendOz = blends.reduce((sum, b) => {
    const tinOz = Number(b?.tin_total_quantity_oz) || 0;
    const bulkOz = Number(b?.bulk_total_quantity_oz) || 0;
    const pouchOz = Number(b?.pouch_total_quantity_oz) || 0;
    return sum + tinOz + bulkOz + pouchOz;
  }, 0);

  const totalBlendValue = blends.reduce((sum, b) => {
    return sum + (Number(b?.manual_market_value) || Number(b?.ai_estimated_value) || 0);
  }, 0);

  const totalBottleValue = bottles.reduce((sum, b) => {
    const val = Number(b?.average_market_value) || Number(b?.purchase_price) || 0;
    const count = Number(b?.bottle_count) || 1;
    return sum + val * count;
  }, 0);

  // Featured images for card art backgrounds
  const featuredPipe = pipes.find(p => p?.photos?.length > 0);
  const featuredBottle = bottles.find(b => b?.photo);

  const activeModuleCards = enabledModules.map((module) => {
    const dashboardRoute = module.type === 'pipes' ? 'PipeKeeper' : module.type === 'whiskey' ? 'WhiskeyKeeper' : module.route;

    let stats = [];
    if (module.type === 'pipes') {
      stats = [
        { label: t('hub.pipes'), value: summary.pipes.count },
        { label: t('hub.blends'), value: blendCount, sub: totalBlendOz > 0 ? `${totalBlendOz.toFixed(0)} oz cellared` : undefined },
        { label: t('hub.totalValue'), value: summary.pipes.value > 0 || totalBlendValue > 0 ? `$${(summary.pipes.value + totalBlendValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
      ];
    } else if (module.type === 'whiskey') {
      const wBottleTypes = summary.whiskey?.bottleTypes ?? summary.whiskey?.count ?? 0;
      const wTotalBottles = summary.whiskey?.totalBottles ?? wBottleTypes ?? 0;
      const wValue = isModuleEnabled('whiskeykeeper') ? totalBottleValue : 0;
      stats = [
        { label: t('hub.bottleTypes'), value: wBottleTypes },
        ...(wTotalBottles > wBottleTypes
          ? [{ label: t('hub.totalBottles', 'Total Bottles'), value: wTotalBottles }]
          : []),
        {
          label: t('hub.totalValue'),
          value:
            wValue > 0
              ? `$${wValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—',
        },
      ];
    }

    return {
      ...module,
      route: dashboardRoute,
      itemCount:
        module.type === 'pipes'
          ? summary.pipes.count
          : module.type === 'whiskey'
            ? (summary.whiskey?.bottleTypes ?? summary.whiskey?.count ?? 0)
            : 0,
      stats,
      summary: null,
      bgImage: module.type === 'pipes' ? featuredPipe?.photos?.[0] : module.type === 'whiskey' ? featuredBottle?.photo : null,
    };
  });

  return (
    <div className="space-y-8">
      {/* Hero Section - Match Home Page Canonical Style */}
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
                color: '#F5F1E7',
                fontFamily: "'Georgia', serif",
                textShadow: '0 2px 6px rgba(0,0,0,0.45)',
              }}
            >
              CollectionKeeper
            </h1>
          </div>
          <p 
            className="text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(224, 216, 200, 0.75)" }}
          >
            {t('hub.description')}
          </p>
        </div>
      </div>

      {/* Collection Summary Ledger - Match Home Page Style */}
      <div 
        className="rounded-lg p-5"
        style={{
          background: "linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))",
          border: "1px solid rgba(120, 90, 65, 0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)"
        }}
      >
        <h2 
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          {t("hub.collectionSummary")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('hub.totalValue')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {(() => {
                const bottleVal = isModuleEnabled('whiskeykeeper') ? totalBottleValue : 0;
                const total = summary.pipes.value + totalBlendValue + bottleVal;
                return total > 0
                  ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '$0.00';
              })()}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('hub.pipes')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
              {summary.pipes.count}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('hub.blends')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#7B9B5B' }}>
              {blendCount}
            </p>
            {totalBlendOz > 0 && (
              <p className="text-xs" style={{ color: 'rgba(123,155,91,0.7)' }}>{totalBlendOz.toFixed(0)}oz</p>
            )}
          </div>
          {isModuleEnabled('whiskeykeeper') && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
                {t('hub.bottleTypes')}
              </p>
              <p className="text-2xl font-bold" style={{ color: '#8B7355' }}>
                {summary.whiskey.bottleTypes ?? summary.whiskey.count}
              </p>
              {(summary.whiskey.totalBottles ?? 0) > (summary.whiskey.bottleTypes ?? summary.whiskey.count) && (
                <p className="text-xs" style={{ color: 'rgba(139,115,85,0.65)' }}>
                  {summary.whiskey.totalBottles} {t('hub.totalBottlesShort', 'total bottles')}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('hub.activeModules')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#A35C5C' }}>
              {summary.hubContributorCount}
            </p>
          </div>
        </div>
      </div>

      {/* Your Collections Section */}
      <div className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('hub.yourModules')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeModuleCards.map((module) => (
            <ModuleCard
              key={module.type}
              module={t(module.titleKey)}
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

      {/* Quick Launch */}
      <QuickLaunch />

      {/* Tonight's Session — only AI-eligible module data */}
      <TonightSessionCard
        pipes={aiCollection.pipes}
        blends={aiCollection.blends}
        bottles={aiCollection.bottles}
        profile={hubProfile}
        tasteProfile={tasteProfile}
      />

      {/* Collection Story */}
      <CollectionStoryCard />

      {/* Curator Section (with ecosystem context) */}
      <CuratorHub summary={summary} recentActivities={recentActivities} />

      {/* Collection Intelligence — only AI-eligible module data */}
      <CollectionIntelligencePanel
        pipes={aiCollection.pipes}
        blends={aiCollection.blends}
        bottles={aiCollection.bottles}
        logs={smokingLogs}
        profile={hubProfile}
        tasteProfile={tasteProfile}
      />

      {/* Recent Activity */}
      <RecentActivity onActivitiesLoaded={setRecentActivities} />

      {/* Coming Soon Section (from registry) */}
      {comingSoonModules.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
            {t('hub.comingSoon')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comingSoonModules.map((module) => (
              <ModuleCard
                key={module.type}
                module={t(module.titleKey)}
                icon={module.icon}
                itemCount={0}
                summary={null}
                action={null}
                isComingSoon={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}