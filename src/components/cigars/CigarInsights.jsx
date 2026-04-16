import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Cigarette, DollarSign, BookOpen, Heart, ShieldAlert, Flame, Clock3 } from 'lucide-react';
import { summarizeCigarReadiness, generateCollectionInsights, INSIGHT_TYPES } from '@/platform/agingReadiness';
import { useCurrency } from '@/lib/currency/useCurrency';
import { formatCigarStrengthLabel } from '@/platform/cigarCatalog';
import { calculateCigarValue } from '@/utils/cigarValuation';
import CigarInsuranceExporter from '@/components/export/CigarInsuranceExporter';

const GOLD_PALETTE = ['#D4A574', '#B48C4B', '#8C6B3F', '#6B4F2E', '#F5D4A0', '#C4904A', '#A07840'];
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

function buildTopBrandsByAverageRating(cigars, minSessions = 1, n = 6) {
  const map = {};
  cigars.forEach((cigar) => {
    const brand = cigar?.brand;
    const rating = Number(cigar?.rating || 0);
    if (!brand || rating <= 0) return;
    if (!map[brand]) map[brand] = { sum: 0, count: 0 };
    map[brand].sum += rating;
    map[brand].count += 1;
  });
  return Object.entries(map)
    .filter(([, v]) => v.count >= minSessions)
    .map(([name, v]) => ({ name, value: Number((v.sum / v.count).toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
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

export default function CigarInsights({ user, cigars = [], sessions = [], humidors = [], snapshots = [] }) {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const { formatFromBase } = useCurrency();

  const valuationRows = React.useMemo(
    () =>
      cigars.map((c) => ({
        cigar: c,
        valuation: calculateCigarValue(c),
      })),
    [cigars]
  );

  const totalQty = cigars.reduce((s, c) => s + Number(c?.singles_equivalent ?? c?.quantity ?? 0), 0);
  const totalValue = valuationRows.reduce((sum, row) => sum + Number(row.valuation.estimatedTotalValue || 0), 0);
  const favorites = cigars.filter((c) => c?.is_favorite).length;
  const missingValuationCount = valuationRows.filter((row) => row.valuation.isMissing).length;
  const staleValuationCount = valuationRows.filter((row) => row.valuation.isStale).length;
  const highestValueCigars = valuationRows
    .filter((row) => Number(row.valuation.estimatedTotalValue || 0) > 0)
    .sort((a, b) => Number(b.valuation.estimatedTotalValue || 0) - Number(a.valuation.estimatedTotalValue || 0))
    .slice(0, 5);
  const highValueLowStock = valuationRows
    .filter((row) => {
      const qty = Number(row.cigar?.singles_equivalent ?? row.cigar?.quantity ?? 0);
      const value = Number(row.valuation.estimatedTotalValue || 0);
      return qty > 0 && qty <= 3 && value > 0;
    })
    .sort((a, b) => Number(b.valuation.estimatedTotalValue || 0) - Number(a.valuation.estimatedTotalValue || 0))
    .slice(0, 5);
  const [tonightRecommendations, setTonightRecommendations] = React.useState([]);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSessions = sessions.filter((s) => s?.date && new Date(s.date) >= thirtyDaysAgo);

  // Brand chart
  const brandData = buildTopN(cigars, 'brand', 8);
  const brandRatingData = buildTopBrandsByAverageRating(cigars, 2, 8);
  // Wrapper breakdown
  const wrapperData = buildTopN(cigars, 'wrapper', 7);
  const favoriteWrapperData = buildTopN(cigars.filter((c) => c.is_favorite), 'wrapper', 7);
  const lineData = buildTopN(cigars, 'line', 7);
  const vitolaData = buildTopN(cigars, 'vitola', 7);
  // Country of origin
  const originData = buildTopN(cigars, 'country_of_origin', 7);
  // Body distribution
  const bodyData = buildTopN(cigars, 'body', 6).map((d) => ({ ...d, name: formatCigarStrengthLabel(d.name) }));

  const acquisitionCounts = React.useMemo(() => ({
    wishlist: cigars.filter((c) => c?.wishlist).length,
    shopping: cigars.filter((c) => c?.shopping_list).length,
    restock: cigars.filter((c) => c?.restock_flag).length,
    notForMe: cigars.filter((c) => c?.not_for_me).length,
  }), [cigars]);

  const readySoonCount = React.useMemo(() => {
    return cigars.filter((c) => {
      if (!c?.ready_to_smoke_date) return false;
      const date = new Date(c.ready_to_smoke_date);
      if (Number.isNaN(date.getTime())) return false;
      const days = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 60;
    }).length;
  }, [cigars, today]);

  const sessionCountByCigarId = sessions.reduce((acc, s) => {
    if (!s?.cigar_id || s?.is_out_of_collection) return acc;
    acc[s.cigar_id] = (acc[s.cigar_id] || 0) + 1;
    return acc;
  }, {});
  const cigarNameById = cigars.reduce((acc, c) => {
    if (c?.id) acc[c.id] = [c.brand, c.name].filter(Boolean).join(' ') || c.name || 'Unknown';
    return acc;
  }, {});
  const mostSmokedData = Object.entries(sessionCountByCigarId)
    .map(([id, value]) => ({ name: cigarNameById[id] || 'Unknown Cigar', value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const lowStockFavorites = cigars
    .filter((c) => c.is_favorite && Number(c.singles_equivalent ?? c.quantity ?? 0) > 0)
    .filter((c) => Number(c.singles_equivalent ?? c.quantity ?? 0) <= Number(c.restock_threshold || 3))
    .sort((a, b) => Number(a.singles_equivalent ?? a.quantity ?? 0) - Number(b.singles_equivalent ?? b.quantity ?? 0))
    .slice(0, 5);

  const buyAgainCandidates = cigars
    .map((c) => {
      const linked = sessions.filter((s) => s.cigar_id === c.id && !s.is_out_of_collection);
      const rated = linked.filter((s) => Number(s.overall_enjoyment || 0) > 0);
      const avg = rated.length ? rated.reduce((sum, s) => sum + Number(s.overall_enjoyment || 0), 0) / rated.length : 0;
      const qty = Number(c.singles_equivalent ?? c.quantity ?? 0);
      return { cigar: c, avg, qty, sessions: linked.length };
    })
    .filter((x) => x.sessions >= 2 && x.avg >= 4 && x.qty <= Number(x.cigar.restock_threshold || 2))
    .sort((a, b) => b.avg - a.avg || a.qty - b.qty)
    .slice(0, 5);

  // Aging status — use the shared engine for consistency
  const readinessSummary = summarizeCigarReadiness(cigars, today);

  // Collection insights
  const collectionInsights = generateCollectionInsights(cigars, sessions, humidors, today).slice(0, 8);

  const recentSessionsSorted = [...recentSessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const tonightCandidates = React.useMemo(() => (
    cigars
      .filter((c) => Number(c?.singles_equivalent ?? c?.quantity ?? 0) > 0 && !c?.not_for_me && c?.ai_excluded !== true)
      .map((c) => {
        const linked = sessions.filter((s) => s.cigar_id === c.id && !s.is_out_of_collection);
        const rated = linked.filter((s) => Number(s.overall_enjoyment || 0) > 0);
        const avgSessionRating = rated.length
          ? rated.reduce((sum, s) => sum + Number(s.overall_enjoyment || 0), 0) / rated.length
          : 0;
        const lastSmoked = linked
          .filter((s) => !!s.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date;
        const daysSince = lastSmoked ? Math.floor((Date.now() - new Date(lastSmoked).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const qty = Number(c.singles_equivalent ?? c.quantity ?? 0);
        const rating = Number(c.rating || 0);
        const readyDate = c.ready_to_smoke_date ? new Date(c.ready_to_smoke_date) : null;
        const readyBonus = readyDate && !Number.isNaN(readyDate.getTime()) && readyDate <= today ? 1.5 : 0;
        const restBonus = daysSince > 45 ? 1.25 : daysSince > 21 ? 0.75 : 0;
        const preservePenalty = qty <= 1 ? -1.6 : qty <= 2 ? -0.9 : 0;
        const lowStockBoost = qty <= 2 && (rating >= 4.5 || avgSessionRating >= 4.5) ? 0.8 : 0;
        const score = (rating * 1.25) + (c.is_favorite ? 2.2 : 0) + (avgSessionRating * 1.35) + readyBonus + restBonus + preservePenalty + lowStockBoost;
        const reasons = [
          c.is_favorite ? 'Favorite' : null,
          avgSessionRating >= 4 ? `Sessions ${avgSessionRating.toFixed(1)}/5` : null,
          rating >= 4 ? `Rated ${rating}/5` : null,
          readyBonus > 0 ? 'Ready now' : null,
          daysSince > 30 ? 'Not smoked lately' : null,
          qty <= 2 ? 'Low stock' : null,
        ].filter(Boolean);
        return { cigar: c, score, reasons, daysSince };
      })
      .sort((a, b) => b.score - a.score || b.daysSince - a.daysSince)
  ), [cigars, sessions, today]);

  React.useEffect(() => {
    if (!tonightCandidates.length) {
      setTonightRecommendations([]);
      return;
    }
    const key = 'ck_tonight_pick_recent_ids_v1';
    const raw = localStorage.getItem(key);
    const recentIds = raw ? raw.split(',').filter(Boolean) : [];
    const pool = tonightCandidates.filter((item) => !recentIds.includes(item.cigar.id));
    const rankedPool = pool.length >= 3 ? pool : tonightCandidates;
    const diversified = [];
    const usedBrands = new Set();
    for (const [index, candidate] of rankedPool.entries()) {
      const brandKey = candidate?.cigar?.brand
        ? `brand:${candidate.cigar.brand}`
        : `fallback:${candidate?.cigar?.id || index}`;
      if (!usedBrands.has(brandKey) || diversified.length >= 2) {
        diversified.push(candidate);
        usedBrands.add(brandKey);
      }
      if (diversified.length >= 3) break;
    }
    const picks = diversified.length > 0 ? diversified : rankedPool.slice(0, 3);
    setTonightRecommendations(picks);
    const updatedRecent = [...new Set([...picks.map((p) => p.cigar.id), ...recentIds])].slice(0, 10);
    localStorage.setItem(key, updatedRecent.join(','));
  }, [tonightCandidates]);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Cigarette} label="Total Cigars" value={totalQty} />
        <StatTile
          icon={DollarSign}
          label="Est. Value"
          value={formatFromBase(totalValue)}
        />
        <StatTile icon={BookOpen} label="Sessions" value={sessions.length} />
        <StatTile icon={Heart} label="Favorites" value={favorites} />
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
      >
        <SectionHeading>Valuation Attention</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>Needs valuation</div>
            <div className="text-lg font-semibold text-[#F5F1E7]">{missingValuationCount}</div>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,75,0.12)' }}>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'rgba(224,216,200,0.55)' }}>Stale valuations</div>
            <div className="text-lg font-semibold text-[#F5F1E7]">{staleValuationCount}</div>
          </div>
        </div>
      </div>

      {(highestValueCigars.length > 0 || highValueLowStock.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {highestValueCigars.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}>
              <SectionHeading>Highest Value Cigars</SectionHeading>
              <div className="space-y-2">
                {highestValueCigars.map(({ cigar, valuation }) => (
                  <div key={cigar.id} className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-[#E0D8C8]">{[cigar.brand, cigar.name].filter(Boolean).join(' · ') || cigar.name || 'Unnamed'}</span>
                    <span className="text-[#D4A574] font-semibold">{formatFromBase(valuation.estimatedTotalValue || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {highValueLowStock.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}>
              <SectionHeading>High Value / Low Stock</SectionHeading>
              <div className="space-y-2">
                {highValueLowStock.map(({ cigar, valuation }) => (
                  <div key={cigar.id} className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-[#E0D8C8]">
                      {[cigar.brand, cigar.name].filter(Boolean).join(' · ') || cigar.name || 'Unnamed'} ({Number(cigar.singles_equivalent ?? cigar.quantity ?? 0)})
                    </span>
                    <span className="text-[#D4A574] font-semibold">{formatFromBase(valuation.estimatedTotalValue || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {brandData.length > 0 && (
          <MiniChart data={brandData} title="Top Brands" horizontal />
        )}
        {brandRatingData.length > 0 && (
          <MiniChart data={brandRatingData} title="Top Brands by Avg Rating" horizontal />
        )}
        {wrapperData.length > 0 && (
          <MiniPie data={wrapperData} title="Wrapper Breakdown" />
        )}
        {favoriteWrapperData.length > 0 && (
          <MiniPie data={favoriteWrapperData} title="Favorite Wrappers" />
        )}
        {lineData.length > 0 && (
          <MiniChart data={lineData} title="Top Lines" horizontal />
        )}
        {vitolaData.length > 0 && (
          <MiniChart data={vitolaData} title="Top Vitolas" />
        )}
        {originData.length > 0 && (
          <MiniPie data={originData} title="Country of Origin" />
        )}
        {bodyData.length > 0 && (
          <MiniChart data={bodyData} title="Body Distribution" />
        )}
        {mostSmokedData.length > 0 && (
          <MiniChart data={mostSmokedData} title="Most Smoked Cigars" horizontal />
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
              <div className="text-2xl font-bold text-[#F5F1E7]">{readySoonCount}</div>
              <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.85)' }}>
                Ready Soon
              </div>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(224,100,80,0.1)', border: '1px solid rgba(224,100,80,0.25)' }}
            >
              <div className="text-2xl font-bold text-[#F5F1E7]">{readinessSummary.aging + readinessSummary.pastPeak}</div>
              <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,100,80,0.8)' }}>
                Still Resting / Risk
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acquisition-state clarity */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
      >
        <SectionHeading>Acquisition States</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.3)' }}>
            <p className="text-xs uppercase tracking-wide text-[#E0D8C8]/70">Wishlist</p>
            <p className="text-lg font-semibold text-[#F5F1E7]">{acquisitionCounts.wishlist}</p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(76,120,180,0.14)', border: '1px solid rgba(76,120,180,0.3)' }}>
            <p className="text-xs uppercase tracking-wide text-[#E0D8C8]/70">Shopping List</p>
            <p className="text-lg font-semibold text-[#F5F1E7]">{acquisitionCounts.shopping}</p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(224,160,80,0.14)', border: '1px solid rgba(224,160,80,0.3)' }}>
            <p className="text-xs uppercase tracking-wide text-[#E0D8C8]/70">Restock</p>
            <p className="text-lg font-semibold text-[#F5F1E7]">{acquisitionCounts.restock}</p>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(224,100,80,0.14)', border: '1px solid rgba(224,100,80,0.3)' }}>
            <p className="text-xs uppercase tracking-wide text-[#E0D8C8]/70">Not for Me</p>
            <p className="text-lg font-semibold text-[#F5F1E7]">{acquisitionCounts.notForMe}</p>
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(224,216,200,0.55)' }}>
          Wishlist = curious, Shopping List = planning to buy soon, Restock = replacing favorites, Not for Me = excluded from recommendations.
        </p>
      </div>

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
              const displayLabel =
                insight.type === INSIGHT_TYPES.SMOKE_NOW ? 'Ready Now' :
                insight.type === INSIGHT_TYPES.REST_LONGER ? 'Still Resting' :
                insight.type === INSIGHT_TYPES.NEGLECTED ? 'Neglected Gem' :
                insight.type === INSIGHT_TYPES.FAST_DEPLETING ? 'Low-Stock Favorite' :
                insight.label;
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
                        {displayLabel}
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

      {/* Recommendations */}
      {tonightRecommendations.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
        >
          <SectionHeading>What should I smoke tonight?</SectionHeading>
          <div className="space-y-2">
            {tonightRecommendations.map(({ cigar, reasons }) => (
              <div key={cigar.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                <p className="text-sm font-semibold text-[#F5F1E7]">{[cigar.brand, cigar.name].filter(Boolean).join(' ')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.58)' }}>{reasons.join(' · ') || 'Balanced pick from your collection'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(lowStockFavorites.length > 0 || buyAgainCandidates.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {lowStockFavorites.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
            >
              <SectionHeading>Low Stock Favorites</SectionHeading>
              <div className="space-y-2">
                {lowStockFavorites.map((c) => (
                  <div key={c.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <p className="text-sm font-semibold text-[#F5F1E7]">{[c.brand, c.name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.58)' }}>
                      {Number(c.singles_equivalent ?? c.quantity ?? 0)} left · Threshold {Number(c.restock_threshold || 3)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {buyAgainCandidates.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
            >
              <SectionHeading>Buy Again Candidates</SectionHeading>
              <div className="space-y-2">
                {buyAgainCandidates.map(({ cigar, avg, qty }) => (
                  <div key={cigar.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <p className="text-sm font-semibold text-[#F5F1E7]">{[cigar.brand, cigar.name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.58)' }}>
                      Session avg {avg.toFixed(1)}/5 · {qty} left
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Insurance / Export */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
      >
        <SectionHeading>Insurance &amp; Export Reports</SectionHeading>
        <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.55)' }}>
          Generate insurer-ready exports with values, quantities, storage locations, and a generated date.
        </p>
        <CigarInsuranceExporter user={user} cigars={cigars} humidors={humidors} />
      </div>
    </div>
  );
}
