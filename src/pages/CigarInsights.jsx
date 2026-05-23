import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';
import { Cigarette, BookOpen, Heart, DollarSign, TrendingUp, ShieldAlert, Flame, Clock3 } from 'lucide-react';
import { calculateCigarValue } from '@/lib/valuation/cigarValuation';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useLocaleFormatting } from '@/components/utils/localeFormatters';
import { summarizeCigarReadiness, generateCollectionInsights, INSIGHT_TYPES } from '@/platform/agingReadiness';
import { formatCigarStrengthLabel } from '@/platform/cigarCatalog';
import CigarInsuranceExporter from '@/components/export/CigarInsuranceExporter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  InsightsPageShell,
  InsightsHeader,
  InsightsTabBar,
  InsightsKpiGrid,
  InsightStatCard,
  InsightsHighlightGrid,
  InsightsHighlightCard,
  InsightPanel,
  InsightsEmptyState,
  InsightsSessionPanel,
  InsightSectionHeading,
  InsightsChartTooltip,
} from '@/components/insights/InsightsShell';
import { GOLD_PALETTE, MODULE_ACCENTS } from '@/lib/theme/tokens';
import { buildTopN } from '@/lib/analytics/aggregateUtils';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';

// ── Constants ────────────────────────────────────────────────────────────────

const INSIGHT_CONFIG = {
  [INSIGHT_TYPES.SMOKE_NOW]:      { icon: Flame,       color: '#6FCF97', label: 'Smoke Now' },
  [INSIGHT_TYPES.REST_LONGER]:    { icon: Clock3,      color: '#D4A574', label: 'Rest Longer' },
  [INSIGHT_TYPES.AT_RISK]:        { icon: ShieldAlert, color: '#E07060', label: 'At Risk' },
  [INSIGHT_TYPES.NEGLECTED]:      { icon: Clock3,      color: 'rgba(224,216,200,0.55)', label: 'Neglected' },
  [INSIGHT_TYPES.OVERSTOCKED]:    { icon: Cigarette,   color: '#B48C4B', label: 'Overstocked' },
  [INSIGHT_TYPES.FAST_DEPLETING]: { icon: Flame,       color: '#E0B450', label: 'Running Low' },
};

function buildTopBrandsByAvgRating(cigars, minSessions = 1, n = 6) {
  const map = {};
  cigars.forEach((c) => {
    const brand = c?.brand;
    const rating = Number(c?.rating || 0);
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
    <InsightPanel>
      <InsightSectionHeading>{title}</InsightSectionHeading>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 0, right: 8, bottom: 0, left: horizontal ? 80 : 0 }}>
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
          <Tooltip content={<InsightsChartTooltip />} cursor={{ fill: 'rgba(180,140,75,0.08)' }} />
          <Bar dataKey="value" radius={[4, 4, 4, 4]}>
            {data.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </InsightPanel>
  );
}

function MiniPie({ data, title }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <InsightPanel>
      <InsightSectionHeading>{title}</InsightSectionHeading>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
            </Pie>
            <Tooltip content={<InsightsChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.slice(0, 6).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: GOLD_PALETTE[i % GOLD_PALETTE.length] }} />
              <span className="text-[#F5F1E7] truncate flex-1">{d.name}</span>
              <span style={{ color: 'rgba(224,216,200,0.55)' }}>{total > 0 ? `${Math.round((d.value / total) * 100)}%` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </InsightPanel>
  );
}

