import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import CigarKeeperModuleNav from '@/components/modules/CigarKeeperModuleNav';
import CigarInsights from '@/components/cigars/CigarInsights';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';
import { Cigarette, BookOpen, Heart, DollarSign } from 'lucide-react';
import { calculateCigarValue } from '@/utils/cigarValuation';
import { useCurrency } from '@/lib/currency/useCurrency';
import {
  InsightsPageShell,
  InsightsHeader,
  InsightsTabBar,
  InsightsKpiGrid,
  InsightStatCard,
  InsightsEmptyState,
  InsightsSessionPanel,
} from '@/components/insights/InsightsShell';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'value', label: 'Value' },
  { key: 'usage', label: 'Usage' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'trends', label: 'Trends' },
  { key: 'reports', label: 'Reports' },
  { key: 'sessions', label: 'Sessions' },
];

function CigarInsightsInner() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const [activeTab, setActiveTab] = useState('summary');
  const [calSelectedDate, setCalSelectedDate] = useState(toLocalDateYmd(new Date()));

  const { data: cigars = [], isLoading: cigarsLoading } = useQuery({
    queryKey: ['cigars-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Cigar.filter({ created_by: user?.email }, '-created_date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['cigar-sessions-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CigarSession.filter({ created_by: user?.email }, '-date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.HumidorLocation.filter({ created_by: user?.email }).catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: valueSnapshots = [] } = useQuery({
    queryKey: ['cigar-value-snapshots-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ItemValueSnapshot.filter({ created_by: user?.email, module_key: 'cigarkeeper', item_type: 'cigar' }, '-snapshot_date', 1000).catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

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

  // KPI values
  const valuationRows = useMemo(() => cigars.map(c => ({ cigar: c, valuation: calculateCigarValue(c) })), [cigars]);
  const totalQty = cigars.reduce((s, c) => s + Number(c?.singles_equivalent ?? c?.quantity ?? 0), 0);
  const totalValue = valuationRows.reduce((sum, row) => sum + Number(row.valuation.estimatedTotalValue || 0), 0);
  const valuedCount = valuationRows.filter(r => !r.valuation.isMissing).length;
  const favorites = cigars.filter(c => c?.is_favorite).length;

  const isLoading = cigarsLoading || sessionsLoading;

  return (
    <InsightsPageShell>
      <CigarKeeperModuleNav currentPageName="CigarInsights" />
      <InsightsHeader
        title={t('nav.insights', 'Cigar Insights')}
        subtitle={t('cigars.insightsDescription', 'Analytics and trends from your cigar collection and sessions')}
      />

      <InsightsTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Cigars" value={totalQty} icon={Cigarette} accent="#B48C4B" />
            <InsightStatCard label="Est. Value" value={valuedCount > 0 ? formatFromBase(totalValue) : '—'} icon={DollarSign} accent="#D4A574" />
            <InsightStatCard label="Sessions" value={sessions.length} icon={BookOpen} accent="#8B5CF6" />
            <InsightStatCard label="Favorites" value={favorites} icon={Heart} accent="#f87171" />
          </InsightsKpiGrid>

          {!isLoading && cigars.length > 0 && (
            <CigarInsights user={user} cigars={cigars} sessions={sessions} humidors={humidors} snapshots={valueSnapshots} />
          )}
          {!isLoading && cigars.length === 0 && (
            <InsightsEmptyState message="Add cigars to your collection to see insights." icon={Cigarette} />
          )}
        </div>
      )}

      {/* VALUE */}
      {activeTab === 'value' && (
        <div className="space-y-4">
          {!isLoading && cigars.length > 0 ? (
            <CigarInsights user={user} cigars={cigars} sessions={sessions} humidors={humidors} snapshots={valueSnapshots} />
          ) : (
            <InsightsEmptyState message="Add cigars to see value insights." icon={DollarSign} />
          )}
        </div>
      )}

      {/* USAGE */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Sessions" value={sessions.length} icon={BookOpen} accent="#8B5CF6" />
            <InsightStatCard label="Last 30 Days" value={sessions.filter(s => s?.date && new Date(s.date) >= new Date(Date.now() - 30 * 86400000)).length} icon={BookOpen} accent="#D4A574" />
          </InsightsKpiGrid>
          {sessions.length === 0 && <InsightsEmptyState message="Log cigar sessions to see usage insights." icon={BookOpen} />}
        </div>
      )}

      {/* STATISTICS */}
      {activeTab === 'statistics' && (
        <div className="space-y-4">
          {!isLoading && cigars.length > 0 ? (
            <CigarInsights user={user} cigars={cigars} sessions={sessions} humidors={humidors} snapshots={valueSnapshots} />
          ) : (
            <InsightsEmptyState message="Add cigars to see collection statistics." icon={Cigarette} />
          )}
        </div>
      )}

      {/* TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          {sessions.length === 0 && cigars.length === 0 ? (
            <InsightsEmptyState message="Add cigars and log sessions to see trends." icon={Cigarette} />
          ) : (
            <>
              <InsightsKpiGrid>
                <InsightStatCard icon={BookOpen} label="Total Sessions" value={sessions.length} accent="#B07D4A" />
                <InsightStatCard icon={Cigarette} label="Cigars Tracked" value={cigars.length} accent="#8B5E3C" />
                <InsightStatCard icon={Heart} label="Favorites" value={favorites} accent="#C0392B" />
                <InsightStatCard icon={DollarSign} label="Collection Value" value={formatFromBase(Math.round(totalValue))} accent="#B07D4A" />
              </InsightsKpiGrid>
              <div className="rounded-2xl p-5 space-y-3" style={{ background: 'linear-gradient(135deg, rgba(42,31,24,0.5), rgba(31,21,16,0.5))', border: '1px solid rgba(180,140,75,0.15)' }}>
                <h3 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>Session Activity</h3>
                {sessions.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {[...sessions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 30).map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(180,140,75,0.06)', border: '1px solid rgba(180,140,75,0.12)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{s.cigar_name || [s.external_cigar_brand, s.external_cigar_name].filter(Boolean).join(' ') || 'Cigar session'}</p>
                          <p className="text-xs" style={{ color: 'rgba(216,199,166,0.65)' }}>{s.date ? new Date(s.date).toLocaleDateString() : 'Unknown date'}</p>
                        </div>
                        {s.overall_enjoyment != null && (
                          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>★ {s.overall_enjoyment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <InsightsEmptyState message="Log cigar sessions to see activity trends." icon={Cigarette} />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* REPORTS */}
      {activeTab === 'reports' && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(42,31,24,0.5), rgba(31,21,16,0.5))', border: '1px solid rgba(180,140,75,0.15)' }}>
          <h3 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>Export Reports</h3>
          {!isLoading && cigars.length > 0 ? (
            <CigarInsights user={user} cigars={cigars} sessions={sessions} humidors={humidors} snapshots={valueSnapshots} />
          ) : (
            <InsightsEmptyState message="Add cigars to generate reports." icon={Cigarette} />
          )}
        </div>
      )}

      {/* SESSIONS */}
      {activeTab === 'sessions' && (
        <InsightsSessionPanel
          calendar={
            <Calendar
              mode="single"
              selected={new Date(`${calSelectedDate}T12:00:00`)}
              onSelect={(date) => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
              modifiers={{ hasSessions: cigarHighlights }}
              modifiersClassNames={{ hasSessions: 'ring-1 ring-[#B48C4B] ring-offset-0' }}
            />
          }
          selectedDate={calSelectedDate}
          onSelectDate={setCalSelectedDate}
          dayRows={cigarSelectedDayRows}
          emptyLabel="No sessions logged for this day."
        />
      )}
    </InsightsPageShell>
  );
}

export default function CigarInsightsPage() {
  return <CigarInsightsInner />;
}