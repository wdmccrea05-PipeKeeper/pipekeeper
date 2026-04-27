import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Wine, TrendingUp, Star, Calendar, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import { useCurrency } from '@/lib/currency/useCurrency';

function StatCard({ label, value, icon: Icon, accent = '#8B3A3A' }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: accent }} />
        <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: `${accent}CC` }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>{value}</div>
    </div>
  );
}

export default function WineInsights() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();

  const { data: wines = [] } = useQuery({
    queryKey: ['wines', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Wine.filter({ created_by: user?.email }, '-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ['wine-tastings-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.WineTasting.filter({ created_by: user?.email }, '-date', 500).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const stats = useMemo(() => {
    const totalBottles = wines.length;
    const totalInCellar = wines.reduce((s, w) => s + (w.quantity || 1), 0);
    // Rich value resolution: manual override > market total > estimated total > estimated unit*qty > estimated_value > purchase
    const totalValue = wines.reduce((s, w) => {
      const qty = w.quantity || 1;
      if (w.manual_valuation_enabled && w.manual_estimated_value > 0) return s + w.manual_estimated_value * qty;
      if (w.estimated_total_value > 0) return s + w.estimated_total_value;
      if (w.market_estimated_total_value > 0) return s + w.market_estimated_total_value;
      if (w.estimated_unit_value > 0) return s + w.estimated_unit_value * qty;
      if (w.market_estimated_unit_value > 0) return s + w.market_estimated_unit_value * qty;
      if (w.estimated_value > 0) return s + w.estimated_value * qty;
      return s;
    }, 0);
    const unvalued = wines.filter((w) => {
      const hasValue = w.manual_estimated_value > 0 || w.estimated_total_value > 0 ||
        w.market_estimated_total_value > 0 || w.estimated_unit_value > 0 ||
        w.market_estimated_unit_value > 0 || w.estimated_value > 0;
      return !hasValue;
    }).length;
    const lowConfidence = wines.filter((w) => {
      const conf = w.valuation_confidence || w.market_valuation_confidence;
      return conf === 'low';
    }).length;
    const rated = wines.filter((w) => w.rating > 0);
    const avgRating = rated.length > 0 ? (rated.reduce((s, w) => s + w.rating, 0) / rated.length).toFixed(1) : '—';

    const styleBreakdown = {};
    wines.forEach((w) => { if (w.style) styleBreakdown[w.style] = (styleBreakdown[w.style] || 0) + 1; });

    const regionBreakdown = {};
    wines.forEach((w) => { if (w.region) regionBreakdown[w.region] = (regionBreakdown[w.region] || 0) + 1; });

    const now = new Date();
    const drinkingNow = wines.filter((w) => {
      if (!w.drinking_window_start || !w.drinking_window_end) return false;
      return new Date(w.drinking_window_start) <= now && new Date(w.drinking_window_end) >= now;
    });
    const tooYoung = wines.filter((w) => w.drinking_window_start && new Date(w.drinking_window_start) > now);
    const pastPeak = wines.filter((w) => w.drinking_window_end && new Date(w.drinking_window_end) < now);

    return {
      totalBottles,
      totalInCellar,
      totalValue,
      avgRating,
      styleBreakdown,
      regionBreakdown,
      drinkingNow: drinkingNow.length,
      tooYoung: tooYoung.length,
      pastPeak: pastPeak.length,
      tastingCount: tastings.length,
      unvalued,
      lowConfidence,
    };
  }, [wines, tastings]);

  return (
    <div className="space-y-8">
      <WineKeeperModuleNav currentPageName="WineInsights" />

      <h1 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>
        {t('wine.insights', 'WineKeeper Insights')}
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('wine.totalBottles', 'Total Bottles')} value={stats.totalBottles} icon={Wine} />
        <StatCard label={t('wine.totalInCellar', 'In Cellar')} value={stats.totalInCellar} icon={Wine} />
        <StatCard label={t('wine.collectionValue', 'Est. Value')} value={formatFromBase(stats.totalValue)} icon={TrendingUp} accent="#2E7D5C" />
        <StatCard label={t('wine.avgRating', 'Avg Rating')} value={stats.avgRating} icon={Star} accent="#D4A574" />
      </div>

      {/* Drinking window summary */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'rgba(46,125,92,0.08)', border: '1px solid rgba(46,125,92,0.25)' }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(46,125,92,0.8)' }}>
          {t('wine.drinkingWindowSummary', 'Drinking Window')}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: t('wine.drinkNow', 'Drink Now'), value: stats.drinkingNow, color: '#2E7D5C' },
            { label: t('wine.tooYoung', 'Too Young'), value: stats.tooYoung, color: '#6B8FC4' },
            { label: t('wine.pastPeak', 'Past Peak'), value: stats.pastPeak, color: '#A35C5C' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Style breakdown */}
      {Object.keys(stats.styleBreakdown).length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(42,28,20,0.7)', border: '1px solid rgba(139,58,58,0.25)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(180,140,75,0.8)' }}>
            {t('wine.byStyle', 'By Style')}
          </h2>
          <div className="space-y-2">
            {Object.entries(stats.styleBreakdown).sort((a, b) => b[1] - a[1]).map(([style, count]) => (
              <div key={style} className="flex items-center justify-between">
                <span className="text-sm capitalize" style={{ color: '#F5F1E7' }}>{style}</span>
                <span className="text-sm font-semibold" style={{ color: '#C47070' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Region breakdown */}
      {Object.keys(stats.regionBreakdown).length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(42,28,20,0.7)', border: '1px solid rgba(139,58,58,0.25)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(180,140,75,0.8)' }}>
            {t('wine.byRegion', 'By Region')}
          </h2>
          <div className="space-y-2">
            {Object.entries(stats.regionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([region, count]) => (
              <div key={region} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#F5F1E7' }}>{region}</span>
                <span className="text-sm font-semibold" style={{ color: '#C47070' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valuation health */}
      {wines.length > 0 && (stats.unvalued > 0 || stats.lowConfidence > 0) && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(180,140,75,0.07)', border: '1px solid rgba(180,140,75,0.22)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" style={{ color: '#D4A574' }} />
            <span className="text-sm font-semibold" style={{ color: '#D4A574' }}>Valuation Coverage</span>
          </div>
          <div className="space-y-1.5 text-sm">
            {stats.unvalued > 0 && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(224,216,200,0.7)' }}>Not valued yet</span>
                <span className="font-semibold" style={{ color: '#F5F1E7' }}>{stats.unvalued} {stats.unvalued === 1 ? 'bottle' : 'bottles'}</span>
              </div>
            )}
            {stats.lowConfidence > 0 && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(224,216,200,0.7)' }}>Low confidence estimate</span>
                <span className="font-semibold" style={{ color: '#F5F1E7' }}>{stats.lowConfidence} {stats.lowConfidence === 1 ? 'bottle' : 'bottles'}</span>
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: 'rgba(224,216,200,0.5)' }}>
              Click Enrich on individual bottles to improve valuation accuracy.
            </p>
          </div>
        </div>
      )}

      <div className="text-center py-4" style={{ color: 'rgba(224,216,200,0.35)', fontSize: '0.75rem' }}>
        {t('wine.tastingCount', '{{count}} tastings logged', { count: stats.tastingCount })}
      </div>
    </div>
  );
}