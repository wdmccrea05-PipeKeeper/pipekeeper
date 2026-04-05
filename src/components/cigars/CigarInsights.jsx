import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Cigarette, DollarSign, BookOpen, Heart, ShieldAlert, Flame, Clock3 } from 'lucide-react';
import { summarizeCigarReadiness, generateCollectionInsights, INSIGHT_TYPES } from '@/platform/agingReadiness';

const GOLD_PALETTE = ['#D4A574', '#B48C4B', '#8C6B3F', '#6B4F2E', '#F5D4A0', '#C4904A', '#A07840'];
const BODY_LABELS = {
  mild: 'Mild',
  mild_medium: 'Mild-Med',
  medium: 'Medium',
  medium_full: 'Med-Full',
  full: 'Full',
};

function SectionHeading({ children }) {
  return (
    <h3 style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
      {children}
    </h3>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.18)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))',
          border: '1px solid rgba(120,90,65,0.45)',
        }}
      >
        <Icon className="w-4 h-4" style={{ color: '#D4A574' }} />
      </div>
      <div>
        <div className="text-xl font-bold text-[#F5F1E7]">{value}</div>
        <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'rgba(224,216,200,0.55)' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm"
      style={{
        background: 'rgba(40,28,18,0.98)',
        border: '1px solid rgba(180,140,75,0.3)',
        color: '#F5F1E7',
      }}
    >
      <p className="font-semibold">{payload[0].name || payload[0].payload?.name}</p>
      <p style={{ color: '#D4A574' }}>{payload[0].value}</p>
    </div>
  );
};

function buildTopN(arr, key, n = 7) {
  const counts = {};
  arr.forEach((item) => {
    const val = item[key];
    if (val) counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name, value }));
}

function MiniChart({ data, title, horizontal = false }) {
  if (!data.length) return null;
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
    >
      <SectionHeading>{title}</SectionHeading>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 0, right: 8, bottom: 0, left: horizontal ? 80 : 0 }}
        >
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: 'rgba(224,216,200,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(224,216,200,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(180,140,75,0.08)' }} />
          <Bar dataKey="value" radius={[4, 4, 4, 4]}>
            {data.map((_, i) => (
              <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniPie({ data, title }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
    >
      <SectionHeading>{title}</SectionHeading>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.slice(0, 6).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: GOLD_PALETTE[i % GOLD_PALETTE.length] }} />
              <span className="text-[#F5F1E7] truncate flex-1">{d.name}</span>
              <span style={{ color: 'rgba(224,216,200,0.55)' }}>
                {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const INSIGHT_CONFIG = {
  [INSIGHT_TYPES.SMOKE_NOW]:      { icon: Flame,       color: '#6FCF97', label: 'Smoke Now' },
  [INSIGHT_TYPES.REST_LONGER]:    { icon: Clock3,      color: '#D4A574', label: 'Rest Longer' },
  [INSIGHT_TYPES.AT_RISK]:        { icon: ShieldAlert, color: '#E07060', label: 'At Risk' },
  [INSIGHT_TYPES.NEGLECTED]:      { icon: Clock3,      color: 'rgba(224,216,200,0.55)', label: 'Neglected' },
  [INSIGHT_TYPES.OVERSTOCKED]:    { icon: Cigarette,   color: '#B48C4B', label: 'Overstocked' },
  [INSIGHT_TYPES.FAST_DEPLETING]: { icon: Flame,       color: '#E0B450', label: 'Running Low' },
};

export default function CigarInsights({ cigars = [], sessions = [], humidors = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalQty = cigars.reduce((s, c) => s + (c.singles_equivalent || c.quantity || 0), 0);
  const totalValue = cigars.reduce((s, c) => {
    const qty = c.singles_equivalent || c.quantity || 1;
    return s + (c.estimated_value || c.purchase_price || 0) * qty;
  }, 0);
  const favorites = cigars.filter((c) => c.is_favorite).length;

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSessions = sessions.filter((s) => s.date && new Date(s.date) >= thirtyDaysAgo);

  // Brand chart
  const brandData = buildTopN(cigars, 'brand', 8);
  // Wrapper breakdown
  const wrapperData = buildTopN(cigars, 'wrapper', 7);
  // Country of origin
  const originData = buildTopN(cigars, 'country_of_origin', 7);
  // Body distribution
  const bodyData = buildTopN(cigars, 'body', 6).map((d) => ({ ...d, name: BODY_LABELS[d.name] || d.name }));

  // Aging status — use the shared engine for consistency
  const readinessSummary = summarizeCigarReadiness(cigars, today);

  // Collection insights
  const collectionInsights = generateCollectionInsights(cigars, sessions, humidors, today).slice(0, 8);

  const recentSessionsSorted = [...recentSessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Cigarette} label="Total Cigars" value={totalQty} />
        <StatTile
          icon={DollarSign}
          label="Est. Value"
          value={`$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <StatTile icon={BookOpen} label="Sessions" value={sessions.length} />
        <StatTile icon={Heart} label="Favorites" value={favorites} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {brandData.length > 0 && (
          <MiniChart data={brandData} title="Top Brands" horizontal />
        )}
        {wrapperData.length > 0 && (
          <MiniPie data={wrapperData} title="Wrapper Breakdown" />
        )}
        {originData.length > 0 && (
          <MiniPie data={originData} title="Country of Origin" />
        )}
        {bodyData.length > 0 && (
          <MiniChart data={bodyData} title="Body Distribution" />
        )}
      </div>

      {/* Aging status — uses the shared readiness engine */}
      {(readinessSummary.readyNow > 0 || readinessSummary.aging > 0 || readinessSummary.pastPeak > 0) && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
        >
          <SectionHeading>Aging Status</SectionHeading>
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)' }}
            >
              <div className="text-2xl font-bold text-[#F5F1E7]">{readinessSummary.readyNow}</div>
              <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(76,175,130,0.85)' }}>
                Ready Now
              </div>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}
            >
              <div className="text-2xl font-bold text-[#F5F1E7]">{readinessSummary.aging}</div>
              <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.85)' }}>
                Still Aging
              </div>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(224,100,80,0.1)', border: '1px solid rgba(224,100,80,0.25)' }}
            >
              <div className="text-2xl font-bold text-[#F5F1E7]">{readinessSummary.pastPeak}</div>
              <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,100,80,0.8)' }}>
                Past Peak
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection insights */}
      {collectionInsights.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
        >
          <SectionHeading>Collection Insights</SectionHeading>
          <div className="space-y-2">
            {collectionInsights.map((insight) => {
              const cfg = INSIGHT_CONFIG[insight.type];
              const Icon = cfg?.icon || Cigarette;
              const color = cfg?.color || '#D4A574';
              return (
                <div
                  key={`${insight.cigarId}-${insight.type}`}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                        {insight.label}
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>
                        {insight.cigarName}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
                      {insight.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent sessions table */}
      {recentSessionsSorted.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
        >
          <SectionHeading>Recent Sessions</SectionHeading>
          <div className="space-y-2">
            {recentSessionsSorted.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F5F1E7] truncate">
                    {s.cigar_name || s.external_cigar_name || 'Unknown Cigar'}
                  </p>
                  <p className="text-xs text-[#E0D8C8]/50 mt-0.5">
                    {s.date}
                    {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                    {s.location ? ` · ${s.location}` : ''}
                  </p>
                </div>
                {s.overall_enjoyment > 0 && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="text-xs"
                        style={{ color: i < s.overall_enjoyment ? '#D4A574' : 'rgba(180,140,75,0.25)' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
