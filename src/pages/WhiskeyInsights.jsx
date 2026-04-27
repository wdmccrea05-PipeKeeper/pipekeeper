import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import { WhiskeyAnalyticsTab, WhiskeyTrendsTab, getTopBottlesToHold, getBottlesSafeToOpen, getReplacementRiskBottles, getValueConcentration } from '@/components/whiskey/WhiskeyInsightsAnalytics';
import { TrendingUp, Award, Trophy, Star, Zap, ShieldCheck, Sparkles, AlertTriangle, DollarSign, BookOpen, FileText, Download } from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO, subDays, isWithinInterval } from 'date-fns';
import { CATEGORY_COLORS } from '@/components/ui/HeroCard';
import { DIFFICULTY_LABELS } from '@/components/valuation/valueEngine';
import { useCurrency } from '@/lib/currency/useCurrency';
import WhiskeyInsuranceExporter from '@/components/export/WhiskeyInsuranceExporter';
import { selectWhiskeyMetrics, getBottleUnitValue, selectOpenBottleValue, selectSealedBottleValue } from '@/lib/collection/whiskeySelectors';
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

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'value', label: 'Value' },
  { key: 'usage', label: 'Usage' },
  { key: 'stats', label: 'Statistics' },
  { key: 'trends', label: 'Trends' },
  { key: 'reports', label: 'Reports' },
  { key: 'sessions', label: 'Sessions' },
];

