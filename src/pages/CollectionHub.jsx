import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ModuleCard from '@/components/hub/ModuleCard';
import CombinedSummary from '@/components/hub/CombinedSummary';
import CuratorHub from '@/components/hub/CuratorHub';
import RecentActivity from '@/components/hub/RecentActivity';
import QuickLaunch from '@/components/hub/QuickLaunch';
import TonightSessionCard from '@/components/hub/TonightSessionCard';
import CollectionIntelligencePanel from '@/components/hub/CollectionIntelligencePanel';
import { useTasteProfile } from '@/components/curator/useTasteProfile';
import {
  getCollectionHubSummary,
  getEnabledModules,
  getComingSoonModules,
} from '@/components/keeper-core';

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

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        // Uses Keeper Core service for user-scoped aggregation
        const collectionSummary = await getCollectionHubSummary(user.email);

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

  const enabledModules = getEnabledModules();
  const comingSoonModules = getComingSoonModules();

  // Map module registry to card data
  const activeModuleCards = enabledModules.map((module) => {
    const moduleData =
      module.type === 'pipes'
        ? summary.pipes
        : module.type === 'whiskey'
          ? summary.whiskey
          : { count: 0, value: 0 };

    // Map module types to dashboard routes
    const dashboardRoute = module.type === 'pipes' ? 'PipeKeeper' : module.type === 'whiskey' ? 'WhiskeyKeeper' : module.route;

    return {
      ...module,
      route: dashboardRoute,
      itemCount: moduleData.count,
      summary: {
        label: t('hub.totalValue'),
        value: moduleData.value > 0 ? `$${moduleData.value.toLocaleString()}` : '—',
      },
    };
  });

  return (
    <div className="space-y-8">
      {/* Hero Section - Match Home Page Canonical Style */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 
            className="text-4xl font-bold tracking-tight"
            style={{ 
              color: "#F5F1E7",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              fontFamily: "'Georgia', serif"
            }}
          >
            {t('hub.title')}
          </h1>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('hub.totalValue')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {summary.total.value > 0 ? `$${summary.total.value.toLocaleString()}` : '$0'}
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
              {t('hub.bottles')}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#8B7355' }}>
              {summary.whiskey.count}
            </p>
          </div>
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
              action={module.route}
              isComingSoon={false}
            />
          ))}
        </div>
      </div>

      {/* Quick Launch */}
      <QuickLaunch />

      {/* Tonight's Session */}
      <TonightSessionCard
        pipes={pipes}
        blends={blends}
        bottles={bottles}
        profile={hubProfile}
        tasteProfile={tasteProfile}
      />

      {/* Curator Section (with ecosystem context) */}
      <CuratorHub summary={summary} recentActivities={recentActivities} />

      {/* Collection Intelligence */}
      <CollectionIntelligencePanel
        pipes={pipes}
        blends={blends}
        bottles={bottles}
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