import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { getBottleUnitValue } from '@/components/utils/whiskeyValueHelpers';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { BarChart3 } from 'lucide-react';
import WhiskeyValueIntelligence from '@/components/whiskey/WhiskeyValueIntelligence';

function WhiskeyAnalyticsInner() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();



  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const totalValue = bottles.reduce((sum, b) => sum + getBottleUnitValue(b), 0);
  const avgRating = bottles.filter(b => b?.rating > 0).reduce((sum, b, _, arr) => sum + (b.rating / arr.length), 0);
  const totalBottles = bottles.length;
  const openBottles = bottles.filter(b => b?.fill_level && b.fill_level !== 'Empty').length;

  return (
    <div className="space-y-6">
      <WhiskeyKeeperModuleNav currentPageName="WhiskeyAnalytics" />

      <div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 break-words"
          style={{
            color: '#F5F1E7',
            fontFamily: "'Georgia', serif",
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
            wordBreak: "break-word",
            hyphens: "none"
          }}
        >
          {t('nav.analytics') || 'Analytics'}
        </h1>
        <p style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
          {t('whiskeykeeper.analyticsDescription') || 'Deep dive into your collection metrics'}
        </p>
      </div>

      {bottles.length > 0 ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className="rounded-lg p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
              border: '1px solid rgba(180, 140, 75, 0.2)',
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.totalValue') || 'Total Value'}
            </p>
            <p className="text-3xl font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(totalValue)}
            </p>
          </div>

          <div
            className="rounded-lg p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
              border: '1px solid rgba(180, 140, 75, 0.2)',
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.totalBottles') || 'Total Bottles'}
            </p>
            <p className="text-3xl font-bold" style={{ color: '#B48C4B' }}>
              {totalBottles}
            </p>
          </div>

          <div
            className="rounded-lg p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
              border: '1px solid rgba(180, 140, 75, 0.2)',
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.openBottles') || 'Open Bottles'}
            </p>
            <p className="text-3xl font-bold" style={{ color: '#A35C5C' }}>
              {openBottles}
            </p>
          </div>

          <div
            className="rounded-lg p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
              border: '1px solid rgba(180, 140, 75, 0.2)',
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.avgRating') || 'Avg Rating'}
            </p>
            <p className="text-3xl font-bold" style={{ color: '#D4AF37' }}>
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </p>
          </div>
        </div>

        <WhiskeyValueIntelligence bottles={bottles} />
        </>
      ) : (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.3), rgba(31, 21, 16, 0.3))',
            border: '1px solid rgba(180, 140, 75, 0.15)',
          }}
        >
          <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(180,140,75,0.5)' }} />
          <h2 style={{ color: '#F5F1E7' }} className="text-xl font-semibold mb-2">
            {t('whiskeykeeper.noAnalytics') || 'No analytics yet'}
          </h2>
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('whiskeykeeper.addBottlesForAnalytics') || 'Add bottles to see detailed analytics'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function WhiskeyAnalyticsPage() {
  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <WhiskeyAnalyticsInner />
    </LockedModuleGuard>
  );
}