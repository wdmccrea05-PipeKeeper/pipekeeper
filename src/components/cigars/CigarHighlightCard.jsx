import React, { useMemo } from 'react';
import { Cigarette, DollarSign, Box, Heart, Clock, Flame, TrendingDown, ShieldAlert, AlertTriangle } from 'lucide-react';
import { humidorNeedsAttention } from './humidorMaintenanceUtils';
import { getCollectionInsights } from '@/platform/cigarInsights';
import { useCurrency } from '@/lib/currency/useCurrency';
import { selectCigarMetrics } from '@/lib/collection/cigarSelectors';
import { useTranslation } from '@/components/i18n/safeTranslation';

function StatCard({ icon: Icon, label, value, sub, alert }) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{
        background: alert ? 'rgba(224,85,85,0.08)' : 'rgba(255,255,255,0.035)',
        border: alert ? '1px solid rgba(224,85,85,0.28)' : '1px solid rgba(180,140,75,0.18)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: alert
            ? 'linear-gradient(135deg, rgba(180,50,50,0.5), rgba(140,40,40,0.6))'
            : 'linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))',
          border: alert ? '1px solid rgba(200,80,80,0.45)' : '1px solid rgba(120,90,65,0.45)',
        }}
      >
        <Icon className="w-4 h-4" style={{ color: alert ? '#E07070' : '#D4A574' }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-[#F5F1E7]">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {label}
        </div>
        {sub && <div className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.45)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function CigarHighlightCard({ cigars = [], sessions = [], humidors = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { formatFromBase } = useCurrency();
  const { t } = useTranslation();

  const cigarMetrics = useMemo(() => selectCigarMetrics(cigars, humidors), [cigars, humidors]);
  const totalQty = cigarMetrics.total_sticks;
  const valuedCount = cigarMetrics.valued_cigar_count;
  const valueDisplay = valuedCount > 0 ? formatFromBase(cigarMetrics.collection_value) : t('cigars.highlights.noValuesAddedYet');
  const valueSub = valuedCount > 0
    ? t('cigars.highlights.valuedCount', { valued: valuedCount, total: cigars.length })
    : t('cigars.highlights.addPurchaseOrEstimate');

  const readyCount = cigars.filter((c) => {
    if (!c.ready_to_smoke_date) return true;
    return new Date(c.ready_to_smoke_date) <= today;
  }).length;

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSessions = sessions.filter((s) => s.date && new Date(s.date) >= thirtyDaysAgo).length;

  const alertHumidorCount = humidors.filter(humidorNeedsAttention).length;

  // Intelligence metrics (memoized for performance)
  const insights = useMemo(
    () => getCollectionInsights(cigars, humidors, sessions),
    [cigars, humidors, sessions]
  );

  // Top 3 brands
  const brandCounts = {};
  cigars.forEach((c) => {
    if (c.brand) brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
  });
  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const favoriteCount = cigars.filter((c) => c.is_favorite).length;
  const atRiskCount = insights.atRisk?.length || 0;

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{
        background: 'linear-gradient(135deg, rgba(58,40,28,0.98), rgba(31,21,16,1))',
        border: '1px solid rgba(180,140,75,0.22)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.42)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Cigarette className="w-5 h-5" style={{ color: '#D4A574' }} />
        <h2 style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", fontSize: '1.05rem', fontWeight: 700 }}>
          {t('cigars.highlights.collectionOverview')}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Cigarette} label={t('cigars.highlights.cigarTypes')} value={cigars.length} sub={t('cigars.highlights.sticksTotal', { count: totalQty })} />
        <StatCard
          icon={DollarSign}
          label={t('cigars.highlights.estimatedValue')}
          value={valueDisplay}
          sub={valueSub}
        />
        <StatCard icon={Box} label={t('cigars.humidors')} value={humidors.length} />
        <StatCard icon={Heart} label={t('cigars.highlights.favorites')} value={favoriteCount} />
        <StatCard icon={Flame} label={t('cigars.highlights.readyToSmoke')} value={readyCount} />
        <StatCard icon={Clock} label={t('cigars.recentSessions')} value={recentSessions} sub={t('cigars.highlights.last30Days')} />
        {insights.runningLow.length > 0 && (
          <StatCard
            icon={TrendingDown}
            label={t('cigars.highlights.runningLow')}
            value={insights.runningLow.length}
            sub={t('cigars.highlights.runningLowSub')}
          />
        )}
        {atRiskCount > 0 && (
          <StatCard icon={ShieldAlert} label={t('cigars.highlights.atRisk')} value={atRiskCount} sub={t('cigars.highlights.needsAttention')} />
        )}
        {alertHumidorCount > 0 && (
          <StatCard
            icon={AlertTriangle}
            label={t('cigars.humidorsNeedingAttention')}
            value={alertHumidorCount}
            alert
          />
        )}
      </div>

      {topBrands.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'rgba(224,216,200,0.55)' }}
          >
            {t('cigars.highlights.topBrands')}
          </p>
          <div className="flex flex-wrap gap-2">
            {topBrands.map((brand, i) => (
              <span
                key={brand}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: i === 0 ? 'rgba(180,140,75,0.28)' : 'rgba(180,140,75,0.12)',
                  border: `1px solid rgba(180,140,75,${i === 0 ? '0.45' : '0.22'})`,
                  color: i === 0 ? '#D4A574' : '#F5F1E7',
                }}
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
