import React, { useState, useRef } from 'react';
import { useQuery, useMemo } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import ModuleNav from '@/components/modules/ModuleNav';
import { WhiskeyAnalyticsTab } from '@/components/whiskey/WhiskeyInsightsAnalytics';
import { WhiskeyHighlightCard, WhiskeyStoryCardModal, captureAndShareWhiskeyCard } from '@/components/whiskey/WhiskeyHighlightCard';
import { Wine, BookOpen, TrendingUp, BarChart3, Award, Trophy, Star, Zap } from 'lucide-react';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO, subDays, isWithinInterval } from 'date-fns';
import { StatusCard, CATEGORY_COLORS } from '@/components/ui/HeroCard';

export default function WhiskeyInsightsPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('summary');
  const [activeStory, setActiveStory] = useState(null);
  const highlightRefs = useRef({});
  const storyRef = useRef(null);

  const moduleNavItems = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', icon: Wine },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

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

  // Compute insights metrics
  const totalBottles = useMemo(() => bottles.length, [bottles]);
  const openBottles = useMemo(() => inventoryUnits.filter(u => u.status === 'open').length, [inventoryUnits]);
  const sealedBottles = useMemo(() => inventoryUnits.filter(u => u.status === 'reserve' || u.status === 'drinking').length, [inventoryUnits]);
  const totalTastings = useMemo(() => tastingLogs.length, [tastingLogs]);

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

  const collectionValue = useMemo(() => {
    return {
      retail: bottles.reduce((sum, b) => sum + (Number(b.retail_price) || 0), 0),
      aftermarket: bottles.reduce((sum, b) => sum + (Number(b.aftermarket_price) || 0), 0),
      collector: bottles.reduce((sum, b) => sum + (Number(b.collector_value) || 0), 0),
    };
  }, [bottles]);

  const totalValue = useMemo(() => {
    return Math.max(
      collectionValue.retail,
      collectionValue.aftermarket,
      collectionValue.collector
    );
  }, [collectionValue]);

  const averageRating = useMemo(() => {
    const rated = bottles.filter(b => b.rating);
    return rated.length > 0
      ? (rated.reduce((sum, b) => sum + Number(b.rating), 0) / rated.length).toFixed(2)
      : 0;
  }, [bottles]);

  const mostValuedBottle = useMemo(() => {
    if (!bottles.length) return null;
    return bottles.reduce((max, b) => {
      const val = Math.max(
        Number(b.retail_price) || 0,
        Number(b.aftermarket_price) || 0,
        Number(b.collector_value) || 0
      );
      const maxVal = Math.max(
        Number(max.retail_price) || 0,
        Number(max.aftermarket_price) || 0,
        Number(max.collector_value) || 0
      );
      return val > maxVal ? b : max;
    });
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
    tastingLogs.forEach(log => {
      if (log.bottle_name) {
        tasted[log.bottle_name] = (tasted[log.bottle_name] || 0) + 1;
      }
    });
    const topName = Object.entries(tasted).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topName) return null;
    return { bottle: bottles.find(b => b.name === topName), count: tasted[topName] };
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

  const hasData = bottles.length > 0 || tastingLogs.length > 0;

  const handleShareCard = async (key) => {
    const node = highlightRefs.current[key];
    if (!node) return;
    try {
      await captureAndShareWhiskeyCard(node, `whiskeykeeper-${key}`);
      toast.success('Card shared!');
    } catch (err) {
      toast.error('Failed to share card');
    }
  };

  const handleExportStory = async () => {
    const node = storyRef.current;
    if (!node) return;
    try {
      await captureAndShareWhiskeyCard(node, 'whiskeykeeper-story');
      toast.success('Story exported!');
    } catch (err) {
      toast.error('Failed to export story');
    }
  };

  return (
    <div className="space-y-6">
      <ModuleNav items={moduleNavItems} currentPath="/WhiskeyInsights" />

      {activeStory && (
        <WhiskeyStoryCardModal
          {...activeStory}
          storyRef={storyRef}
          onClose={() => setActiveStory(null)}
          onExport={handleExportStory}
        />
      )}

      <div>
        <h1
          className="text-4xl font-bold tracking-tight mb-2"
          style={{
            color: '#F5F1E7',
            fontFamily: "'Georgia', serif",
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          }}
        >
          {t('whiskeykeeper.insights') || 'Collection Insights'}
        </h1>
        <p style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
          {t('whiskeykeeper.insightsDescription') || 'Analyze your whiskey collection'}
        </p>
      </div>

      {bottles.length > 0 ? (
        <div className="space-y-8">
          {/* Tab Navigation */}
          <div className="flex gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(180,140,75,0.2)' }}>
            {['summary', 'usage', 'stats', 'trends', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  color: activeTab === tab ? '#D4A574' : 'rgba(224,216,200,0.7)',
                  background: activeTab === tab ? 'rgba(180,140,75,0.15)' : 'transparent',
                  borderBottom: activeTab === tab ? '2px solid #D4A574' : 'none',
                }}
              >
                {t(`insights.tab_${tab}`) || tab}
              </button>
            ))}
          </div>

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <StatusCard
                  icon={Wine}
                  label={t('insights.totalBottles') || 'Total Bottles'}
                  value={totalBottles}
                  accent={CATEGORY_COLORS.pipe}
                />
                <StatusCard
                  icon={Zap}
                  label={t('insights.openBottles') || 'Open Bottles'}
                  value={openBottles}
                  accent="#EF4444"
                />
                <StatusCard
                  icon={Trophy}
                  label={t('insights.sealedBottles') || 'Sealed Bottles'}
                  value={sealedBottles}
                  accent="#10B981"
                />
                <StatusCard
                  icon={Star}
                  label={t('insights.totalTastings') || 'Total Tastings'}
                  value={totalTastings}
                  sub={`${tastingsThisWeek} ${t('insights.thisWeek')}`}
                  accent={CATEGORY_COLORS.tobacco}
                />
                <StatusCard
                  icon={TrendingUp}
                  label={t('insights.collectionValue') || 'Collection Value'}
                  value={formatCurrency(Math.round(totalValue))}
                  accent={CATEGORY_COLORS.value}
                />
                <StatusCard
                  icon={Award}
                  label={t('insights.averageRating') || 'Average Rating'}
                  value={`${averageRating}/5`}
                  accent="#8B5CF6"
                />
              </div>

              {/* Highlight Cards */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold" style={{ color: '#F5F1E7' }}>
                  {t('insights.highlights') || 'Collection Highlights'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mostTastedBottle && (
                    <WhiskeyHighlightCard
                      title={t('insights.mostTastedBottle') || 'Most Tasted Bottle'}
                      value={mostTastedBottle.bottle.name}
                      sub={`${mostTastedBottle.count} tastings`}
                      accent="#C87941"
                      icon={Star}
                      patternIndex={0}
                      heroImage={mostTastedBottle.bottle.photo}
                      cardRef={(el) => { highlightRefs.current.mostTasted = el; }}
                      onShare={() => handleShareCard('mostTasted')}
                      onStory={() => setActiveStory({
                        title: t('insights.mostTastedBottle') || 'Most Tasted Bottle',
                        value: mostTastedBottle.bottle.name,
                        sub: `${mostTastedBottle.count} tastings`,
                        accent: '#C87941',
                        icon: Star,
                        heroImage: mostTastedBottle.bottle.photo,
                      })}
                    />
                  )}

                  {mostValuedBottle && (
                    <WhiskeyHighlightCard
                      title={t('insights.mostValuedBottle') || 'Most Valued Bottle'}
                      value={mostValuedBottle.name}
                      sub={formatCurrency(Math.max(
                        Number(mostValuedBottle.retail_price) || 0,
                        Number(mostValuedBottle.aftermarket_price) || 0,
                        Number(mostValuedBottle.collector_value) || 0
                      ))}
                      accent="#C0392B"
                      icon={Trophy}
                      patternIndex={1}
                      heroImage={mostValuedBottle.photo}
                      cardRef={(el) => { highlightRefs.current.mostValued = el; }}
                      onShare={() => handleShareCard('mostValued')}
                      onStory={() => setActiveStory({
                        title: t('insights.mostValuedBottle') || 'Most Valued Bottle',
                        value: mostValuedBottle.name,
                        sub: formatCurrency(Math.max(
                          Number(mostValuedBottle.retail_price) || 0,
                          Number(mostValuedBottle.aftermarket_price) || 0,
                          Number(mostValuedBottle.collector_value) || 0
                        )),
                        accent: '#C0392B',
                        icon: Trophy,
                        heroImage: mostValuedBottle.photo,
                      })}
                    />
                  )}

                  {oldestBottle && (
                    <WhiskeyHighlightCard
                      title={t('insights.oldestBottle') || 'Oldest Bottle'}
                      value={oldestBottle.name}
                      sub={oldestBottle.purchase_date ? new Date(oldestBottle.purchase_date).getFullYear().toString() : 'Unknown'}
                      accent="#10B981"
                      icon={Zap}
                      patternIndex={2}
                      heroImage={oldestBottle.photo}
                      cardRef={(el) => { highlightRefs.current.oldest = el; }}
                      onShare={() => handleShareCard('oldest')}
                      onStory={() => setActiveStory({
                        title: t('insights.oldestBottle') || 'Oldest Bottle',
                        value: oldestBottle.name,
                        sub: oldestBottle.purchase_date ? new Date(oldestBottle.purchase_date).getFullYear().toString() : 'Unknown',
                        accent: '#10B981',
                        icon: Zap,
                        heroImage: oldestBottle.photo,
                      })}
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
                {t('insights.tastingActivity') || 'Tasting Activity'}
              </h3>
              {tastingLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tastingLogs.slice(0, 20).map((log, idx) => (
                    <div key={idx} className="p-4 rounded-lg" style={{
                      background: 'rgba(180,140,75,0.05)',
                      border: '1px solid rgba(180,140,75,0.15)',
                    }}>
                      <p style={{ color: '#F5F1E7' }}>{log.bottle_name}</p>
                      <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
                        {new Date(log.tasting_date).toLocaleDateString()} - {log.notes}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(224,216,200,0.6)' }}>No tastings logged</p>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="rounded-2xl p-6" style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
              border: '1px solid rgba(180, 140, 75, 0.15)',
            }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
                {t('insights.collectionStats') || 'Collection Statistics'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(180,140,75,0.08)' }}>
                  <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Average Consumption</p>
                  <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>{tastingPerWeek} per week</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Unique Types</p>
                  <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>
                    {[...new Set(bottles.map(b => b.type))].length}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Countries Represented</p>
                  <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>
                    {[...new Set(bottles.map(b => b.country))].length}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)' }}>
                  <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Rated Bottles</p>
                  <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>
                    {bottles.filter(b => b.rating).length} / {bottles.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <WhiskeyAnalyticsTab bottles={bottles} tastingLogs={tastingLogs} />
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="rounded-2xl p-6" style={{
              background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
              border: '1px solid rgba(180, 140, 75, 0.15)',
            }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
                {t('insights.reports') || 'Export Reports'}
              </h3>
              <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>
                Report export functionality coming soon
              </p>
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
            {t('whiskeykeeper.noInsights') || 'No insights yet'}
          </h2>
          <p style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('whiskeykeeper.addBottlesForInsights') || 'Add bottles to your collection to see insights'}
          </p>
        </div>
      )}
    </div>
  );
}