export default function WhiskeyInsightsPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const formatCurrency = formatFromBase;
  const [activeTab, setActiveTab] = useState('summary');
  const [calSelectedDate, setCalSelectedDate] = useState(toLocalDateYmd(new Date()));

  const { data: bottles = [], isLoading: bottlesLoading } = useQuery({
    queryKey: ['bottles', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Bottle.filter({ created_by: user.email }, '-updated_date', 1000).catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: tastingLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['tasting-logs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.TastingLog.filter({ created_by: user.email }, '-tasting_date', 1000).catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: inventoryUnits = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['whiskey-inventory', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.WhiskeyInventoryUnit.filter({ created_by: user.email }).catch(() => []);
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const isDataLoading = !!user?.email && (bottlesLoading || logsLoading || inventoryLoading);

  const whiskeySessions = useMemo(() => (tastingLogs || []).map(log => ({
    id: `whiskey_${log.id}`, moduleType: 'whiskey', date: log.tasting_date,
    itemLabel: log.bottle_name || 'Whiskey tasting',
    rating: log.rating ?? null, notes: log.notes || '',
  })), [tastingLogs]);

  const { byDate: whiskeyByDate, highlightedDates: whiskeyHighlights } = useMemo(
    () => buildSessionCalendarData(whiskeySessions, 'whiskey'), [whiskeySessions]
  );
  const whiskeySelectedDayRows = useMemo(() => whiskeyByDate[calSelectedDate] || [], [whiskeyByDate, calSelectedDate]);

  const whiskeyMetrics = useMemo(() => selectWhiskeyMetrics(bottles, inventoryUnits, tastingLogs), [bottles, inventoryUnits, tastingLogs]);
  const { bottle_types: bottleTypes, total_bottles: totalBottles, open_bottles: openBottles, sealed_bottles: sealedBottles, total_tastings: totalTastings, collection_value: totalValue } = whiskeyMetrics;

  const now = new Date();
  const oneWeekAgo = subDays(now, 7);
  const tastingsThisWeek = useMemo(() => tastingLogs.filter(l => {
    try { if (!l?.tasting_date) return false; const d = parseISO(l.tasting_date.slice(0, 10)); return isWithinInterval(d, { start: oneWeekAgo, end: now }); } catch { return false; }
  }).length, [tastingLogs, oneWeekAgo, now]);

  const averageRating = useMemo(() => {
    const rated = bottles.filter(b => b.rating != null && b.rating !== '' && Number(b.rating) > 0);
    return rated.length > 0 ? (rated.reduce((sum, b) => sum + Number(b.rating), 0) / rated.length).toFixed(2) : 0;
  }, [bottles]);

  const getBottleValue = (b) => getBottleUnitValue(b);

  const mostValuedBottle = useMemo(() => {
    if (!bottles.length) return null;
    return [...bottles].sort((a, b) => getBottleValue(b) - getBottleValue(a))[0];
  }, [bottles]);

  const oldestBottle = useMemo(() => {
    if (!bottles.length) return null;
    return bottles.reduce((oldest, b) => {
      if (!oldest.purchase_date) return b;
      if (!b.purchase_date) return oldest;
      return new Date(b.purchase_date) < new Date(oldest.purchase_date) ? b : oldest;
    });
  }, [bottles]);

  const mostTastedBottle = useMemo(() => {
    if (!tastingLogs.length) return null;
    const tasted = {};
    tastingLogs.forEach(log => { const rawName = typeof log?.bottle_name === 'string' ? log.bottle_name.trim() : ''; if (!rawName) return; tasted[rawName] = (tasted[rawName] || 0) + 1; });
    const topEntry = Object.entries(tasted).sort((a, b) => b[1] - a[1])[0];
    if (!topEntry) return null;
    const [topName, count] = topEntry;
    const matchedBottle = bottles.find(b => b?.id && tastingLogs.some(l => l?.bottle_id === b.id && (l?.bottle_name || '').trim() === topName)) || bottles.find(b => (b?.name || '').trim().toLowerCase() === topName.toLowerCase()) || null;
    return { name: matchedBottle?.name || topName, bottle: matchedBottle, count, photo: matchedBottle?.photo || null };
  }, [tastingLogs, bottles]);

  const tastingPerWeek = useMemo(() => {
    if (!tastingLogs.length) return 0;
    const oldest = [...tastingLogs].sort((a, b) => new Date(a.tasting_date || 0) - new Date(b.tasting_date || 0))[0];
    if (!oldest) return 0;
    const weeks = Math.max(1, Math.ceil(differenceInCalendarDays(now, new Date(oldest.tasting_date)) / 7));
    return (tastingLogs.length / weeks).toFixed(1);
  }, [tastingLogs]);

  const topBottlesToHold = useMemo(() => getTopBottlesToHold(bottles, 5), [bottles]);
  const bottlesSafeToOpen = useMemo(() => getBottlesSafeToOpen(bottles, 5), [bottles]);
  const replacementRiskBottles = useMemo(() => getReplacementRiskBottles(bottles, 5), [bottles]);
  const valueConcentration = useMemo(() => getValueConcentration(bottles), [bottles]);
  const sealedValue = useMemo(() => selectSealedBottleValue(bottles, inventoryUnits), [bottles, inventoryUnits]);
  const openValue = useMemo(() => selectOpenBottleValue(bottles, inventoryUnits), [bottles, inventoryUnits]);

  const handleExportPDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      doc.setFontSize(20); doc.setTextColor(40, 20, 10); doc.text('WhiskeyKeeper — Collection Report', 20, 22);
      doc.setFontSize(10); doc.setTextColor(100, 80, 60); doc.text(`Generated: ${date}`, 20, 30);
      doc.setFontSize(14); doc.setTextColor(40, 20, 10); doc.text('Collection Summary', 20, 44);
      doc.setFontSize(11); doc.setTextColor(60, 40, 20);
      doc.text(`Bottle Types: ${bottleTypes}`, 20, 54);
      doc.text(`Total Bottles: ${totalBottles}`, 20, 62);
      doc.text(`Open Bottles: ${openBottles}`, 20, 70);
      doc.text(`Total Tastings: ${totalTastings}`, 20, 78);
      doc.text(`Collection Value: ${formatCurrency(Math.round(totalValue))}`, 20, 86);
      doc.text(`Average Rating: ${averageRating}/5`, 20, 94);
      if (mostValuedBottle) doc.text(`Most Valued: ${mostValuedBottle.name} (${formatCurrency(getBottleValue(mostValuedBottle))})`, 20, 102);
      doc.setFontSize(14); doc.setTextColor(40, 20, 10); doc.text('Bottles', 20, 118);
      doc.setFontSize(9); doc.setTextColor(60, 40, 20);
      const headers = ['Name', 'Type', 'Country', 'Value', 'Rating'];
      const colX = [20, 80, 120, 150, 180];
      headers.forEach((h, i) => doc.text(h, colX[i], 126));
      doc.setDrawColor(180, 140, 75); doc.line(20, 128, 190, 128);
      let y = 135;
      bottles.forEach(b => {
        if (y > 270) { doc.addPage(); y = 20; }
        const val = getBottleValue(b);
        doc.text(String(b.name || '').slice(0, 28), colX[0], y);
        doc.text(String(b.type || '').slice(0, 18), colX[1], y);
        doc.text(String(b.country || '').slice(0, 14), colX[2], y);
        doc.text(val > 0 ? formatCurrency(val) : '—', colX[3], y);
        doc.text(b.rating ? String(b.rating) : '—', colX[4], y);
        y += 8;
      });
      doc.save(`whiskeykeeper-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) { console.error('[WhiskeyInsights] PDF export failed:', err); }
  }, [bottles, tastingLogs, bottleTypes, totalBottles, openBottles, totalTastings, totalValue, averageRating, mostValuedBottle]);

  if (!user?.email) return null;

  if (bottles.length === 0 && tastingLogs.length === 0 && inventoryUnits.length === 0 && !isDataLoading) {
    return (
      <LockedModuleGuard moduleKey="whiskeykeeper">
        <div className="space-y-6">
          <WhiskeyKeeperModuleNav currentPageName="WhiskeyInsights" />
          <InsightsHeader title={t('whiskeykeeper.insightsTitle', 'Collection Insights')} subtitle={t('whiskeykeeper.insightsSubtitle', 'Analyze your whiskey collection')} />
          <InsightsEmptyState message="Add bottles to reveal trends, value, and opportunities." />
        </div>
      </LockedModuleGuard>
    );
  }

  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <InsightsPageShell>
        <WhiskeyKeeperModuleNav currentPageName="WhiskeyInsights" />
        <InsightsHeader
          title={t('whiskeykeeper.insightsTitle', 'Collection Insights')}
          subtitle={t('whiskeykeeper.insightsSubtitle', 'Analyze your whiskey collection')}
        />

        <InsightsTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <InsightsKpiGrid>
              <InsightStatCard icon={WhiskeyKeeperIcon} label="Bottle Types" value={bottleTypes} sub="Distinct labels" accent="#C87941" />
              <InsightStatCard icon={Trophy} label="Total Bottles" value={totalBottles} sub={inventoryUnits.length > 0 ? `${openBottles} open · ${sealedBottles} sealed` : undefined} accent="#C87941" />
              <InsightStatCard icon={Zap} label={t('insights.openBottles', 'Open Bottles')} value={openBottles} accent="#EF4444" />
              <InsightStatCard icon={Star} label={t('insights.totalTastings', 'Total Tastings')} value={totalTastings} sub={`${tastingsThisWeek} this week`} accent={CATEGORY_COLORS.tobacco} />
              <InsightStatCard icon={TrendingUp} label={t('insights.collectionValue', 'Collection Value')} value={formatCurrency(Math.round(totalValue))} accent={CATEGORY_COLORS.value} />
              <InsightStatCard icon={Award} label={t('insights.averageRating', 'Average Rating')} value={`${averageRating}/5`} accent="#8B5CF6" />
            </InsightsKpiGrid>

            <InsightsHighlightGrid>
              {mostTastedBottle && (
                <InsightsHighlightCard title={t('insights.mostTastedBottle', 'Most Tasted Bottle')} value={mostTastedBottle.name} subtitle={`${mostTastedBottle.count} tastings`} accent="#C87941" photo={mostTastedBottle.photo} />
              )}
              {mostValuedBottle && (
                <InsightsHighlightCard title={t('insights.mostValuedBottle', 'Most Valued Bottle')} value={mostValuedBottle.name} subtitle={formatCurrency(getBottleValue(mostValuedBottle))} accent="#C0392B" photo={mostValuedBottle.photo} />
              )}
              {oldestBottle && (
                <InsightsHighlightCard
                  title={t('insights.oldestBottle', 'Oldest Bottle')}
                  value={oldestBottle.name}
                  subtitle={oldestBottle.purchase_date && !Number.isNaN(new Date(oldestBottle.purchase_date).getTime()) ? new Date(oldestBottle.purchase_date).getFullYear().toString() : 'Unknown'}
                  accent="#10B981"
                  photo={oldestBottle.photo}
                />
              )}
            </InsightsHighlightGrid>
          </div>
        )}

        {/* USAGE */}
        {activeTab === 'usage' && (
          <div className="space-y-4">
            <InsightsKpiGrid>
              <InsightStatCard icon={BookOpen} label="Total Tastings" value={totalTastings} accent="#8B5CF6" />
              <InsightStatCard icon={Zap} label="This Week" value={tastingsThisWeek} accent="#C87941" />
              <InsightStatCard icon={Star} label="Per Week (avg)" value={tastingPerWeek} accent="#D4A574" />
            </InsightsKpiGrid>
            <InsightPanel>
              <InsightSectionHeading>{t('insights.tastingActivity', 'Tasting Activity')}</InsightSectionHeading>
              {tastingLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...new Map(tastingLogs.map(l => [l.id, l])).values()].slice(0, 50).map(log => (
                    <div key={log.id} className="p-4 rounded-lg" style={{ background: 'rgba(180,140,75,0.05)', border: '1px solid rgba(180,140,75,0.15)' }}>
                      <p className="text-sm font-medium text-[#F5F1E7]">{log.bottle_name}</p>
                      <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                        {log.tasting_date && !Number.isNaN(new Date(log.tasting_date).getTime()) ? new Date(log.tasting_date).toLocaleDateString() : 'Unknown date'}{log.rating ? ` · ★ ${log.rating}` : ''}
                      </p>
                      {log.notes && <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.75)' }}>{log.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <InsightsEmptyState message="No tastings logged yet." />
              )}
            </InsightPanel>
          </div>
        )}

        {/* VALUE */}
        {activeTab === 'value' && (
          <div className="space-y-6">
            <InsightsKpiGrid>
              <InsightStatCard icon={TrendingUp} label="Collection Value" value={formatCurrency(Math.round(totalValue))} sub="Engine-computed" accent={CATEGORY_COLORS.value} />
              {inventoryUnits.length > 0 && (
                <>
                  <InsightStatCard icon={ShieldCheck} label="Sealed / Reserve Value" value={formatCurrency(Math.round(sealedValue))} sub="Held in sealed bottles" accent="#10B981" />
                  <InsightStatCard icon={Zap} label="Open Bottle Exposure" value={formatCurrency(Math.round(openValue))} sub="At risk in open bottles" accent="#EF4444" />
                </>
              )}
              {valueConcentration.topPct > 0 && (
                <InsightStatCard icon={DollarSign} label="Value Concentration" value={`${valueConcentration.topPct}%`} sub="Top 20% of bottles" accent="#8B5CF6" />
              )}
            </InsightsKpiGrid>

            {topBottlesToHold.length > 0 && (
              <InsightPanel>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-red-400" />
                  <InsightSectionHeading>Top Bottles to Hold</InsightSectionHeading>
                </div>
                <div className="space-y-2">
                  {topBottlesToHold.map((b, i) => (
                    <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div>
                        <p className="text-sm font-medium text-[#F5F1E7]">{b.name || '—'}</p>
                        <p className="text-xs" style={{ color: 'rgba(216,199,166,0.6)' }}>{b.distillery || b.type || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#F5F1E7]">{formatCurrency(getBottleValue(b))}</p>
                        <p className="text-xs" style={{ color: 'rgba(216,199,166,0.6)' }}>Rarity {b._rarityScore}/100</p>
                      </div>
                    </div>
                  ))}
                </div>
              </InsightPanel>
            )}

            {bottlesSafeToOpen.length > 0 && (
              <InsightPanel>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <InsightSectionHeading>Safe to Open</InsightSectionHeading>
                </div>
                <div className="space-y-2">
                  {bottlesSafeToOpen.map((b, i) => (
                    <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <div>
                        <p className="text-sm font-medium text-[#F5F1E7]">{b.name || '—'}</p>
                        <p className="text-xs" style={{ color: 'rgba(216,199,166,0.6)' }}>{b.type || '—'} · {b.country || '—'}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#F5F1E7]">{formatCurrency(getBottleValue(b))}</p>
                    </div>
                  ))}
                </div>
              </InsightPanel>
            )}

            {replacementRiskBottles.length > 0 && (
              <InsightPanel>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <InsightSectionHeading>Replacement Risk</InsightSectionHeading>
                </div>
                <div className="space-y-2">
                  {replacementRiskBottles.map((b, i) => (
                    <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                      <div>
                        <p className="text-sm font-medium text-[#F5F1E7]">{b.name || '—'}</p>
                        <p className="text-xs" style={{ color: 'rgba(216,199,166,0.6)' }}>{b._difficulty ? DIFFICULTY_LABELS[b._difficulty] : '—'}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#F5F1E7]">{formatCurrency(getBottleValue(b))}</p>
                    </div>
                  ))}
                </div>
              </InsightPanel>
            )}

            {topBottlesToHold.length === 0 && bottlesSafeToOpen.length === 0 && replacementRiskBottles.length === 0 && (
              <InsightsEmptyState message="Add bottle details (age, type, production status) to enable value strategy insights." />
            )}
          </div>
        )}

        {/* STATS */}
        {activeTab === 'stats' && <WhiskeyAnalyticsTab bottles={bottles} />}

        {/* TRENDS */}
        {activeTab === 'trends' && <WhiskeyTrendsTab bottles={bottles} tastingLogs={tastingLogs} />}

        {/* SESSIONS */}
        {activeTab === 'sessions' && (
          <InsightsSessionPanel
            calendar={
              <Calendar
                mode="single"
                selected={new Date(`${calSelectedDate}T12:00:00`)}
                onSelect={(date) => { if (date) setCalSelectedDate(toLocalDateYmd(date)); }}
                modifiers={{ hasSessions: whiskeyHighlights }}
                modifiersClassNames={{ hasSessions: 'ring-1 ring-[#B48C4B] ring-offset-0' }}
              />
            }
            selectedDate={calSelectedDate}
            onSelectDate={setCalSelectedDate}
            dayRows={whiskeySelectedDayRows}
            emptyLabel="No tastings logged for this day."
          />
        )}

        {/* REPORTS */}
        {activeTab === 'reports' && (
          <InsightPanel>
            <InsightSectionHeading>{t('insights.reports', 'Export Reports')}</InsightSectionHeading>
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.2)' }}>
                <h4 className="font-semibold text-[#F5F1E7] mb-1">Collection Summary</h4>
                <p className="text-sm mb-3" style={{ color: 'rgba(216,199,166,0.8)' }}>
                  {bottleTypes} bottle type{bottleTypes !== 1 ? 's' : ''}, {totalBottles} total bottle{totalBottles !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleExportPDF} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(163,92,92,0.3)', color: '#F5F1E7', border: '1px solid rgba(163,92,92,0.4)' }}>
                    <FileText className="w-4 h-4 inline mr-1" />Export PDF
                  </button>
                  <button onClick={async () => {
                    const csv = [['Bottle Type (Name)', 'Whiskey Style', 'Country', 'Retail Price', 'Rating'].join(','), ...bottles.map(b => [`"${b.name || ''}"`, b.type || '', b.country || '', b.retail_price || 0, b.rating || ''].join(','))].join('\n');
                    const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); link.download = `collection-summary-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
                  }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(180,140,75,0.25)', color: '#F5F1E7' }}>
                    <Download className="w-4 h-4 inline mr-1" />Export CSV
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(46,125,92,0.08)', border: '1px solid rgba(46,125,92,0.22)' }}>
                <h4 className="font-semibold text-[#F5F1E7] mb-1">Insurance Report</h4>
                <p className="text-sm mb-3" style={{ color: 'rgba(216,199,166,0.8)' }}>Export a detailed insurance report with photos, values, and descriptions</p>
                <WhiskeyInsuranceExporter user={user} bottles={bottles} inventoryUnits={inventoryUnits} />
              </div>
            </div>
          </InsightPanel>
        )}
      </InsightsPageShell>
    </LockedModuleGuard>
  );
}