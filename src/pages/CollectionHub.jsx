import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import ModuleCard from '@/components/hub/ModuleCard';
import CombinedSummary from '@/components/hub/CombinedSummary';
import CuratorHub from '@/components/hub/CuratorHub';
import RecentActivity from '@/components/hub/RecentActivity';
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
          ? summary.bottles
          : { count: 0, value: 0 };

    return {
      ...module,
      itemCount: moduleData.count,
      summary: {
        label: t('hub.totalValue'),
        value: moduleData.value > 0 ? `$${moduleData.value.toLocaleString()}` : '—',
      },
    };
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-[#E0D8C8]">
            {t('hub.title')}
          </h1>
          <p className="text-lg text-[#E0D8C8]/70 max-w-2xl">
            {t('hub.description')}
          </p>
        </div>
      </div>

      {/* Active Modules Section (from registry) */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-[#E0D8C8]">
          {t('hub.yourModules')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Combined Summary (dynamic) */}
      <CombinedSummary
        pipeCount={summary.pipes.count}
        tobaccoCount={summary.tobacco.count}
        bottleCount={summary.whiskey.count}
        totalValue={summary.total.value}
        enabledModuleCount={summary.hubContributorCount}
      />

      {/* Recent Activity */}
      <RecentActivity />

      {/* Curator Section (with ecosystem context) */}
      <CuratorHub summary={summary} />

      {/* Coming Soon Section (from registry) */}
      {comingSoonModules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#E0D8C8]">
            {t('hub.comingSoon')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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