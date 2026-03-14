import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import ModuleNav from '@/components/modules/ModuleNav';
import BottleInsights from '@/components/whiskey/BottleInsights';
import { Wine, BookOpen, TrendingUp, BarChart3 } from 'lucide-react';

export default function WhiskeyInsightsPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const moduleNavItems = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', icon: Wine },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 100);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  return (
    <div className="space-y-6">
      <ModuleNav items={moduleNavItems} currentPath="/WhiskeyInsights" />

      <div>
        <h1
          className="text-4xl font-bold tracking-tight mb-2"
          style={{
            color: '#F5F1E7',
            fontFamily: "'Georgia', serif",
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          }}
        >
          {t('nav.insights') || 'Collection Insights'}
        </h1>
        <p style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
          {t('whiskeykeeper.insightsDescription') || 'Trends and statistics from your whiskey collection'}
        </p>
      </div>

      {bottles.length > 0 ? (
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
            border: '1px solid rgba(180, 140, 75, 0.15)',
          }}
        >
          <BottleInsights bottles={bottles} tastingLogs={tastingLogs} />
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.3), rgba(31, 21, 16, 0.3))',
            border: '1px solid rgba(180, 140, 75, 0.15)',
          }}
        >
          <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(180,140,75,0.5)' }} />
          <h2 style={{ color: '#F5F1E7' }} className="text-xl font-semibold mb-2">
            {t('whiskeykeeper.noInsights') || 'No insights yet'}
          </h2>
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('whiskeykeeper.addBottlesForInsights') || 'Add bottles to your collection to see insights'}
          </p>
        </div>
      )}
    </div>
  );
}