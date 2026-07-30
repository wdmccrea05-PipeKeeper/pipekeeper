import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Wine, TrendingUp, Star, AlertCircle, Download, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useLocaleFormatting } from '@/components/utils/localeFormatters';
import WineInsuranceExporter from '@/components/export/WineInsuranceExporter';
import { importDefinitions, downloadImportTemplate } from '@/lib/imports/importDefinitions';
import { selectWineCollectionValue, selectUnvaluedWineCount, hasWineValuation, getWinePrimaryImage, getWineTotalValue } from '@/lib/collection/wineSelectors';
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
import { MODULE_ACCENTS } from '@/lib/theme/tokens';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';

const ACCENT = '#8B3A3A';
const WINE_GOLD = '#D4A574';
const DEFAULT_WINE_INSIGHTS_TITLE = 'WineKeeper Insights';
const getCountKey = (count, singularKey, pluralKey) => (count === 1 ? singularKey : pluralKey);

export default function WineInsights() {
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
    { key: 'drinkingwindow', label: t('insightsTabs.drinkingWindow') },
  ]), [t]);

  const { data: wines = [] } = useQuery({
    queryKey: QUERY_KEYS.wines(user?.email),
    queryFn: async () => fetchAllEntities(base44.entities.Wine, { created_by: user?.email }, '-created_date').catch(() => []),
    enabled: !!user?.email,
    staleTime: STALE_TIME.COLLECTION,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: QUERY_KEYS.wineTastingsSummary(user?.email),
    queryFn: async () => fetchAllEntities(base44.entities.WineTasting, { created_by: user?.email }, '-date').catch(() => []),
    enabled: !!user?.email,
    staleTime: STALE_TIME.SESSION_HISTORY,
  });

  const wineSessions = useMemo(() => (tastings || []).map((tasting) => ({
    id: `wine_${tasting.id}`, moduleType: 'wine', date: tasting.date,
    itemLabel: tasting.wine_name || t('wine.wineTastings'),
    rating: tasting.rating ?? null, notes: tasting.notes || '',
  })), [t, tastings]);

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

    const topByValue = [...wines].sort((a, b) => getWineTotalValue(b) - getWineTotalValue(a)).slice(0, 3);
    const topByRating = [...wines].filter(w => w.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 1);

    return { totalBottles, totalInCellar, totalValue, avgRating, styleBreakdown, regionBreakdown, varietalBreakdown, drinkingNow: drinkingNow.length, tooYoung: tooYoung.length, pastPeak: pastPeak.length, tastingCount: tastings.length, unvalued, lowConfidence, topByValue, topByRating, drinkingNowWines: drinkingNow };
  }, [wines, tastings]);

  const wineImportDef = importDefinitions['winekeeper_wines'];

  return (
    <InsightsPageShell>
      <WineKeeperModuleNav currentPageName="WineInsights" />
      <InsightsHeader
        title={t('wine.insights', { defaultValue: DEFAULT_WINE_INSIGHTS_TITLE })}
        subtitle={t('wine.analyzeCellarSubtitle')}
      />

      <InsightsTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} activeAccent={MODULE_ACCENTS.winekeeper} />

      {/* SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <InsightsKpiGrid>
            <InsightStatCard label={t('wine.totalBottles')} value={stats.totalBottles} icon={Wine} accent={ACCENT} />
            <InsightStatCard label={t('wine.totalInCellar')} value={stats.totalInCellar} icon={Wine} accent={ACCENT} />
            <InsightStatCard label={t('wine.collectionValue')} value={formatFromBase(stats.totalValue)} icon={TrendingUp} accent="#2E7D5C" />
            <InsightStatCard label={t('wine.avgRating')} value={stats.avgRating} icon={Star} accent={WINE_GOLD} />
            <InsightStatCard label={t('wine.tastingsMetric')} value={stats.tastingCount} icon={BookOpen} accent="#8B5CF6" />
            <InsightStatCard label={t('wine.drinkNow')} value={stats.drinkingNow} icon={CalendarIcon} accent="#2E7D5C" />
          </InsightsKpiGrid>

          {wines.length > 0 && (
            <InsightsHighlightGrid>
              {stats.topByRating[0] && (
                <InsightsHighlightCard
                  title={t('wine.topRated')}
                  value={stats.topByRating[0].name}
                  subtitle={`${stats.topByRating[0].rating}/5 · ${stats.topByRating[0].producer || ''}`}
                  accent={ACCENT}
                  photo={getWinePrimaryImage(stats.topByRating[0])}
                />
              )}
              {stats.topByValue[0] && getWineTotalValue(stats.topByValue[0]) > 0 && (
                <InsightsHighlightCard
                  title={t('wine.mostValuedWine')}
                  value={stats.topByValue[0].name}
                  subtitle={formatFromBase(getWineTotalValue(stats.topByValue[0]))}
                  accent="#2E7D5C"
                  photo={getWinePrimaryImage(stats.topByValue[0])}
                />
              )}
              {stats.drinkingNowWines?.[0] && (() => {
                const dw = stats.drinkingNowWines[0];
                const sub = `${dw.producer || ''}${dw.vintage ? ` · ${dw.vintage}` : ''}`.trim() || t('wine.readyToOpen');
                return (
                  <InsightsHighlightCard
                    title={t('wine.drinkNow')}
                    value={dw.name}
                    subtitle={sub}
                    accent={WINE_GOLD}
                    photo={getWinePrimaryImage(dw)}
                  />
                );
              })()}
            </InsightsHighlightGrid>
          )}

          {wines.length === 0 && (
            <InsightsEmptyState message={t('wine.addWinesForInsights')} icon={Wine} />
          )}
        </div>
      )}

      {/* VALUE */}
      {activeTab === 'value' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label={t('wine.collectionValue')} value={formatFromBase(stats.totalValue)} icon={TrendingUp} accent="#2E7D5C" />
            <InsightStatCard label={t('wine.unvalued')} value={stats.unvalued} icon={AlertCircle} accent={WINE_GOLD} />
            <InsightStatCard label={t('wine.lowConfidence')} value={stats.lowConfidence} icon={AlertCircle} accent="#f87171" />
          </InsightsKpiGrid>

          {stats.topByValue.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.topValuedWines')}</InsightSectionHeading>
              <div className="space-y-2">
                {stats.topByValue.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#F5F1E7] truncate">{w.name}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(216,199,166,0.6)' }}>{[w.producer, w.vintage].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: WINE_GOLD }}>{getWineTotalValue(w) > 0 ? formatFromBase(getWineTotalValue(w)) : '—'}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {(stats.unvalued > 0 || stats.lowConfidence > 0) && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.valuationCoverage')}</InsightSectionHeading>
              <div className="space-y-2 text-sm">
                {stats.unvalued > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(224,216,200,0.7)' }}>{t('wine.notValuedYet')}</span>
                    <span className="font-semibold text-[#F5F1E7]">{t(getCountKey(stats.unvalued, 'wine.bottlesCountLabel', 'wine.bottlesCountLabel_plural'), { count: stats.unvalued })}</span>
                  </div>
                )}
                {stats.lowConfidence > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(224,216,200,0.7)' }}>{t('wine.lowConfidenceEstimateShort')}</span>
                    <span className="font-semibold text-[#F5F1E7]">{t(getCountKey(stats.lowConfidence, 'wine.bottlesCountLabel', 'wine.bottlesCountLabel_plural'), { count: stats.lowConfidence })}</span>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: 'rgba(224,216,200,0.5)' }}>
                  {t('wine.clickEnrichToImprove')}
                </p>
              </div>
            </InsightPanel>
          )}

          {wines.length === 0 && <InsightsEmptyState message={t('wine.addWinesForValueInsights')} icon={Wine} />}
        </div>
      )}

      {/* USAGE */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label={t('wine.totalTastings')} value={stats.tastingCount} icon={BookOpen} accent="#8B5CF6" />
          </InsightsKpiGrid>

          {tastings.length > 0 ? (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.recentTastings')}</InsightSectionHeading>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tastings.slice(0, 50).map(t => (
                  <div key={t.id} className="p-3 rounded-lg" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.15)' }}>
                    <p className="text-sm font-medium text-[#F5F1E7]">{t.wine_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
                      {t.date && !Number.isNaN(new Date(t.date).getTime()) ? formatDate(t.date) : '—'}{t.rating ? ` · ★ ${t.rating}` : ''}
                    </p>
                    {t.notes && <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.75)' }}>{t.notes}</p>}
                  </div>
                ))}
              </div>
            </InsightPanel>
          ) : (
            <InsightsEmptyState message={t('wine.logTastingsForUsage')} icon={BookOpen} />
          )}
        </div>
      )}

      {/* STATISTICS */}
      {activeTab === 'statistics' && (
        <div className="space-y-4">
          {Object.keys(stats.styleBreakdown).length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.byStyle')}</InsightSectionHeading>
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
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.byRegion')}</InsightSectionHeading>
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
              <InsightSectionHeading accent={WINE_GOLD}>{t('wine.byVarietal')}</InsightSectionHeading>
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

          {wines.length === 0 && <InsightsEmptyState message={t('wine.addWinesForStatistics')} icon={Wine} />}
        </div>
      )}

      {/* TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          {wines.length === 0 && tastings.length === 0 ? (
            <InsightsEmptyState message={t('wine.addWinesAndTastingsForTrends')} icon={Wine} />
          ) : (
            <>
              <InsightsKpiGrid>
                <InsightStatCard icon={Wine} label={t('wine.totalTastings')} value={stats.tastingCount} accent={ACCENT} />
                <InsightStatCard icon={TrendingUp} label={t('wine.collectionValue')} value={formatFromBase(Math.round(stats.totalValue))} accent={ACCENT} />
                <InsightStatCard icon={Star} label={t('wine.avgRating')} value={stats.avgRating} accent={WINE_GOLD} />
                <InsightStatCard icon={BookOpen} label={t('wine.bottlesInCellar')} value={stats.totalInCellar} accent={ACCENT} />
              </InsightsKpiGrid>
              <InsightPanel>
                <InsightSectionHeading accent={WINE_GOLD}>{t('wine.recentTastings')}</InsightSectionHeading>
                {tastings.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {[...tastings].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 30).map((tasting) => (
                      <div key={tasting.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(139,58,58,0.07)', border: '1px solid rgba(139,58,58,0.15)' }}>
                        <div>
                          <p className="text-sm font-medium text-[#F5F1E7]">{tasting.wine_name || t('wine.wineTastings')}</p>
                          <p className="text-xs" style={{ color: 'rgba(216,199,166,0.65)' }}>{tasting.date ? formatDate(tasting.date) : t('insightsShared.unknownDate')}</p>
                        </div>
                        {tasting.rating != null && <p className="text-sm font-semibold text-[#F5F1E7]">★ {tasting.rating}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <InsightsEmptyState message={t('wine.logWineTastingsForTrends')} icon={Wine} />
                )}
              </InsightPanel>
            </>
          )}
        </div>
      )}

      {/* REPORTS */}
      {activeTab === 'reports' && (
        <InsightPanel>
          <InsightSectionHeading accent={WINE_GOLD}>{t('wine.exportReports')}</InsightSectionHeading>
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(46,125,92,0.08)', border: '1px solid rgba(46,125,92,0.22)' }}>
              <h4 className="font-semibold text-[#F5F1E7] mb-1">{t('wine.collectionExportInsuranceReport')}</h4>
              <p className="text-sm mb-3" style={{ color: 'rgba(216,199,166,0.8)' }}>
                {t('wine.exportCellarDescription')}
                {wines.length > 0 && ` (${t(getCountKey(wines.length, 'wine.winesCountLabel', 'wine.winesCountLabel_plural'), { count: wines.length })})`}
              </p>
              <WineInsuranceExporter user={user} wines={wines} />
            </div>

            {wineImportDef && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.22)' }}>
                <h4 className="font-semibold text-[#F5F1E7] mb-1">{t('wine.importTemplate')}</h4>
                <p className="text-sm mb-3" style={{ color: 'rgba(216,199,166,0.8)' }}>
                  {t('wine.importTemplateDescription')}
                </p>
                <button
                  onClick={() => downloadImportTemplate(wineImportDef)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'rgba(180,140,75,0.25)', color: '#F5F1E7', border: '1px solid rgba(180,140,75,0.35)' }}
                >
                  <Download className="w-4 h-4" />
                  {t('wine.downloadWinesTemplate')}
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
          emptyLabel={t('wine.noTastingsForDay')}
        />
      )}

      {/* DRINKING WINDOW */}
      {activeTab === 'drinkingwindow' && (
        <div className="space-y-4">
          <InsightsKpiGrid>
            <InsightStatCard label={t('wine.drinkNow')} value={stats.drinkingNow} icon={Wine} accent="#2E7D5C" />
            <InsightStatCard label={t('wine.tooYoung')} value={stats.tooYoung} icon={CalendarIcon} accent="#6B8FC4" />
            <InsightStatCard label={t('wine.pastPeak')} value={stats.pastPeak} icon={AlertCircle} accent={ACCENT} />
          </InsightsKpiGrid>

          {stats.drinkingNowWines && stats.drinkingNowWines.length > 0 && (
            <InsightPanel>
              <InsightSectionHeading accent="#2E7D5C">{t('wine.readyToOpenNow')}</InsightSectionHeading>
              <div className="space-y-2">
                {stats.drinkingNowWines.slice(0, 10).map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(46,125,92,0.2)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#F5F1E7] truncate">{w.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(216,199,166,0.6)' }}>{[w.producer, w.vintage ? String(w.vintage) : null].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(46,125,92,0.15)', color: '#2E7D5C', border: '1px solid rgba(46,125,92,0.3)' }}>{t('wine.drinkNow')}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          )}

          {wines.length === 0 && <InsightsEmptyState message={t('wine.addWinesWithDrinkingWindows')} icon={Wine} />}
        </div>
      )}
    </InsightsPageShell>
  );
}