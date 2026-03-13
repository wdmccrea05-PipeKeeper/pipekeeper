import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import ModuleCard from '@/components/hub/ModuleCard';
import CombinedSummary from '@/components/hub/CombinedSummary';
import CuratorHub from '@/components/hub/CuratorHub';
import { getCombinedCollectionSummary, getModuleSummary } from '@/components/utils/hubDataHelpers';

export default function CollectionHub() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [pipeData, setPipeData] = useState({ count: 0, value: 0 });
  const [bottleData, setBottleData] = useState({ count: 0, value: 0 });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const summary = await getCombinedCollectionSummary();

        if (!cancelled) {
          setPipeData({
            count: summary.pipes.count,
            value: summary.pipes.value,
          });
          setBottleData({
            count: summary.bottles.count,
            value: summary.bottles.value,
          });
        }
      } catch (error) {
        console.error('[CollectionHub] Error loading summary:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const modules = [
    {
      name: t('hub.pipekeeper'),
      icon: '🔴',
      itemCount: pipeData.count,
      summary: {
        label: t('hub.totalValue'),
        value: pipeData.value > 0 ? `$${pipeData.value.toLocaleString()}` : '—',
      },
      action: 'Pipes',
    },
    {
      name: t('hub.whiskeykeeper'),
      icon: '🥃',
      itemCount: bottleData.count,
      summary: {
        label: t('hub.totalValue'),
        value: bottleData.value > 0 ? `$${bottleData.value.toLocaleString()}` : '—',
      },
      action: 'Whiskey',
    },
  ];

  const comingSoon = [
    {
      name: t('hub.cigarkeeper'),
      icon: '🔘',
    },
    {
      name: t('hub.coffeekeeper'),
      icon: '☕',
    },
  ];

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

      {/* Active Modules Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-[#E0D8C8]">
          {t('hub.yourModules')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.action}
              module={module.name}
              icon={module.icon}
              itemCount={module.itemCount}
              summary={module.summary}
              action={module.action}
              isComingSoon={false}
            />
          ))}
        </div>
      </div>

      {/* Combined Summary */}
      <CombinedSummary
        pipeCount={pipeData.count}
        bottleCount={bottleData.count}
        totalValue={pipeData.value + bottleData.value}
      />

      {/* Curator Section */}
      <CuratorHub />

      {/* Coming Soon Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-[#E0D8C8]">
          {t('hub.comingSoon')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comingSoon.map((module) => (
            <ModuleCard
              key={module.name}
              module={module.name}
              icon={module.icon}
              itemCount={0}
              summary={null}
              action={null}
              isComingSoon={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}