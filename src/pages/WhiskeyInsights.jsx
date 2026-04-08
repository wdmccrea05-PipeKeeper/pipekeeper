import React, { useState, useRef, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import { WhiskeyAnalyticsTab, WhiskeyTrendsTab, getTopBottlesToHold, getBottlesSafeToOpen, getReplacementRiskBottles, getValueConcentration } from '@/components/whiskey/WhiskeyInsightsAnalytics';
import WhiskeyHighlightCard from '@/components/whiskey/WhiskeyHighlightCard';
import { TrendingUp, Award, Trophy, Star, Zap, ShieldCheck, Sparkles, AlertTriangle, DollarSign } from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO, subDays, isWithinInterval } from 'date-fns';
import { StatusCard, CATEGORY_COLORS } from '@/components/ui/HeroCard';
import { DIFFICULTY_LABELS } from '@/components/valuation/valueEngine';
import {
  selectWhiskeyMetrics,
  getBottleUnitValue,
  selectOpenBottleValue,
  selectSealedBottleValue,
} from '@/lib/collection/whiskeySelectors';

export default function WhiskeyInsightsPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('summary');
  const highlightRefs = useRef({});

  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 100);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const { data: inventoryUnits = [] } = useQuery({
    queryKey: ['whiskey-inventory', user?.email],
    queryFn: async () => {
      const result = await base44.entities.WhiskeyInventoryUnit.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  // Canonical whiskey metrics via shared selector layer — single source of truth
  const whiskeyMetrics = useMemo(
    () => selectWhiskeyMetrics(bottles, inventoryUnits, tastingLogs),
    [bottles, inventoryUnits, tastingLogs]
  );
  const bottleTypes = whiskeyMetrics.bottle_types;
  const totalBottles = whiskeyMetrics.total_bottles;
  const openBottles = whiskeyMetrics.open_bottles;
  const sealedBottles = whiskeyMetrics.sealed_bottles;
  const totalTastings = whiskeyMetrics.total_tastings;
  const totalValue = whiskeyMetrics.collection_value;

  const now = new Date();
  const oneWeekAgo = subDays(now, 7);
  const tastingsThisWeek = useMemo(
    () =>
      tastingLogs.filter((l) => {
        try {
          if (!l?.tasting_date) return false;
          const d = parseISO(l.tasting_date.slice(0, 10));
          return isWithinInterval(d, { start: oneWeekAgo, end: now });
        } catch {
          return false;
        }
      }).length,
    [tastingLogs, oneWeekAgo, now]
  );

  // FIXED: sum per-bottle canonical values using canonical priority
  // totalValue is now derived from whiskeyMetrics above (unit_value × unit_count per bottle)

  const averageRating = useMemo(() => {
    const rated = bottles.filter(b => b.rating != null && b.rating !== '' && Number(b.rating) > 0);
    return rated.length > 0
      ? (rated.reduce((sum, b) => sum + Number(b.rating), 0) / rated.length).toFixed(2)
      : 0;
  }, [bottles]);

  // Canonical single-bottle value via shared selector
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
    tastingLogs.forEach((log) => {
      const rawName = typeof log?.bottle_name === 'string' ? log.bottle_name.trim() : '';
      if (!rawName) return;
      tasted[rawName] = (tasted[rawName] || 0) + 1;
    });

    const topEntry = Object.entries(tasted).sort((a, b) => b[1] - a[1])[0];
    if (!topEntry) return null;

    const [topName, count] = topEntry;

    const matchedBottle =
      bottles.find((b) => b?.id && tastingLogs.some((l) => l?.bottle_id === b.id && (l?.bottle_name || '').trim() === topName)) ||
      bottles.find((b) => (b?.name || '').trim().toLowerCase() === topName.toLowerCase()) ||
      null;

    return {
      name: matchedBottle?.name || topName,
      bottle: matchedBottle,
      count,
      photo: matchedBottle?.photo || null,
    };
  }, [tastingLogs, bottles]);

  const tastingPerWeek = useMemo(() => {
    if (!tastingLogs.length) return 0;
    const oldestLog = [...tastingLogs].sort((a, b) => {
      const aDate = new Date(a.tasting_date || 0);
      const bDate = new Date(b.tasting_date || 0);
      return aDate - bDate;
    })[0];
    if (!oldestLog) return 0;
    const weeks = Math.max(1, Math.ceil(differenceInCalendarDays(now, new Date(oldestLog.tasting_date)) / 7));
    return (tastingLogs.length / weeks).toFixed(1);
  }, [tastingLogs]);

  const topBottlesToHold = useMemo(() => getTopBottlesToHold(bottles, 5), [bottles]);
  const bottlesSafeToOpen = useMemo(() => getBottlesSafeToOpen(bottles, 5), [bottles]);
  const replacementRiskBottles = useMemo(() => getReplacementRiskBottles(bottles, 5), [bottles]);
  const valueConcentration = useMemo(() => getValueConcentration(bottles), [bottles]);

  const sealedValue = useMemo(
    () => selectSealedBottleValue(bottles, inventoryUnits),
    [bottles, inventoryUnits]
  );

  const openValue = useMemo(
    () => selectOpenBottleValue(bottles, inventoryUnits),
    [bottles, inventoryUnits]
  );

  const hasData = bottles.length > 0 || tastingLogs.length > 0;

  const handleShareCard = async (key) => {
    // Share card functionality - placeholder
    toast.success('Card shared!');
  };

  const handleExportPDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();

      doc.setFontSize(20);
      doc.setTextColor(40, 20, 10);
      doc.text('WhiskeyKeeper — Collection Report', 20, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 80, 60);
      doc.text(`Generated: ${date}`, 20, 30);

      doc.setFontSize(14);
      doc.setTextColor(40, 20, 10);
      doc.text('Collection Summary', 20, 44);

      doc.setFontSize(11);
      doc.setTextColor(60, 40, 20);
      doc.text(`Bottle Types: ${bottleTypes}`, 20, 54);
      doc.text(`Total Bottles: ${totalBottles}`, 20, 62);
      doc.text(`Open Bottles: ${openBottles}`, 20, 70);
      doc.text(`Total Tastings: ${totalTastings}`, 20, 78);
      doc.text(`Collection Value: ${formatCurrency(Math.round(totalValue))}`, 20, 86);
      doc.text(`Average Rating: ${averageRating}/5`, 20, 94);

      if (mostValuedBottle) {
        doc.text(`Most Valued: ${mostValuedBottle.name} (${formatCurrency(getBottleValue(mostValuedBottle))})`, 20, 102);
      }

      // Bottles table
      doc.setFontSize(14);
      doc.setTextColor(40, 20, 10);
      doc.text('Bottles', 20, 118);

      doc.setFontSize(9);
      doc.setTextColor(60, 40, 20);
      const headers = ['Name', 'Type', 'Country', 'Value', 'Rating'];
      const colX = [20, 80, 120, 150, 180];
      headers.forEach((h, i) => doc.text(h, colX[i], 126));
      doc.setDrawColor(180, 140, 75);
      doc.line(20, 128, 190, 128);

      let y = 135;
      bottles.forEach((b) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const val = getBottleValue(b);
        doc.text(String(b.name || '').slice(0, 28), colX[0], y);
        doc.text(String(b.type || '').slice(0, 18), colX[1], y);
        doc.text(String(b.country || '').slice(0, 14), colX[2], y);
        doc.text(val > 0 ? formatCurrency(val) : '—', colX[3], y);
        doc.text(b.rating ? String(b.rating) : '—', colX[4], y);
        y += 8;
      });

      // Tastings
      if (tastingLogs.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        y += 6;
        doc.setFontSize(14);
        doc.setTextColor(40, 20, 10);
        doc.text('Tasting History', 20, y);
        y += 10;
        doc.setFontSize(9);
        doc.setTextColor(60, 40, 20);
        tastingLogs.slice(0, 30).forEach((l) => {
          if (y > 275) { doc.addPage(); y = 20; }
          const dateStr = l.tasting_date ? new Date(l.tasting_date).toLocaleDateString() : '—';
          doc.text(`${dateStr}  ${String(l.bottle_name || '').slice(0, 35)}${l.rating ? `  ★${l.rating}` : ''}`, 20, y);
          y += 7;
        });
      }

      doc.save(`whiskeykeeper-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('[WhiskeyInsights] PDF export failed:', err);
    }
  }, [bottles, tastingLogs, bottleTypes, totalBottles, openBottles, totalTastings, totalValue, averageRating, mostValuedBottle]);



  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
    <div className="space-y-6">
      <WhiskeyKeeperModuleNav currentPageName="WhiskeyInsights" />



      <div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 break-words"
          style={{
            color: '#F5F1E7',
            fontFamily: "'Georgia', serif",
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
            wordBreak: "break-word",
            hyphens: "none"
          }}
        >
          {t('whiskeykeeper.insightsTitle', 'Collection Insights')}
        </h1>
        <p style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
          {t('whiskeykeeper.insightsSubtitle', 'Analyze your whiskey collection')}
        </p>
      </div>

      {bottles.length > 0 ? (
        <div className="space-y-8">
          {/* Tab Navigation */}
          <div className="flex gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(180,140,75,0.2)' }}>
            {[
              { key: 'summary', label: t('insights.tabSummary', 'Summary') },
              { key: 'value', label: t('insights.tabValue', 'Value') },
              { key: 'usage', label: t('insights.tabUsage', 'Usage') },
              { key: 'stats', label: t('insights.tabStats', 'Statistics') },
              { key: 'trends', label: t('insights.tabTrends', 'Trends') },
              { key: 'reports', label: t('insights.tabReports', 'Reports') }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  color: activeTab === key ? '#D4A574' : 'rgba(224,216,200,0.7)',
                  background: activeTab === key ? 'rgba(180,140,75,0.15)' : 'transparent',
                  borderBottom: activeTab === key ? '2px solid #D4A574' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <StatusCard
                  icon={WhiskeyKeeperIcon}
                  label="Bottle Types"
                  value={bottleTypes}
                  sub="Distinct labels"
                  accent="#C87941"
                />
                <StatusCard
                  icon={Trophy}
                  label="Total Bottles"
                  value={totalBottles}
                  sub={inventoryUnits.length > 0 ? `${openBottles} open · ${sealedBottles} sealed` : 'physical inventory'}
                  accent="#C87941"
                />
                <StatusCard
                  icon={Zap}
                  label={t('insights.openBottles', 'Open Bottles')}
                  value={openBottles}
                  accent="#EF4444"
                />
                <StatusCard
                  icon={Star}
                  label={t('insights.totalTastings', 'Total Tastings')}
                  value={totalTastings}
                  sub={`${tastingsThisWeek} ${t('insights.thisWeek', 'This Week')}`}
                  accent={CATEGORY_COLORS.tobacco}
                />
                <StatusCard
                  icon={TrendingUp}
                  label={t('insights.collectionValue', 'Collection Value')}
                  value={formatCurrency(Math.round(totalValue))}
                  accent={CATEGORY_COLORS.value}
                />
                <StatusCard
                  icon={Award}
                  label={t('insights.averageRating', 'Average Rating')}
                  value={`${averageRating}/5`}
                  accent="#8B5CF6"
                />
              </div>

              {/* Highlight Cards */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>
                  {t('insights.highlights', 'Collection Highlights')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mostTastedBottle && (
                    <WhiskeyHighlightCard
                      title={t('insights.mostTastedBottle', 'Most Tasted Bottle')}
                      value={mostTastedBottle.name}
                      subtitle={`${mostTastedBottle.count} tastings`}
                      accent="#C87941"
                      photo={mostTastedBottle.photo}
                    />
                  )}

                  {mostValuedBottle && (
                    <WhiskeyHighlightCard
                      title={t('insights.mostValuedBottle', 'Most Valued Bottle')}
                      value={mostValuedBottle.name}
                      subtitle={formatCurrency(getBottleValue(mostValuedBottle))}
                      accent="#C0392B"
                      photo={mostValuedBottle.photo}
                    />
                  )}

                  {oldestBottle && (
                    <WhiskeyHighlightCard
                      title={t('insights.oldestBottle', 'Oldest Bottle')}
                      value={oldestBottle.name}
                      subtitle={
                        oldestBottle.purchase_date && !Number.isNaN(new Date(oldestBottle.purchase_date).getTime())
                          ? new Date(oldestBottle.purchase_date).getFullYear().toString()
                          : 'Unknown'
                      }
                      accent="#10B981"
                      photo={oldestBottle.photo}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="rounded-2xl p-6" style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
              border: '1px solid rgba(180, 140, 75, 0.15)',
            }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
                {t('insights.tastingActivity', 'Tasting Activity')}
              </h3>
              {tastingLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...new Map(tastingLogs.map(l => [l.id, l])).values()].slice(0, 50).map((log) => (
                    <div key={log.id} className="p-4 rounded-lg" style={{
                      background: 'rgba(180,140,75,0.05)',
                      border: '1px solid rgba(180,140,75,0.15)',
                    }}>
                      <p style={{ color: '#F5F1E7' }} className="font-medium">{log.bottle_name}</p>
                      <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                        {log.tasting_date && !Number.isNaN(new Date(log.tasting_date).getTime())
                          ? new Date(log.tasting_date).toLocaleDateString()
                          : 'Unknown date'}{log.rating ? ` · ★ ${log.rating}` : ''}
                      </p>
                      {log.notes ? <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.75)' }}>{log.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(224,216,200,0.6)' }}>No tastings logged</p>
              )}
            </div>
          )}

          {/* Value Tab */}
          {activeTab === 'value' && (
            <div className="space-y-6">
              {/* Value exposure overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatusCard
                  icon={TrendingUp}
                  label="Canonical Collection Value"
                  value={formatCurrency(Math.round(totalValue))}
                  sub="Engine-computed (canonical priority)"
                  accent={CATEGORY_COLORS.value}
                />
                {inventoryUnits.length > 0 && (
                  <>
                    <StatusCard
                      icon={ShieldCheck}
                      label="Sealed / Reserve Value"
                      value={formatCurrency(Math.round(sealedValue))}
                      sub="Value held in sealed bottles"
                      accent="#10B981"
                    />
                    <StatusCard
                      icon={Zap}
                      label="Open Bottle Exposure"
                      value={formatCurrency(Math.round(openValue))}
                      sub="Value at risk in open bottles"
                      accent="#EF4444"
                    />
                  </>
                )}
                {valueConcentration.topPct > 0 && (
                  <StatusCard
                    icon={DollarSign}
                    label="Value Concentration"
                    value={`${valueConcentration.topPct}%`}
                    sub={`Top 20% of bottles hold ${valueConcentration.topPct}% of value`}
                    accent="#8B5CF6"
                  />
                )}
              </div>

              {/* Top bottles to hold */}
              {topBottlesToHold.length > 0 && (
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-red-400" />
                    <h3 className="text-lg font-semibold text-[#F5F1E7]">Top Bottles to Hold</h3>
                  </div>
                  <div className="space-y-2">
                    {topBottlesToHold.map((b, i) => (
                      <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <div>
                          <p className="text-sm font-medium text-[#F5F1E7]">{b.name || '—'}</p>
                          <p className="text-xs text-[#D8C7A6]/60">{b.distillery || b.type || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#F5F1E7]">{formatCurrency(getBottleValue(b))}</p>
                          <p className="text-xs text-[#D8C7A6]/60">Rarity {b._rarityScore}/100</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottles safe to open */}
              {bottlesSafeToOpen.length > 0 && (
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-[#F5F1E7]">Safe to Open</h3>
                  </div>
                  <div className="space-y-2">
                    {bottlesSafeToOpen.map((b, i) => (
                      <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div>
                          <p className="text-sm font-medium text-[#F5F1E7]">{b.name || '—'}</p>
                          <p className="text-xs text-[#D8C7A6]/60">{b.type || '—'} · {b.country || '—'}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#F5F1E7]">{formatCurrency(getBottleValue(b))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Replacement risk */}
              {replacementRiskBottles.length > 0 && (
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-[#F5F1E7]">Replacement Risk</h3>
                    <span className="text-xs text-[#D8C7A6]/60">Hard to replace if opened</span>
                  </div>
                  <div className="space-y-2">
                    {replacementRiskBottles.map((b, i) => (
                      <div key={b.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                        <div>
                          <p className="text-sm font-medium text-[#F5F1E7]">{b.name || '—'}</p>
                          <p className="text-xs text-[#D8C7A6]/60">{b._difficulty ? DIFFICULTY_LABELS[b._difficulty] : '—'}</p>
                        </div>
                        <p className="text-sm font-semibold text-[#F5F1E7]">{formatCurrency(getBottleValue(b))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topBottlesToHold.length === 0 && bottlesSafeToOpen.length === 0 && replacementRiskBottles.length === 0 && (
                <p style={{ color: 'rgba(224,216,200,0.6)' }}>Add bottle details (age, type, production status) to enable value strategy insights.</p>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <WhiskeyAnalyticsTab bottles={bottles} />
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <WhiskeyTrendsTab bottles={bottles} tastingLogs={tastingLogs} />
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="rounded-2xl p-6" style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
              border: '1px solid rgba(180, 140, 75, 0.15)',
            }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
                {t('insights.reports', 'Export Reports')}
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.2)' }}>
                  <h4 className="font-semibold text-[#F5F1E7] mb-2">Collection Summary</h4>
                   <p className="text-sm text-[#D8C7A6]/80 mb-3">
                     Export your collection — {bottleTypes} bottle type{bottleTypes !== 1 ? 's' : ''}, {totalBottles} total bottle{totalBottles !== 1 ? 's' : ''}
                   </p>
                   <div className="flex gap-2 flex-wrap">
                   <button
                     onClick={handleExportPDF}
                     className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                     style={{ background: 'rgba(163,92,92,0.3)', color: '#F5F1E7', border: '1px solid rgba(163,92,92,0.4)' }}
                   >
                     Export as PDF
                   </button>
                   <button 
                     onClick={async () => {
                      try {
                        const csv = [
                          ['Bottle Type (Name)', 'Whiskey Style', 'Country', 'Retail Price', 'Rating', 'Inventory Units', 'Open Units', 'Sealed Units'].join(','),
                          ...bottles.map(b => {
                           const units = inventoryUnits.filter(u => u.bottle_id === b.id);
                           const openUnits = units.filter(u => u.status === 'open').length;
                           const sealedUnits = units.filter(u => u.status === 'reserve' || u.status === 'drinking').length;
                           const totalUnits = units.length > 0 ? units.length : (Number(b.bottle_count) || 1);
                           return [
                             `"${b.name || ''}"`,
                             b.type || '',
                             b.country || '',
                             b.retail_price || 0,
                             b.rating || '',
                             totalUnits,
                             openUnits,
                             sealedUnits,
                           ].join(',');
                          })
                        ].join('\n');

                        const link = document.createElement('a');
                        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                        link.download = `collection-summary-${new Date().toISOString().slice(0,10)}.csv`;
                        link.click();
                      } catch (e) {
                        console.error('Export failed:', e);
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'rgba(180,140,75,0.25)', color: '#F5F1E7' }}
                    >
                    Export as CSV
                    </button>
                    </div>
                    </div>

                <div className="p-4 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                 <h4 className="font-semibold text-[#F5F1E7] mb-2">Tasting History</h4>
                 <p className="text-sm text-[#D8C7A6]/80 mb-3">Export your tasting log with dates and notes</p>
                 <div className="flex gap-2 flex-wrap">
                 <button
                   onClick={() => {
                     const doc = new jsPDF();
                     let y = 18;
                     doc.setFontSize(16);
                     doc.text('WhiskeyKeeper Tasting History', 14, y);
                     y += 10;
                     doc.setFontSize(10);
                     tastingLogs.forEach((log, index) => {
                       const title = log?.bottle_name || 'Untitled tasting';
                       const date = log?.tasting_date
                         ? new Date(log.tasting_date).toLocaleDateString()
                         : 'Unknown date';
                       const rating =
                         log?.rating !== null && log?.rating !== undefined && log?.rating !== ''
                           ? `Rating: ${log.rating}`
                           : 'Rating: —';
                       const notes = (log?.notes || '').trim() || 'No notes';
                       const block = [`${index + 1}. ${title}`, `Date: ${date}`, rating, `Notes: ${notes}`, ''];
                       block.forEach((line) => {
                         if (y > 275) { doc.addPage(); y = 18; }
                         doc.text(line, 14, y);
                         y += 6;
                       });
                     });
                     doc.save('whiskeykeeper-tasting-history.pdf');
                   }}
                   className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                   style={{ background: 'rgba(163,92,92,0.3)', color: '#F5F1E7', border: '1px solid rgba(163,92,92,0.4)' }}
                 >
                   Export as PDF
                 </button>
                 <button 
                   onClick={async () => {
                     try {
                       const csv = [
                         ['Date', 'Bottle', 'Rating', 'Notes'].join(','),
                         ...tastingLogs.map(l => [
                           l.tasting_date && !Number.isNaN(new Date(l.tasting_date).getTime())
                             ? new Date(l.tasting_date).toLocaleDateString()
                             : '',
                           `"${l.bottle_name || ''}"`,
                           l.rating || '',
                           `"${(l.notes || '').replace(/"/g, '""')}"`
                         ].join(','))
                       ].join('\n');

                       const link = document.createElement('a');
                       link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                       link.download = `tasting-log-${new Date().toISOString().slice(0,10)}.csv`;
                       link.click();
                     } catch (e) {
                       console.error('Export failed:', e);
                     }
                   }}
                   className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                   style={{ background: 'rgba(139,92,246,0.25)', color: '#F5F1E7' }}
                 >
                   Export as CSV
                 </button>
                 </div>
                </div>

                <div className="p-4 rounded-lg" style={{ background: 'rgba(46,125,92,0.08)', border: '1px solid rgba(46,125,92,0.22)' }}>
                  <h4 className="font-semibold text-[#F5F1E7] mb-2">Insurance Report</h4>
                  <p className="text-sm text-[#D8C7A6]/80 mb-3">Export a detailed insurance report with photos, values, and descriptions</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={async () => {
                        try {
                          const doc = new jsPDF();
                          const pw = doc.internal.pageSize.getWidth();
                          const ph = doc.internal.pageSize.getHeight();
                          const fmtMoney = (n) => n > 0 ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

                          doc.setFontSize(20);
                          doc.setTextColor(40, 20, 10);
                          doc.text('WhiskeyKeeper — Insurance Report', pw / 2, 20, { align: 'center' });
                          doc.setFontSize(10);
                          doc.setTextColor(100, 80, 60);
                          doc.text(`Generated: ${new Date().toLocaleDateString()}`, pw / 2, 28, { align: 'center' });
                          doc.text(`Owner: ${user?.full_name || user?.email || ''}`, pw / 2, 34, { align: 'center' });

                          const totalVal = totalValue; // canonical value from shared selectors
                          doc.setFontSize(11);
                          doc.setTextColor(60, 40, 20);
                          doc.text(`Total Collection Value: ${fmtMoney(totalVal)}`, 20, 44);
                          doc.text(`Total Bottle Types: ${bottleTypes}`, 20, 51);

                          const loadImg = (url) => new Promise((resolve) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                              try {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.naturalWidth;
                                canvas.height = img.naturalHeight;
                                canvas.getContext('2d').drawImage(img, 0, 0);
                                resolve(canvas.toDataURL('image/jpeg', 0.75));
                              } catch { resolve(null); }
                            };
                            img.onerror = () => resolve(null);
                            img.src = url;
                          });

                          let y = 62;
                          for (const [idx, bottle] of bottles.entries()) {
                            if (y > ph - 60) { doc.addPage(); y = 20; }

                            doc.setDrawColor(180, 140, 75);
                            doc.setLineWidth(0.4);
                            doc.line(20, y, pw - 20, y);
                            y += 5;

                            const photo = bottle.photo || (Array.isArray(bottle.photos) ? bottle.photos[0] : null);
                            let imgX = 20;
                            let textX = 20;
                            if (photo) {
                              const dataUrl = await loadImg(photo);
                              if (dataUrl) {
                                const imgW = 35;
                                const imgH = 50;
                                if (y + imgH > ph - 20) { doc.addPage(); y = 20; }
                                doc.addImage(dataUrl, 'JPEG', imgX, y, imgW, imgH);
                                textX = imgX + imgW + 5;
                              }
                            }

                            const textStartY = y;
                            doc.setFont(undefined, 'bold');
                            doc.setFontSize(10);
                            doc.setTextColor(40, 20, 10);
                            doc.text(`${idx + 1}. ${bottle.name || 'Unnamed'}`, textX, textStartY + 6);

                            doc.setFont(undefined, 'normal');
                            doc.setFontSize(9);
                            doc.setTextColor(60, 40, 20);
                            let ty = textStartY + 12;

                            const fields = [
                              bottle.distillery ? `Distillery: ${bottle.distillery}` : null,
                              [bottle.type, bottle.region, bottle.country].filter(Boolean).join(' | ') || null,
                              [bottle.age ? `Age: ${bottle.age} yr` : null, bottle.abv ? `ABV: ${bottle.abv}%` : null, bottle.bottle_size || null].filter(Boolean).join(' | ') || null,
                              `Value: ${fmtMoney(getBottleValue(bottle))}`,
                              bottle.purchase_price ? `Purchase Price: ${fmtMoney(bottle.purchase_price)}` : null,
                              bottle.purchase_date ? `Purchased: ${new Date(bottle.purchase_date).toLocaleDateString()}` : null,
                            ].filter(Boolean);

                            fields.forEach((line) => {
                              if (ty > ph - 20) { doc.addPage(); ty = 20; }
                              doc.text(line, textX, ty);
                              ty += 5;
                            });

                            if (bottle.notes) {
                              const notesLines = doc.splitTextToSize(`Notes: ${bottle.notes}`, pw - textX - 20);
                              if (ty + notesLines.length * 4.5 > ph - 20) { doc.addPage(); ty = 20; }
                              doc.text(notesLines, textX, ty);
                              ty += notesLines.length * 4.5;
                            }

                            y = Math.max(ty, y + (photo ? 55 : 0)) + 6;
                          }

                          doc.save(`whiskey-insurance-report-${new Date().toISOString().slice(0,10)}.pdf`);
                        } catch(err) {
                          console.error('Insurance report failed:', err);
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: 'rgba(46,125,92,0.3)', color: '#F5F1E7', border: '1px solid rgba(46,125,92,0.4)' }}
                    >
                      Export as PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.3), rgba(31, 21, 16, 0.3))',
            border: '1px solid rgba(180, 140, 75, 0.15)',
          }}
        >
          <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(180,140,75,0.5)' }} />
          <h2 style={{ color: '#F5F1E7' }} className="text-xl font-semibold mb-2">
            {t('whiskeykeeper.noInsights', 'No insights yet')}
          </h2>
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('whiskeykeeper.addBottlesForInsights', 'Add bottles to your collection to see insights')}
          </p>
        </div>
      )}
    </div>
    </LockedModuleGuard>
  );
}