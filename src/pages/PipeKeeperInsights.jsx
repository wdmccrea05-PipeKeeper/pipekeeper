import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';
import PipeKeeperModuleNav from '@/components/modules/PipeKeeperModuleNav';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';
import { Flame, BookOpen, Heart, DollarSign, Award, TrendingUp, FileText } from 'lucide-react';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useLocaleFormatting } from '@/components/utils/localeFormatters';
import CollectionReportExporter from '@/components/export/CollectionReportExporter';
import SmokingLogReportExporter from '@/components/export/SmokingLogReportExporter';
import AgingReportExporter from '@/components/export/AgingReportExporter';
import {
  InsightsPageShell,
  InsightsHeader,
  InsightsTabBar,
  InsightsKpiGrid,
  InsightStatCard,
  InsightPanel,
  InsightSectionHeading,
  InsightsHighlightGrid,
  InsightsHighlightCard,
  InsightsEmptyState,
  InsightsSessionPanel,
} from '@/components/insights/InsightsShell';

export default function PipeKeeperInsights() {
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

  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ['pipes-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return fetchAllEntities(base44.entities.Pipe, { created_by: user.email }, '-updated_date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: blends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ['blends-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return fetchAllEntities(base44.entities.TobaccoBlend, { created_by: user.email }, '-updated_date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: smokingLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['smoking-logs-insights', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return fetchAllEntities(base44.entities.SmokingLog, { created_by: user.email }, '-date').catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const isLoading = pipesLoading || blendsLoading || logsLoading;

  const pipeSessionRows = useMemo(() => (smokingLogs || []).map(s => ({
    id: `pipe_${s.id}`,
    moduleType: 'pipe',
    date: s.date,
    itemLabel: s.blend_name || s.pipe_name || 'Session',
    rating: s.rating ?? null,
    notes: s.notes || '',
  })), [smokingLogs]);

  const { byDate, highlightedDates } = useMemo(
    () => buildSessionCalendarData(pipeSessionRows, 'pipe'),
    [pipeSessionRows]
  );
  const selectedDayRows = useMemo(() => byDate[calSelectedDate] || [], [byDate, calSelectedDate]);

  const totalPipes = pipes.length;
  const totalBlends = blends.length;
  const totalSessions = smokingLogs.length;
  const favoritePipes = pipes.filter(p => p?.is_favorite).length;

  const totalPipeValue = useMemo(() =>
    pipes.reduce((sum, p) => sum + Number(p?.purchase_price || 0), 0),
    [pipes]
  );

  const mostSmoked = useMemo(() => {
    if (!smokingLogs.length) return null;
    const counts = {};
    smokingLogs.forEach(l => {
      if (l.pipe_id) counts[l.pipe_id] = (counts[l.pipe_id] || 0) + (l.bowls_used || 1);
    });
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topId) return null;
    const pipe = pipes.find(p => p.id === topId);
    return pipe ? { pipe, count: counts[topId] } : null;
  }, [pipes, smokingLogs]);

  const mostValuedPipe = useMemo(() => {
    if (!pipes.length) return null;
    return [...pipes].sort((a, b) => Number(b?.purchase_price || 0) - Number(a?.purchase_price || 0))[0];
  }, [pipes]);

  const favBlend = useMemo(() => {
    return blends.find(b => b?.is_favorite) || blends[0] || null;
  }, [blends]);

  const last30Sessions = useMemo(() =>
    smokingLogs.filter(s => s?.date && new Date(s.date) >= new Date(Date.now() - 30 * 86400000)).length,
    [smokingLogs]
  );

  return (
    <InsightsPageShell>
      <PipeKeeperModuleNav currentPageName="PipeKeeperInsights" />
      <InsightsHeader
        title={t('pipekeeper.insightsTitle', 'Pipe Collection Insights')}
        subtitle={t('pipekeeper.insightsSubtitle', 'Analytics and trends from your pipe collection and smoking sessions')}
      />

      <InsightsTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Pipes" value={totalPipes} icon={Flame} accent="#B48C4B" />
            <InsightStatCard label="Tobacco Blends" value={totalBlends} icon={BookOpen} accent="#D4A574" />
            <InsightStatCard label="Sessions" value={totalSessions} icon={Award} accent="#8B5CF6" />
            <InsightStatCard label="Favorites" value={favoritePipes} icon={Heart} accent="#f87171" />
          </InsightsKpiGrid>

          {!isLoading && (pipes.length > 0 || blends.length > 0) && (
            <InsightsHighlightGrid>
              {mostSmoked && (
                <InsightsHighlightCard
                  title="Most Smoked Pipe"
                  value={mostSmoked.pipe.name || mostSmoked.pipe.maker || 'Unnamed'}
                  subtitle={`${mostSmoked.count} bowl${mostSmoked.count !== 1 ? 's' : ''}`}
                  accent="#B48C4B"
                  photo={mostSmoked.pipe.photos?.[0] || null}
                />
              )}
              {mostValuedPipe && mostValuedPipe.purchase_price > 0 && (
                <InsightsHighlightCard
                  title="Most Valued Pipe"
                  value={mostValuedPipe.name || mostValuedPipe.maker || 'Unnamed'}
                  subtitle={formatFromBase(Number(mostValuedPipe.purchase_price))}
                  accent="#C0392B"
                  photo={mostValuedPipe.photos?.[0] || null}
                />
              )}
              {favBlend && (
                <InsightsHighlightCard
                  title="Favourite Blend"
                  value={favBlend.name || 'Unnamed'}
                  subtitle={favBlend.manufacturer || favBlend.blend_type || ''}
                  accent="#8B5CF6"
                />
              )}
            </InsightsHighlightGrid>
          )}

          {!isLoading && pipes.length === 0 && blends.length === 0 && (
            <InsightsEmptyState message="Add pipes or blends to see insights." icon={Flame} />
          )}
        </div>
      )}

      {activeTab === 'value' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label="Pipe Collection Value" value={totalPipeValue > 0 ? formatFromBase(totalPipeValue) : '—'} icon={TrendingUp} accent="#D4A574" />
            <InsightStatCard label="Total Pipes" value={totalPipes} icon={Flame} accent="#B48C4B" />
          </InsightsKpiGrid>
          {pipes.length === 0 && <InsightsEmptyState message="Add pipes to track collection value." icon={DollarSign} />}
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Sessions" value={totalSessions} icon={BookOpen} accent="#8B5CF6" />
            <InsightStatCard label="Last 30 Days" value={last30Sessions} icon={Award} accent="#D4A574" />
          </InsightsKpiGrid>
          {totalSessions === 0 && <InsightsEmptyState message="Log smoking sessions to see usage insights." icon={BookOpen} />}
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label="Pipes" value={totalPipes} icon={Flame} accent="#B48C4B" />
            <InsightStatCard label="Blends" value={totalBlends} icon={BookOpen} accent="#D4A574" />
            <InsightStatCard label="Sessions" value={totalSessions} icon={Award} accent="#8B5CF6" />
            <InsightStatCard label="Favourites" value={favoritePipes} icon={Heart} accent="#f87171" />
          </InsightsKpiGrid>
          {pipes.length === 0 && <InsightsEmptyState message="Add pipes to your collection to see statistics." icon={Flame} />}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-4">
          {totalSessions === 0 && pipes.length === 0 ? (
            <InsightsEmptyState message="Add pipes and log sessions to see trends." icon={TrendingUp} />
          ) : (
            <>
              <InsightsKpiGrid>
                <InsightStatCard label="Total Sessions" value={totalSessions} icon={BookOpen} accent="#8B5CF6" />
                <InsightStatCard label="Last 30 Days" value={last30Sessions} icon={Award} accent="#D4A574" />
                <InsightStatCard label="Pipes" value={totalPipes} icon={Flame} accent="#B48C4B" />
                <InsightStatCard label="Collection Value" value={totalPipeValue > 0 ? formatFromBase(totalPipeValue) : '—'} icon={TrendingUp} accent="#D4A574" />
              </InsightsKpiGrid>
              <InsightPanel>
                <InsightSectionHeading>Recent Sessions</InsightSectionHeading>
                {smokingLogs.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {[...smokingLogs].slice(0, 30).map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(180,140,75,0.06)', border: '1px solid rgba(180,140,75,0.12)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>{s.blend_name || s.pipe_name || 'Session'}</p>
                          <p className="text-xs" style={{ color: 'rgba(216,199,166,0.65)' }}>{s.date ? formatDate(s.date) : t('insightsShared.unknownDate')}</p>
                        </div>
                        {s.rating != null && <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>★ {s.rating}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <InsightsEmptyState message="Log smoking sessions to see activity trends." icon={BookOpen} />
                )}
              </InsightPanel>
            </>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        pipes.length === 0 && blends.length === 0 ? (
          <InsightsEmptyState message="Add pipes and blends to generate reports." icon={FileText} />
        ) : (
          <InsightPanel>
            <InsightSectionHeading>Export Reports</InsightSectionHeading>
            <div className="space-y-4">
              <SmokingLogReportExporter user={user} />
              <AgingReportExporter user={user} />
              <CollectionReportExporter user={user} />
            </div>
          </InsightPanel>
        )
      )}

      {activeTab === 'sessions' && (
        <InsightsSessionPanel
          calendar={
            <Calendar
              mode="single"
              selected={new Date(`${calSelectedDate}T12:00:00`)}
              onSelect={(date) => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
              modifiers={{ hasSessions: highlightedDates }}
              modifiersClassNames={{ hasSessions: 'ring-1 ring-[#B48C4B] ring-offset-0' }}
            />
          }
          selectedDate={calSelectedDate}
          onSelectDate={setCalSelectedDate}
          dayRows={selectedDayRows}
          emptyLabel="No sessions logged for this day."
        />
      )}
    </InsightsPageShell>
  );
}