function InsightRow({ insight }) {
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
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{displayLabel}</span>
          <span className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>{insight.cigarName}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{insight.detail}</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function CigarInsightsInner() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const { formatDate } = useLocaleFormatting();
  const [activeTab, setActiveTab] = useState('summary');
  const [calSelectedDate, setCalSelectedDate] = useState(toLocalDateYmd(new Date()));
  const tabs = useMemo(() => ([
    { key: 'summary', label: t('insightsTabs.summary') },
    { key: 'value', label: t('insightsTabs.value') },
    { key: 'usage', label: t('insightsTabs.usage') },
    { key: 'statistics', label: t('insightsTabs.statistics') },
    { key: 'trends', label: t('insightsTabs.trends') },
    { key: 'reports', label: t('insightsTabs.reports') },
    { key: 'sessions', label: t('insightsTabs.sessions') },
  ]), [t]);

  const { data: cigars = [], isLoading: cigarsLoading } = useQuery({
    queryKey: QUERY_KEYS.cigars(user?.email),
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Cigar.filter({ created_by: user?.email }, '-created_date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.COLLECTION,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: QUERY_KEYS.cigarSessions(user?.email),
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CigarSession.filter({ created_by: user?.email }, '-date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.SESSION_HISTORY,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: QUERY_KEYS.humidors(user?.email),
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.HumidorLocation.filter({ created_by: user?.email }).catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.COLLECTION,
  });

  // ── Derived data ────────────────────────────────────────────────────────────

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const valuationRows = useMemo(() => cigars.map(c => ({ cigar: c, valuation: calculateCigarValue(c) })), [cigars]);
  const totalQty = cigars.reduce((s, c) => s + Number(c?.singles_equivalent ?? c?.quantity ?? 0), 0);
  const totalValue = valuationRows.reduce((sum, r) => sum + Number(r.valuation.estimatedTotalValue || 0), 0);
  const valuedCount = valuationRows.filter(r => !r.valuation.isMissing).length;
  const favorites = cigars.filter(c => c?.is_favorite).length;
  const missingValuationCount = valuationRows.filter(r => r.valuation.isMissing).length;
  const staleValuationCount = valuationRows.filter(r => r.valuation.isStale).length;

  const highestValueCigars = useMemo(() => valuationRows
    .filter(r => Number(r.valuation.estimatedTotalValue || 0) > 0)
    .sort((a, b) => Number(b.valuation.estimatedTotalValue || 0) - Number(a.valuation.estimatedTotalValue || 0))
    .slice(0, 5), [valuationRows]);

  const highValueLowStock = useMemo(() => valuationRows
    .filter(r => {
      const qty = Number(r.cigar?.singles_equivalent ?? r.cigar?.quantity ?? 0);
      return qty > 0 && qty <= 3 && Number(r.valuation.estimatedTotalValue || 0) > 0;
    })
    .sort((a, b) => Number(b.valuation.estimatedTotalValue || 0) - Number(a.valuation.estimatedTotalValue || 0))
    .slice(0, 5), [valuationRows]);

  const lowStockFavorites = useMemo(() => cigars
    .filter(c => c.is_favorite && Number(c.singles_equivalent ?? c.quantity ?? 0) > 0)
    .filter(c => Number(c.singles_equivalent ?? c.quantity ?? 0) <= Number(c.restock_threshold || 3))
    .sort((a, b) => Number(a.singles_equivalent ?? a.quantity ?? 0) - Number(b.singles_equivalent ?? b.quantity ?? 0))
    .slice(0, 5), [cigars]);

  const sessionCountByCigarId = useMemo(() => sessions.reduce((acc, s) => {
    if (!s?.cigar_id || s?.is_out_of_collection) return acc;
    acc[s.cigar_id] = (acc[s.cigar_id] || 0) + 1;
    return acc;
  }, {}), [sessions]);

  const cigarNameById = useMemo(() => cigars.reduce((acc, c) => {
    if (c?.id) acc[c.id] = [c.brand, c.name].filter(Boolean).join(' ') || c.name || 'Unknown';
    return acc;
  }, {}), [cigars]);

  const mostSmokedData = useMemo(() =>
    Object.entries(sessionCountByCigarId)
      .map(([id, value]) => ({ name: cigarNameById[id] || 'Unknown Cigar', value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7),
    [sessionCountByCigarId, cigarNameById]);

  const buyAgainCandidates = useMemo(() => cigars
    .map(c => {
      const linked = sessions.filter(s => s.cigar_id === c.id && !s.is_out_of_collection);
      const rated = linked.filter(s => Number(s.overall_enjoyment || 0) > 0);
      const avg = rated.length ? rated.reduce((sum, s) => sum + Number(s.overall_enjoyment || 0), 0) / rated.length : 0;
      const qty = Number(c.singles_equivalent ?? c.quantity ?? 0);
      return { cigar: c, avg, qty, sessions: linked.length };
    })
    .filter(x => x.sessions >= 2 && x.avg >= 4 && x.qty <= Number(x.cigar.restock_threshold || 2))
    .sort((a, b) => b.avg - a.avg || a.qty - b.qty)
    .slice(0, 5), [cigars, sessions]);

  const collectionInsights = useMemo(() => generateCollectionInsights(cigars, sessions, humidors, today).slice(0, 8), [cigars, sessions, humidors, today]);

  const readinessSummary = useMemo(() => summarizeCigarReadiness(cigars, today), [cigars, today]);

  const readySoonCount = useMemo(() => cigars.filter(c => {
    if (!c?.ready_to_smoke_date) return false;
    const date = new Date(c.ready_to_smoke_date);
    if (Number.isNaN(date.getTime())) return false;
    const days = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  }).length, [cigars, today]);

  const acquisitionCounts = useMemo(() => ({
    wishlist: cigars.filter(c => c?.wishlist).length,
    shopping: cigars.filter(c => c?.shopping_list).length,
    restock: cigars.filter(c => c?.restock_flag).length,
    notForMe: cigars.filter(c => c?.not_for_me).length,
  }), [cigars]);

  const tonightCandidates = useMemo(() => cigars
    .filter(c => Number(c?.singles_equivalent ?? c?.quantity ?? 0) > 0 && !c?.not_for_me && c?.ai_excluded !== true)
    .map(c => {
      const linked = sessions.filter(s => s.cigar_id === c.id && !s.is_out_of_collection);
      const rated = linked.filter(s => Number(s.overall_enjoyment || 0) > 0);
      const avgSessionRating = rated.length ? rated.reduce((sum, s) => sum + Number(s.overall_enjoyment || 0), 0) / rated.length : 0;
      const lastSmoked = linked.filter(s => !!s.date).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date;
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
    .slice(0, 3), [cigars, sessions, today]);

  const thirtyDaysAgo = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() - 30); return d; }, [today]);
  const recentSessions = useMemo(() => sessions.filter(s => s?.date && new Date(s.date) >= thirtyDaysAgo), [sessions, thirtyDaysAgo]);
  const recentSessionsSorted = useMemo(() => [...recentSessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10), [recentSessions]);

  // Chart data for Statistics tab
  const brandData       = useMemo(() => buildTopN(cigars, 'brand', 8), [cigars]);
  const brandRatingData = useMemo(() => buildTopBrandsByAvgRating(cigars, 2, 8), [cigars]);
  const wrapperData     = useMemo(() => buildTopN(cigars, 'wrapper', 7), [cigars]);
  const favWrapperData  = useMemo(() => buildTopN(cigars.filter(c => c.is_favorite), 'wrapper', 7), [cigars]);
  const lineData        = useMemo(() => buildTopN(cigars, 'line', 7), [cigars]);
  const vitolaData      = useMemo(() => buildTopN(cigars, 'vitola', 7), [cigars]);
  const originData      = useMemo(() => buildTopN(cigars, 'country_of_origin', 7), [cigars]);
  const bodyData        = useMemo(() => buildTopN(cigars, 'body', 6).map(d => ({ ...d, name: formatCigarStrengthLabel(d.name) })), [cigars]);

  // Highlight cards derived data (for Summary)
  const topValueCigar = highestValueCigars[0];
  const favCigar = cigars.find(c => c.is_favorite);
  const lowStockFav = lowStockFavorites[0];
  const mostSmokedCigar = useMemo(() => {
    if (!mostSmokedData.length) return null;
    return cigars.find(c => cigarNameById[c.id] === mostSmokedData[0]?.name) || null;
  }, [mostSmokedData, cigars, cigarNameById]);

  // Session calendar
  const cigarSessionRows = useMemo(() => (sessions || []).map(s => ({
    id: `cigar_${s.id}`, moduleType: 'cigar', date: s.date,
    itemLabel: s.cigar_name || [s.external_cigar_brand, s.external_cigar_name].filter(Boolean).join(' ') || 'Cigar session',
    rating: s.overall_enjoyment ?? null, notes: s.notes || '',
  })), [sessions]);

  const { byDate: cigarByDate, highlightedDates: cigarHighlights } = useMemo(
    () => buildSessionCalendarData(cigarSessionRows, 'cigar'),
    [cigarSessionRows]
  );
  const cigarSelectedDayRows = useMemo(() => cigarByDate[calSelectedDate] || [], [cigarByDate, calSelectedDate]);

  const isLoading = cigarsLoading || sessionsLoading;
  const hasCigars = cigars.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <InsightsPageShell>
      <CigarKeeperModuleNav currentPageName="CigarInsights" />
      <InsightsHeader
        title="CigarKeeper Insights"
        subtitle="Analytics and trends from your cigar collection and sessions"
      />

      <InsightsTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} activeAccent={MODULE_ACCENTS.cigarkeeper} />

      {/* ── SUMMARY ─────────────────────────────────────────────────────── */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Cigars"  value={totalQty}                                                   icon={Cigarette}   accent="#B48C4B" />
            <InsightStatCard label="Est. Value"    value={valuedCount > 0 ? formatFromBase(totalValue) : '—'}         icon={DollarSign}  accent="#D4A574" />
            <InsightStatCard label="Sessions"      value={sessions.length}                                            icon={BookOpen}    accent="#8B5CF6" />
            <InsightStatCard label="Favorites"     value={favorites}                                                  icon={Heart}       accent="#f87171" />
          </InsightsKpiGrid>

          {!isLoading && hasCigars ? (
            <>
              <InsightsHighlightGrid>
                {topValueCigar && (
                  <InsightsHighlightCard
                    title="Highest Value"
                    value={[topValueCigar.cigar.brand, topValueCigar.cigar.name].filter(Boolean).join(' ')}
                    subtitle={formatFromBase(topValueCigar.valuation.estimatedTotalValue || 0)}
                    accent="#D4A574"
                    photo={topValueCigar.cigar.photos?.[0]}
                  />
                )}
                {favCigar && (
                  <InsightsHighlightCard
                    title="Favorite Cigar"
                    value={[favCigar.brand, favCigar.name].filter(Boolean).join(' ')}
                    subtitle={favCigar.wrapper ? `Wrapper: ${favCigar.wrapper}` : undefined}
                    accent="#f87171"
                    photo={favCigar.photos?.[0]}
                  />
                )}
                {lowStockFav && (
                  <InsightsHighlightCard
                    title="Low Stock Favorite"
                    value={[lowStockFav.brand, lowStockFav.name].filter(Boolean).join(' ')}
                    subtitle={`${Number(lowStockFav.singles_equivalent ?? lowStockFav.quantity ?? 0)} cigars left`}
                    accent="#E0B450"
                    photo={lowStockFav.photos?.[0]}
                  />
                )}
                {mostSmokedCigar && (
                  <InsightsHighlightCard
                    title="Most Smoked"
                    value={[mostSmokedCigar.brand, mostSmokedCigar.name].filter(Boolean).join(' ')}
                    subtitle={`${sessionCountByCigarId[mostSmokedCigar.id] || 0} sessions logged`}
                    accent="#B48C4B"
                    photo={mostSmokedCigar.photos?.[0]}
                  />
                )}
                {readinessSummary.readyNow > 0 && (
                  <InsightsHighlightCard
                    title="Ready to Smoke"
                    value={`${readinessSummary.readyNow} cigar${readinessSummary.readyNow !== 1 ? 's' : ''}`}
                    subtitle="In your drinking window"
                    accent="#6FCF97"
                  />
                )}
                {sessions.length > 0 && (
                  <InsightsHighlightCard
                    title="30-Day Sessions"
                    value={`${recentSessions.length} session${recentSessions.length !== 1 ? 's' : ''}`}
                    subtitle="In the last 30 days"
                    accent="#8B5CF6"
                  />
                )}
              </InsightsHighlightGrid>
            </>
          ) : !isLoading ? (
            <InsightsEmptyState message="Add cigars to your collection to see insights." icon={Cigarette} />
          ) : null}
        </div>
      )}

      {/* ── VALUE ───────────────────────────────────────────────────────── */}
      {activeTab === 'value' && (
        <div className="space-y-5">
          {!hasCigars ? (
            <InsightsEmptyState message="Add cigars to see value insights." icon={DollarSign} />
          ) : (
            <>
              <InsightsKpiGrid>
                <InsightStatCard label="Est. Collection Value" value={valuedCount > 0 ? formatFromBase(totalValue) : '—'} icon={DollarSign} accent="#D4A574" />
                <InsightStatCard label="Valued Cigars"         value={valuedCount}                                        icon={Cigarette}  accent="#B48C4B" />
                <InsightStatCard label="Needs Valuation"       value={missingValuationCount}                              icon={ShieldAlert} accent="#E07060" />
                <InsightStatCard label="Stale Valuations"      value={staleValuationCount}                                icon={Clock3}     accent="#E0B450" />
              </InsightsKpiGrid>

              {(highestValueCigars.length > 0 || highValueLowStock.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {highestValueCigars.length > 0 && (
                    <InsightPanel>
                      <InsightSectionHeading>Highest Value Cigars</InsightSectionHeading>
                      <div className="space-y-2">
                        {highestValueCigars.map(({ cigar, valuation }) => (
                          <div key={cigar.id} className="flex justify-between gap-3 text-sm">
                            <span className="truncate text-[#E0D8C8]">{[cigar.brand, cigar.name].filter(Boolean).join(' · ') || 'Unnamed'}</span>
                            <span className="text-[#D4A574] font-semibold">{formatFromBase(valuation.estimatedTotalValue || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </InsightPanel>
                  )}
                  {highValueLowStock.length > 0 && (
                    <InsightPanel>
                      <InsightSectionHeading>High Value / Low Stock</InsightSectionHeading>
                      <div className="space-y-2">
                        {highValueLowStock.map(({ cigar, valuation }) => (
                          <div key={cigar.id} className="flex justify-between gap-3 text-sm">
                            <span className="truncate text-[#E0D8C8]">
                              {[cigar.brand, cigar.name].filter(Boolean).join(' · ')} ({Number(cigar.singles_equivalent ?? cigar.quantity ?? 0)})
                            </span>
                            <span className="text-[#D4A574] font-semibold">{formatFromBase(valuation.estimatedTotalValue || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </InsightPanel>
                  )}
                </div>
              )}

              <InsightPanel>
                <InsightSectionHeading>Valuation Attention</InsightSectionHeading>
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
              </InsightPanel>
            </>
          )}
        </div>
      )}

      {/* ── USAGE ───────────────────────────────────────────────────────── */}
      {activeTab === 'usage' && (
        <div className="space-y-5">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Sessions" value={sessions.length}        icon={BookOpen} accent="#8B5CF6" />
            <InsightStatCard label="Last 30 Days"   value={recentSessions.length}  icon={BookOpen} accent="#D4A574" />
            <InsightStatCard label="Low Stock Favs" value={lowStockFavorites.length} icon={Heart}  accent="#f87171" />
            <InsightStatCard label="Ready to Smoke" value={readinessSummary.readyNow} icon={Flame}  accent="#6FCF97" />
          </InsightsKpiGrid>

          {/* Acquisition states */}
          <InsightPanel>
            <InsightSectionHeading>Acquisition States</InsightSectionHeading>
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
          </InsightPanel>

          {/* Tonight recommendations */}
          {tonightCandidates.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading>What should I smoke tonight?</InsightSectionHeading>
              <div className="space-y-2">
                {tonightCandidates.map(({ cigar, reasons }) => (
                  <div key={cigar.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <p className="text-sm font-semibold text-[#F5F1E7]">{[cigar.brand, cigar.name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.58)' }}>{reasons.join(' · ') || 'Balanced pick from your collection'}</p>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {/* Collection insights */}
          {collectionInsights.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading>Collection Insights</InsightSectionHeading>
              <div className="space-y-2">
                {collectionInsights.map(insight => <InsightRow key={`${insight.cigarId}-${insight.type}`} insight={insight} />)}
              </div>
            </InsightPanel>
          )}

          {/* Low Stock Favorites + Buy Again side by side */}
          {(lowStockFavorites.length > 0 || buyAgainCandidates.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {lowStockFavorites.length > 0 && (
                <InsightPanel>
                  <InsightSectionHeading>Low Stock Favorites</InsightSectionHeading>
                  <div className="space-y-2">
                    {lowStockFavorites.map(c => (
                      <div key={c.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                        <p className="text-sm font-semibold text-[#F5F1E7]">{[c.brand, c.name].filter(Boolean).join(' ')}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.58)' }}>
                          {Number(c.singles_equivalent ?? c.quantity ?? 0)} left · Threshold {Number(c.restock_threshold || 3)}
                        </p>
                      </div>
                    ))}
                  </div>
                </InsightPanel>
              )}
              {buyAgainCandidates.length > 0 && (
                <InsightPanel>
                  <InsightSectionHeading>Buy Again Candidates</InsightSectionHeading>
                  <div className="space-y-2">
                    {buyAgainCandidates.map(({ cigar, avg, qty }) => (
                      <div key={cigar.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                        <p className="text-sm font-semibold text-[#F5F1E7]">{[cigar.brand, cigar.name].filter(Boolean).join(' ')}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.58)' }}>Session avg {avg.toFixed(1)}/5 · {qty} left</p>
                      </div>
                    ))}
                  </div>
                </InsightPanel>
              )}
            </div>
          )}

          {/* Recent sessions */}
          {recentSessionsSorted.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading>Recent Sessions</InsightSectionHeading>
              <div className="space-y-2">
                {recentSessionsSorted.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#F5F1E7] truncate">{s.cigar_name || s.external_cigar_name || 'Unknown Cigar'}</p>
                      <p className="text-xs text-[#E0D8C8]/50 mt-0.5">
                        {s.date}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}{s.location ? ` · ${s.location}` : ''}
                      </p>
                    </div>
                    {s.overall_enjoyment > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="text-xs" style={{ color: i < s.overall_enjoyment ? '#D4A574' : 'rgba(180,140,75,0.25)' }}>★</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {sessions.length === 0 && (
            <InsightsEmptyState message="Log cigar sessions to see usage insights." icon={BookOpen} />
          )}
        </div>
      )}

      {/* ── STATISTICS ──────────────────────────────────────────────────── */}
      {activeTab === 'statistics' && (
        <div className="space-y-5">
          {!hasCigars ? (
            <InsightsEmptyState message="Add cigars to see collection statistics." icon={Cigarette} />
          ) : (
            <>
              {/* Aging status */}
              {(readinessSummary.readyNow > 0 || readinessSummary.aging > 0 || readinessSummary.pastPeak > 0) && (
                <InsightPanel>
                  <InsightSectionHeading>Aging Status</InsightSectionHeading>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)' }}>
                      <div className="text-2xl font-bold text-[#F5F1E7]">{readinessSummary.readyNow}</div>
                      <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(76,175,130,0.85)' }}>Ready Now</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.3)' }}>
                      <div className="text-2xl font-bold text-[#F5F1E7]">{readySoonCount}</div>
                      <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.85)' }}>Ready Soon</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(224,100,80,0.1)', border: '1px solid rgba(224,100,80,0.25)' }}>
                      <div className="text-2xl font-bold text-[#F5F1E7]">{readinessSummary.aging + readinessSummary.pastPeak}</div>
                      <div className="text-xs mt-1 font-semibold uppercase tracking-wide" style={{ color: 'rgba(224,100,80,0.8)' }}>Still Resting / Risk</div>
                    </div>
                  </div>
                </InsightPanel>
              )}

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <MiniChart data={brandData}       title="Top Brands"                  horizontal />
                <MiniChart data={brandRatingData} title="Top Brands by Avg Rating"    horizontal />
                <MiniPie   data={wrapperData}     title="Wrapper Breakdown" />
                <MiniPie   data={favWrapperData}  title="Favorite Wrappers" />
                <MiniChart data={lineData}        title="Top Lines"                   horizontal />
                <MiniChart data={vitolaData}      title="Top Vitolas" />
                <MiniPie   data={originData}      title="Country of Origin" />
                <MiniChart data={bodyData}        title="Body Distribution" />
                <MiniChart data={mostSmokedData}  title="Most Smoked Cigars"          horizontal />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TRENDS ──────────────────────────────────────────────────────── */}
      {activeTab === 'trends' && (
        <div className="space-y-5">
          {sessions.length === 0 && cigars.length === 0 ? (
            <InsightsEmptyState message="Add cigars and log sessions to see trends." icon={TrendingUp} />
          ) : (
            <>
              <InsightsKpiGrid>
                <InsightStatCard icon={BookOpen}  label="Total Sessions"    value={sessions.length}                  accent="#8B5CF6" />
                <InsightStatCard icon={Cigarette} label="Cigars Tracked"    value={cigars.length}                    accent="#B48C4B" />
                <InsightStatCard icon={Heart}     label="Favorites"         value={favorites}                        accent="#f87171" />
                <InsightStatCard icon={DollarSign} label="Collection Value" value={formatFromBase(Math.round(totalValue))} accent="#D4A574" />
              </InsightsKpiGrid>

              <InsightPanel>
                <InsightSectionHeading>Session Activity</InsightSectionHeading>
                {sessions.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {[...sessions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 30).map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(180,140,75,0.06)', border: '1px solid rgba(180,140,75,0.12)' }}>
                        <div>
                          <p className="text-sm font-medium text-[#F5F1E7]">
                            {s.cigar_name || [s.external_cigar_brand, s.external_cigar_name].filter(Boolean).join(' ') || 'Cigar session'}
                          </p>
                          <p className="text-xs" style={{ color: 'rgba(216,199,166,0.65)' }}>{s.date ? formatDate(s.date) : t('insightsShared.unknownDate')}</p>
                        </div>
                        {s.overall_enjoyment != null && (
                          <p className="text-sm font-semibold text-[#F5F1E7]">★ {s.overall_enjoyment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(224,216,200,0.55)', fontSize: '0.9375rem' }}>More session history is needed to show trends.</p>
                )}
              </InsightPanel>
            </>
          )}
        </div>
      )}

      {/* ── REPORTS ─────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-5">
          {!hasCigars ? (
            <InsightsEmptyState message="Add cigars to generate reports." icon={Cigarette} />
          ) : (
            <InsightPanel>
              <InsightSectionHeading>Insurance &amp; Export Reports</InsightSectionHeading>
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.55)' }}>
                Generate insurer-ready exports with values, quantities, storage locations, and a generated date.
              </p>
              <CigarInsuranceExporter user={user} cigars={cigars} humidors={humidors} />
            </InsightPanel>
          )}
        </div>
      )}

      {/* ── SESSIONS ────────────────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        sessions.length === 0 ? (
          <InsightsEmptyState message="Log cigar sessions to see session history." icon={BookOpen} />
        ) : (
          <InsightsSessionPanel
            calendar={
              <Calendar
                mode="single"
                selected={new Date(`${calSelectedDate}T12:00:00`)}
                onSelect={date => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
                modifiers={{ hasSessions: cigarHighlights }}
                modifiersClassNames={{ hasSessions: 'ring-1 ring-[#B48C4B] ring-offset-0' }}
              />
            }
            selectedDate={calSelectedDate}
            onSelectDate={setCalSelectedDate}
            dayRows={cigarSelectedDayRows}
            emptyLabel="No sessions logged for this day."
          />
        )
      )}
    </InsightsPageShell>
  );
}

export default function CigarInsightsPage() {
  return <CigarInsightsInner />;
}