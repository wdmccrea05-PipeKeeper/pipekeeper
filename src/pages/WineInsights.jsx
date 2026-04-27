import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Wine, TrendingUp, Star, AlertCircle, Download, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import { useCurrency } from '@/lib/currency/useCurrency';
import WineInsuranceExporter from '@/components/export/WineInsuranceExporter';
import { importDefinitions, downloadImportTemplate } from '@/lib/imports/importDefinitions';
import { selectWineCollectionValue, selectUnvaluedWineCount, hasWineValuation } from '@/lib/collection/wineSelectors';
import { Calendar } from '@/components/ui/calendar';
import { buildSessionCalendarData } from '@/lib/sessionHistory/calendarData';
import { toLocalDateYmd } from '@/components/utils/schemaCompatibility';
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

const ACCENT = '#8B3A3A';
const WINE_GOLD = '#D4A574';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'value', label: 'Value' },
  { key: 'usage', label: 'Usage' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'reports', label: 'Reports' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'drinkingwindow', label: 'Drinking Window' },
];

export default function WineInsights() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const [activeTab, setActiveTab] = useState('summary');
  const [calSelectedDate, setCalSelectedDate] = useState(toLocalDateYmd(new Date()));

  const { data: wines = [] } = useQuery({
    queryKey: ['wines', user?.email],
    queryFn: async () => base44.entities.Wine.filter({ created_by: user?.email }, '-created_date').catch(() => []),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ['wine-tastings-summary', user?.email],
    queryFn: async () => base44.entities.WineTasting.filter({ created_by: user?.email }, '-date', 500).catch(() => []),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const wineSessions = useMemo(() => (tastings || []).map(t => ({
    id: `wine_${t.id}`, moduleType: 'wine', date: t.date,
    itemLabel: t.wine_name || 'Wine tasting',
    rating: t.rating ?? null, notes: t.notes || '',
  })), [tastings]);

  const { byDate: wineByDate, highlightedDates: wineHighlights } = useMemo(
    () => buildSessionCalendarData(wineSessions, 'wine'),
    [wineSessions]
  );
  const wineSelectedDayRows = useMemo(() => wineByDate[calSelectedDate] || [], [wineByDate, calSelectedDate]);

  const stats = useMemo(() => {
    const totalBottles = wines.length;
    const totalInCellar = wines.reduce((s, w) => s + (w.quantity || 1), 0);
    const totalValue = selectWineCollectionValue(wines);
    const unvalued = selectUnvaluedWineCount(wines);
    const lowConfidence = wines.filter(w => { const conf = w.valuation_confidence || w.market_valuation_confidence; return hasWineValuation(w) && conf === 'low'; }).length;
    const rated = wines.filter(w => w.rating > 0);
    const avgRating = rated.length > 0 ? (rated.reduce((s, w) => s + w.rating, 0) / rated.length).toFixed(1) : '—';

    const styleBreakdown = {};
    wines.forEach(w => { if (w.style) styleBreakdown[w.style] = (styleBreakdown[w.style] || 0) + 1; });
    const regionBreakdown = {};
    wines.forEach(w => { if (w.region) regionBreakdown[w.region] = (regionBreakdown[w.region] || 0) + 1; });
    const varietalBreakdown = {};
    wines.forEach(w => { if (w.varietal) varietalBreakdown[w.varietal] = (varietalBreakdown[w.varietal] || 0) + 1; });

    const now = new Date();
    const drinkingNow = wines.filter(w => {
      if (!w.drink_window_start || !w.drink_window_end) return false;
      return new Date(w.drink_window_start) <= now && new Date(w.drink_window_end) >= now;
    });
    const tooYoung = wines.filter(w => w.drink_window_start && new Date(w.drink_window_start) > now);
    const pastPeak = wines.filter(w => w.drink_window_end && new Date(w.drink_window_end) < now);

    const topByValue = [...wines].sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)).slice(0, 3);
    const topByRating = [...wines].filter(w => w.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 1);

    return { totalBottles, totalInCellar, totalValue, avgRating, styleBreakdown, regionBreakdown, varietalBreakdown, drinkingNow: drinkingNow.length, tooYoung: tooYoung.length, pastPeak: pastPeak.length, tastingCount: tastings.length, unvalued, lowConfidence, topByValue, topByRating, drinkingNowWines: drinkingNow };
  }, [wines, tastings]);

  const wineImportDef = importDefinitions['winekeeper_wines'];

  return (
    <InsightsPageShell>
      <WineKeeperModuleNav currentPageName="WineInsights" />
      <InsightsHeader
        title={t('wine.insights', 'WineKeeper Insights')}
        subtitle="Analyze your wine cellar — value, drinking windows, and tasting history"
      />

      <InsightsTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <InsightsKpiGrid>
            <InsightStatCard label={t('wine.totalBottles', 'Total Bottles')} value={stats.totalBottles} icon={Wine} accent={ACCENT} />
            <InsightStatCard label={t('wine.totalInCellar', 'In Cellar')} value={stats.totalInCellar} icon={Wine} accent={ACCENT} />
            <InsightStatCard label={t('wine.collectionValue', 'Est. Value')} value={formatFromBase(stats.totalValue)} icon={TrendingUp} accent="#2E7D5C" />
            <InsightStatCard label={t('wine.avgRating', 'Avg Rating')} value={stats.avgRating} icon={Star} accent={WINE_GOLD} />
            <InsightStatCard label="Tastings" value={stats.tastingCount} icon={BookOpen} accent="#8B5CF6" />
            <InsightStatCard label="Drink Now" value={stats.drinkingNow} icon={CalendarIcon} accent="#2E7D5C" />
          </InsightsKpiGrid>

          <InsightsHighlightGrid>
            {stats.topByRating[0] && (
              <InsightsHighlightCard title="Top Rated Wine" value={stats.topByRating[0].name} subtitle={`${stats.topByRating[0].rating}/5 · ${stats.topByRating[0].producer || ''}`} accent={ACCENT} />
            )}
            {stats.topByValue[0] && (
              <InsightsHighlightCard title="Most Valued Wine" value={stats.topByValue[0].name} subtitle={stats.topByValue[0].estimated_value ? formatFromBase(stats.topByValue[0].estimated_value) : '—'} accent="#2E7D5C" />
            )}
            {stats.drinkingNow > 0 && (
              <InsightsHighlightCard title="In Drinking Window" value={`${stats.drinkingNow} bottle${stats.drinkingNow !== 1 ? 's' : ''}`} subtitle="Ready to open" accent={WINE_GOLD} />
            )}
          </InsightsHighlightGrid>

          {wines.length === 0 && (
            <InsightsEmptyState message="Add wines to your cellar to see insights." icon={Wine} />
          )}
        </div>
      )}

      {/* VALUE */}
      {activeTab === 'value' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label="Collection Value" value={formatFromBase(stats.totalValue)} icon={TrendingUp} accent="#2E7D5C" />
            <InsightStatCard label="Unvalued" value={stats.unvalued} icon={AlertCircle} accent={WINE_GOLD} />
            <InsightStatCard label="Low Confidence" value={stats.lowConfidence} icon={AlertCircle} accent="#f87171" />
          </InsightsKpiGrid>

          {stats.topByValue.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>Top Valued Wines</InsightSectionHeading>
              <div className="space-y-2">
                {stats.topByValue.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#F5F1E7] truncate">{w.name}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(216,199,166,0.6)' }}>{[w.producer, w.vintage].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: WINE_GOLD }}>{w.estimated_value ? formatFromBase(w.estimated_value) : '—'}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {(stats.unvalued > 0 || stats.lowConfidence > 0) && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>Valuation Coverage</InsightSectionHeading>
              <div className="space-y-2 text-sm">
                {stats.unvalued > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(224,216,200,0.7)' }}>Not valued yet</span>
                    <span className="font-semibold text-[#F5F1E7]">{stats.unvalued} bottle{stats.unvalued !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {stats.lowConfidence > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(224,216,200,0.7)' }}>Low confidence estimate</span>
                    <span className="font-semibold text-[#F5F1E7]">{stats.lowConfidence} bottle{stats.lowConfidence !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: 'rgba(224,216,200,0.5)' }}>
                  Click Enrich on individual bottles to improve valuation accuracy.
                </p>
              </div>
            </InsightPanel>
          )}

          {wines.length === 0 && <InsightsEmptyState message="Add wines to see value insights." icon={Wine} />}
        </div>
      )}

      {/* USAGE */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label="Total Tastings" value={stats.tastingCount} icon={BookOpen} accent="#8B5CF6" />
          </InsightsKpiGrid>

          {tastings.length > 0 ? (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>Recent Tastings</InsightSectionHeading>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tastings.slice(0, 50).map(t => (
                  <div key={t.id} className="p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.15)' }}>
                    <p className="text-sm font-medium text-[#F5F1E7]">{t.wine_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
                      {t.date && !Number.isNaN(new Date(t.date).getTime()) ? new Date(t.date).toLocaleDateString() : '—'}{t.rating ? ` · ★ ${t.rating}` : ''}
                    </p>
                    {t.notes && <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.75)' }}>{t.notes}</p>}
                  </div>
                ))}
              </div>
            </InsightPanel>
          ) : (
            <InsightsEmptyState message="Log tastings to see usage insights." icon={BookOpen} />
          )}
        </div>
      )}

      {/* STATISTICS */}
      {activeTab === 'statistics' && (
        <div className="space-y-4">
          {Object.keys(stats.styleBreakdown).length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.byStyle', 'By Style')}</InsightSectionHeading>
              <div className="space-y-2">
                {Object.entries(stats.styleBreakdown).sort((a, b) => b[1] - a[1]).map(([style, count]) => (
                  <div key={style} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-[#F5F1E7]">{style}</span>
                    <span className="text-sm font-semibold" style={{ color: '#C47070' }}>{count}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {Object.keys(stats.regionBreakdown).length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.byRegion', 'By Region')}</InsightSectionHeading>
              <div className="space-y-2">
                {Object.entries(stats.regionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between">
                    <span className="text-sm text-[#F5F1E7]">{region}</span>
                    <span className="text-sm font-semibold" style={{ color: '#C47070' }}>{count}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {Object.keys(stats.varietalBreakdown).length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>By Varietal</InsightSectionHeading>
              <div className="space-y-2">
                {Object.entries(stats.varietalBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, count]) => (
                  <div key={v} className="flex items-center justify-between">
                    <span className="text-sm text-[#F5F1E7]">{v}</span>
                    <span className="text-sm font-semibold" style={{ color: '#C47070' }}>{count}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {wines.length === 0 && <InsightsEmptyState message="Add wines to see collection statistics." icon={Wine} />}
        </div>
      )}

      {/* REPORTS */}
      {activeTab === 'reports' && (
        <InsightPanel>
          <InsightSectionHeading accent={WINE_GOLD}>Export Reports</InsightSectionHeading>
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(46,125,92,0.08)', border: '1px solid rgba(46,125,92,0.22)' }}>
              <h4 className="font-semibold text-[#F5F1E7] mb-1">Collection Export &amp; Insurance Report</h4>
              <p className="text-sm mb-3" style={{ color: 'rgba(216,199,166,0.8)' }}>
                Export your cellar as CSV or generate a PDF insurance report.
                {wines.length > 0 && ` (${wines.length} wine${wines.length !== 1 ? 's' : ''})`}
              </p>
              <WineInsuranceExporter user={user} wines={wines} />
            </div>

            {wineImportDef && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.22)' }}>
                <h4 className="font-semibold text-[#F5F1E7] mb-1">Import Template</h4>
                <p className="text-sm mb-3" style={{ color: 'rgba(216,199,166,0.8)' }}>
                  Download the CSV import template to bulk-add wines.
                </p>
                <button
                  onClick={() => downloadImportTemplate(wineImportDef)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'rgba(180,140,75,0.25)', color: '#F5F1E7', border: '1px solid rgba(180,140,75,0.35)' }}
                >
                  <Download className="w-4 h-4" />
                  Download Wines Template
                </button>
              </div>
            )}
          </div>
        </InsightPanel>
      )}

      {/* SESSIONS */}
      {activeTab === 'sessions' && (
        <InsightsSessionPanel
          calendar={
            <Calendar
              mode="single"
              selected={new Date(`${calSelectedDate}T12:00:00`)}
              onSelect={(date) => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
              modifiers={{ hasSessions: wineHighlights }}
              modifiersClassNames={{ hasSessions: 'ring-1 ring-[#8B3A3A] ring-offset-0' }}
            />
          }
          selectedDate={calSelectedDate}
          onSelectDate={setCalSelectedDate}
          dayRows={wineSelectedDayRows}
          emptyLabel="No tastings logged for this day."
        />
      )}

      {/* DRINKING WINDOW */}
      {activeTab === 'drinkingwindow' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label={t('wine.drinkNow', 'Drink Now')} value={stats.drinkingNow} icon={Wine} accent="#2E7D5C" />
            <InsightStatCard label={t('wine.tooYoung', 'Too Young')} value={stats.tooYoung} icon={CalendarIcon} accent="#6B8FC4" />
            <InsightStatCard label={t('wine.pastPeak', 'Past Peak')} value={stats.pastPeak} icon={AlertCircle} accent={ACCENT} />
          </InsightsKpiGrid>

          {stats.drinkingNowWines && stats.drinkingNowWines.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent="#2E7D5C">Ready to Open Now</InsightSectionHeading>
              <div className="space-y-2">
                {stats.drinkingNowWines.slice(0, 10).map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(46,125,92,0.2)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#F5F1E7] truncate">{w.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(216,199,166,0.6)' }}>{[w.producer, w.vintage ? String(w.vintage) : null].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(46,125,92,0.15)', color: '#2E7D5C', border: '1px solid rgba(46,125,92,0.3)' }}>Drink Now</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {wines.length === 0 && <InsightsEmptyState message="Add wines with drinking windows to see this view." icon={Wine} />}
        </div>
      )}
    </InsightsPageShell>
  );
}