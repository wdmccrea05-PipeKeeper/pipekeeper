import React from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { getEnabledModuleCount } from './keeperModuleRegistry';
import { useCurrency } from '@/lib/currency/useCurrency';

export default function CombinedSummary({ pipeCount, tobaccoCount, bottleCount, totalValue, enabledModuleCount }) {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();

  const totalItems = pipeCount + tobaccoCount + bottleCount;
  const moduleCount = enabledModuleCount || getEnabledModuleCount();

  const stats = [
    {
      label: t('hub.totalItems'),
      value: totalItems,
    },
    {
      label: t('hub.totalValue'),
      value: totalValue > 0 ? formatFromBase(totalValue) : '—',
    },
    {
      label: t('hub.modules'),
      value: moduleCount,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-[#3a2f26]/60 to-[#2a2020]/60 border border-[#8b6239]/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-[#E0D8C8] mb-6">{t('hub.collectionSummary')}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-[#1a1410]/60 rounded-lg p-4 border border-[#8b6239]/15"
          >
            <p className="text-sm text-[#E0D8C8]/70 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-[#D4A574]">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}