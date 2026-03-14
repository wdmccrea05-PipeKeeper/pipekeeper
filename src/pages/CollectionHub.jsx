import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import ModuleCard from '@/components/hub/ModuleCard';
import CombinedSummary from '@/components/hub/CombinedSummary';
import CuratorHub from '@/components/hub/CuratorHub';
import RecentActivity from '@/components/hub/RecentActivity';
import QuickLaunch from '@/components/hub/QuickLaunch';
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
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="relative">
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 40%, rgba(180, 140, 75, 0.12) 0%, transparent 60%)',
          }}
        />
        <div className="relative space-y-4 py-8">
          <div className="space-y-3 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#F5F1E7]" style={{ fontFamily: "'Georgia', serif", textShadow: '0 3px 10px rgba(0,0,0,0.8)' }}>
              {t('hub.title')}
            </h1>
            <p className="text-lg md:text-xl text-[#E0D8C8]/80 max-w-3xl mx-auto md:mx-0 leading-relaxed">
              {t('hub.description')}
            </p>
            <div className="flex items-center gap-2 text-sm justify-center md:justify-start" style={{ color: 'rgba(180, 140, 75, 0.7)' }}>
              <div className="h-1 w-1 rounded-full" style={{ background: 'rgba(180, 140, 75, 0.7)' }} />
              <span>{summary.total.items} {t('hub.items')}</span>
              <div className="h-1 w-1 rounded-full" style={{ background: 'rgba(180, 140, 75, 0.7)' }} />
              <span>{summary.hubContributorCount} {t('hub.modules')}</span>
              {summary.total.value > 0 && (
                <>
                  <div className="h-1 w-1 rounded-full" style={{ background: 'rgba(180, 140, 75, 0.7)' }} />
                  <span>${summary.total.value.toLocaleString()}</span>
                </>
              )}
            </div>
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

      {/* Combined Summary (dynamic) */}
      <CombinedSummary
        pipeCount={summary.pipes.count}
        tobaccoCount={summary.tobacco.count}
        bottleCount={summary.whiskey.count}
        totalValue={summary.total.value}
        enabledModuleCount={summary.hubContributorCount}
      />

      {/* Recent Activity */}
      <RecentActivity onActivitiesLoaded={setRecentActivities} />

      {/* Curator Section (with ecosystem context) */}
      <CuratorHub summary={summary} recentActivities={recentActivities} />

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