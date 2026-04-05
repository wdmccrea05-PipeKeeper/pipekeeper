import React, { useMemo } from 'react';
import { Cigarette, DollarSign, Box, Heart, Clock, Flame, TrendingDown, AlertTriangle } from 'lucide-react';
import { getCollectionInsights } from '@/platform/cigarInsights';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: 'linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))',
          border: '1px solid rgba(120,90,65,0.45)',
        }}
      >
        <Icon className="w-4 h-4" style={{ color: '#D4A574' }} />
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

  const totalQty = cigars.reduce((sum, c) => sum + (c.singles_equivalent || c.quantity || 0), 0);

  const totalValue = cigars.reduce((sum, c) => {
    const qty = c.singles_equivalent || c.quantity || 1;
    const price = c.estimated_value || c.purchase_price || 0;
    return sum + price * qty;
  }, 0);

  const readyCount = cigars.filter((c) => {
    if (!c.ready_to_smoke_date) return true;
    return new Date(c.ready_to_smoke_date) <= today;
  }).length;

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSessions = sessions.filter((s) => s.date && new Date(s.date) >= thirtyDaysAgo).length;

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
          Collection Overview
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Cigarette} label="Total Cigars" value={totalQty} />
        <StatCard
          icon={DollarSign}
          label="Est. Value"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        />
        <StatCard icon={Box} label="Humidors" value={humidors.length} />
        <StatCard icon={Heart} label="Favorites" value={favoriteCount} />
        <StatCard icon={Flame} label="Ready to Smoke" value={readyCount} />
        <StatCard icon={Clock} label="Recent Sessions" value={recentSessions} sub="Last 30 days" />
        {insights.runningLow.length > 0 && (
          <StatCard
            icon={TrendingDown}
            label="Running Low"
            value={insights.runningLow.length}
            sub="≤3 sticks"
          />
        )}
        {(insights.atRiskCigars.length > 0 || insights.humidorsNeedingAttention.length > 0) && (
          <StatCard
            icon={AlertTriangle}
            label="Needs Attention"
            value={insights.atRiskCigars.length + insights.humidorsNeedingAttention.length}
            sub="Cigars or humidors"
          />
        )}
      </div>

      {topBrands.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'rgba(224,216,200,0.55)' }}
          >
            Top Brands
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
