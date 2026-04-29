import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Wine, Plus, BarChart3, BookOpen, Share2 } from 'lucide-react';
import ModulePageShell from '@/components/modules/ModulePageShell';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import { InsightsHighlightCard, InsightsHighlightGrid } from '@/components/insights/InsightsShell';
import { useCurrency } from '@/lib/currency/useCurrency';
import AddFlowModal from '@/components/addflow/AddFlowModal';
import ShareRecordModal from '@/components/share/ShareRecordModal';
import WineStoryHighlights from '@/components/wine/WineStoryHighlights';
import { selectWineCollectionValue, selectTotalWineBottles, selectWineReadyToDrinkCount, getWinePrimaryImage, getWineTotalValue } from '@/lib/collection/wineSelectors';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function RecentTastingCard({ tasting, t }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(139,58,58,0.28)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
            {tasting.wine_name || t('wine.unnamedWine', 'Unnamed Wine')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {formatDate(tasting.date)}
            {tasting.occasion ? ` · ${tasting.occasion}` : ''}
          </p>
          {tasting.notes && (
            <p className="text-xs mt-2 line-clamp-2" style={{ color: 'rgba(224,216,200,0.72)' }}>
              {tasting.notes}
            </p>
          )}
        </div>
        {tasting.rating > 0 && (
          <div className="shrink-0 text-right">
            <span className="text-base font-bold" style={{ color: '#8B3A3A' }}>{tasting.rating}</span>
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>/5</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WineKeeperInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { data: wines = [] } = useQuery({
    queryKey: ['wines-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Wine.filter(
        { created_by: user?.email },
        '-created_date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ['wine-tastings-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.WineTasting.filter(
        { created_by: user?.email },
        '-date',
        100
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const recentTastings = tastings.slice(0, 5);

  const highlights = useMemo(() => {
    if (wines.length === 0) return [];
    const cards = [];

    // Most Valuable Wine
    const mostVal = [...wines]
      .map((w) => ({ ...w, _tv: getWineTotalValue(w) }))
      .sort((a, b) => b._tv - a._tv)
      .find((w) => w._tv > 0);
    if (mostVal) {
      cards.push({
        key: 'mostValuable',
        title: t('wine.mostValuable', 'Most Valuable'),
        value: mostVal.name,
        subtitle: mostVal.producer ? `${mostVal.producer}${mostVal.vintage ? ` · ${mostVal.vintage}` : ''}` : mostVal.vintage || formatFromBase(mostVal._tv),
        accent: '#8B3A3A',
        photo: getWinePrimaryImage(mostVal),
        wineId: mostVal.id,
      });
    }

    // Drink Now — show actual wine name and photo
    const now = new Date();
    const drinkingNow = wines.filter((w) => {
      const start = w.drinking_window_start || w.drink_window_start;
      const end = w.drinking_window_end || w.drink_window_end;
      if (!start || !end) return false;
      return new Date(start) <= now && new Date(end) >= now;
    });
    if (drinkingNow.length > 0) {
      const dw = drinkingNow[0];
      cards.push({
        key: 'drinkingNow',
        title: t('wine.drinkingNow', 'Drink Now'),
        value: dw.name,
        subtitle: `${dw.producer || ''}${dw.vintage ? ` · ${dw.vintage}` : ''}`.trim() || t('wine.drinkingNowSubtitle', 'at peak drinking window'),
        accent: '#2E7D5C',
        photo: getWinePrimaryImage(dw),
        wineId: dw.id,
      });
    }

    // Highest Rated Wine
    const rated = wines.filter((w) => w.rating > 0).sort((a, b) => b.rating - a.rating);
    if (rated.length > 0) {
      cards.push({
        key: 'topRated',
        title: t('wine.topRated', 'Top Rated'),
        value: rated[0].name,
        subtitle: `★ ${rated[0].rating}/5${rated[0].producer ? ` · ${rated[0].producer}` : ''}`,
        accent: '#8B4B6B',
        photo: getWinePrimaryImage(rated[0]),
        wineId: rated[0].id,
      });
    }

    // Fallback: favorite wine
    if (cards.length < 3) {
      const favorites = wines.filter((w) => w.is_favorite);
      if (favorites.length > 0) {
        cards.push({
          key: 'favorite',
          title: t('wine.favorites', 'Favorites'),
          value: favorites[0].name,
          subtitle: favorites[0].producer || '',
          accent: '#8B3A3A',
          photo: getWinePrimaryImage(favorites[0]),
          wineId: favorites[0].id,
        });
      }
    }

    return cards.slice(0, 4);
  }, [wines, formatFromBase, t]);

  const quickLaunchActions = [
    { key: 'addWine', Icon: Plus, label: t('wine.addBottle', 'Add Bottle'), onClick: () => setShowAddModal(true) },
    { key: 'collection', Icon: Wine, label: t('wine.collection', 'Wine Collection'), onClick: () => navigate('/Wines') },
    { key: 'logTasting', Icon: BookOpen, label: t('wine.logTasting', 'Log Tasting'), onClick: () => navigate('/Wines?action=tasting') },
    { key: 'insights', Icon: BarChart3, label: t('nav.insights', 'Insights'), onClick: () => navigate('/WineInsights') },
    { key: 'curator', iconImage: CURATOR_ICON, label: t('quickActions.collectionCurator', 'Collection Curator'), onClick: () => navigate('/Curator') },
  ];

  const ratedWines = wines.filter(w => w.rating > 0);
  const avgRating = ratedWines.length > 0
    ? (ratedWines.reduce((s, w) => s + w.rating, 0) / ratedWines.length).toFixed(1)
    : '—';

  const wineStats = [
    { label: t('wine.totalBottles', 'Total Bottles'), value: wines.length },
    { label: t('wine.totalInCellar', 'In Cellar'), value: wines.reduce((s, w) => s + (w.quantity || 1), 0) },
    { label: t('wine.tastingsLogged', 'Tastings'), value: tastings.length },
    { label: t('wine.avgRating', 'Avg Rating'), value: avgRating },
  ];

  // Story narrative and metadata
  const collectionValue = useMemo(() => selectWineCollectionValue(wines), [wines]);
  const totalBottles = useMemo(() => selectTotalWineBottles(wines), [wines]);
  const readyToDrink = useMemo(() => selectWineReadyToDrinkCount(wines), [wines]);
  
  const topProducer = useMemo(() => {
    if (wines.length === 0) return null;
    const producers = {};
    wines.forEach(w => {
      if (w.producer) producers[w.producer] = (producers[w.producer] || 0) + 1;
    });
    return Object.entries(producers).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [wines]);

  const topVarietal = useMemo(() => {
    if (wines.length === 0) return null;
    const varietals = {};
    wines.forEach(w => {
      if (w.varietal) varietals[w.varietal] = (varietals[w.varietal] || 0) + 1;
    });
    return Object.entries(varietals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [wines]);

  const favoriteRegion = useMemo(() => {
    if (wines.length === 0) return null;
    const regions = {};
    wines.forEach(w => {
      const region = w.appellation || w.region || w.country_of_origin;
      if (region) regions[region] = (regions[region] || 0) + 1;
    });
    return Object.entries(regions).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }, [wines]);

  const highestRatedWine = useMemo(() => {
    if (wines.length === 0) return null;
    const rated = wines.filter(w => w.rating > 0).sort((a, b) => b.rating - a.rating);
    return rated[0] || null;
  }, [wines]);

  const mostValuableWine = useMemo(() => {
    if (wines.length === 0) return null;
    return [...wines]
      .sort((a, b) => getWineTotalValue(b) - getWineTotalValue(a))
      .find(w => getWineTotalValue(w) > 0) || null;
  }, [wines]);

  return (
    <>
    <ModulePageShell
      title={t('winekeeper.title', 'WineKeeper')}
      subtitle={t('winekeeper.description', 'Curate, age, and value your wine collection')}
      icon={<Wine className="w-6 h-6" style={{ color: '#C47070' }} />}
      accentColor="#8B3A3A"
      onBackToHub={() => navigate('/CollectionHub')}
      stats={wineStats}
      moduleNav={<WineKeeperModuleNav currentPageName={null} />}
      actions={<ModuleQuickLaunch actions={quickLaunchActions} />}
      isEmpty={wines.length === 0}
      emptyState={
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'rgba(139,58,58,0.07)', border: '1px solid rgba(139,58,58,0.22)' }}
        >
          <Wine className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(139,58,58,0.5)' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#F5F1E7' }}>
            {t('wine.noBottlesYet', 'No bottles yet')}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('wine.startTracking', 'Start tracking your wine collection')}
          </p>
          <Button onClick={() => setShowAddModal(true)} style={{ background: '#8B3A3A', color: '#F5F1E7' }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('wine.addFirstBottle', 'Add Your First Bottle')}
          </Button>
        </div>
      }
    >

      {highlights.length > 0 && (
        <InsightsHighlightGrid>
          {highlights.map((h) => (
            <InsightsHighlightCard
              key={h.key}
              title={h.title}
              value={h.value}
              subtitle={h.subtitle}
              accent={h.accent}
              photo={h.photo}
              onClick={() => h.wineId && navigate(`/Wines?highlight=${encodeURIComponent(h.wineId)}`)}
            />
          ))}
        </InsightsHighlightGrid>
      )}

      {recentTastings.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: 'rgba(180,140,75,0.8)' }}>
            {t('wine.recentTastings', 'Recent Tastings')}
          </h2>
          <div className="space-y-3">
            {recentTastings.map((tasting) => (
              <RecentTastingCard key={tasting.id} tasting={tasting} t={t} />
            ))}
          </div>
        </div>
      )}

      {wines.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(180,140,75,0.8)' }}>
              {t('wine.myWineStory', 'My Wine Story')}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowShareModal(true)}
              className="text-xs text-[#C47070] hover:bg-white/5"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              {t('common.share', 'Share')}
            </Button>
          </div>
          <div
            className="rounded-xl p-5 mb-5"
            style={{ background: 'rgba(163,92,92,0.08)', border: '1px solid rgba(139,58,58,0.2)' }}
          >
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.85)' }}>
              <p>
                {wines.length === 1
                  ? t('wine.storyOne', 'You have one wine in your collection.')
                  : t('wine.storyMultiple', `You've curated a collection of ${wines.length} wines`)}
                {totalBottles > wines.length && ` with ${totalBottles} total bottles in your cellar`}.
                {collectionValue > 0 && ` Your collection is valued at ${formatFromBase(collectionValue)}.`}
              </p>
              {topProducer && (
                <p>
                  {t('wine.storyProducer', 'Your most represented producer is')} <span className="font-semibold text-[#F5F1E7]">{topProducer}</span>,
                  {topVarietal && ` complemented by ${topVarietal} as your primary varietal`}.
                </p>
              )}
              {favoriteRegion && (
                <p>
                  {t('wine.storyRegion', 'You have a particular affinity for wines from')} <span className="font-semibold text-[#F5F1E7]">{favoriteRegion}</span>.
                </p>
              )}
              {highestRatedWine && (
                <p>
                  {t('wine.storyRated', 'Your highest-rated wine is')} <span className="font-semibold text-[#F5F1E7]">{highestRatedWine.name}</span>
                  {highestRatedWine.producer && ` from ${highestRatedWine.producer}`}
                  {highestRatedWine.rating && ` at ${highestRatedWine.rating}/5 stars`}.
                </p>
              )}
              {readyToDrink > 0 && (
                <p>
                  {t('wine.storyReady', `You currently have ${readyToDrink} wine${readyToDrink === 1 ? '' : 's'} at peak drinking window.`)}
                </p>
              )}
              {tastings.length > 0 && (
                <p>
                  {t('wine.storyTastings', `You've logged ${tastings.length} tasting${tastings.length === 1 ? '' : 's'}, building a rich tasting history.`)}
                </p>
              )}
            </div>
          </div>

          {/* Story highlights cards */}
          <WineStoryHighlights wines={wines} tastings={tastings} t={t} />
        </div>
      )}

      {wines.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'rgba(163,92,92,0.08)', border: '1px solid rgba(139,58,58,0.2)' }}
        >
          <p style={{ color: 'rgba(224,216,200,0.6)' }} className="text-sm">
            {t('wine.storyEmpty', 'Start adding wines to build your WineKeeper story.')}
          </p>
        </div>
      )}
    </ModulePageShell>

    <AddFlowModal
      open={showAddModal}
      onClose={() => setShowAddModal(false)}
      initialItemType="wine"
    />

    {showShareModal && (
      <ShareRecordModal
        type="wine_collection"
        onClose={() => setShowShareModal(false)}
      />
    )}
    </>
  );
}

export default function WineKeeper() {
  return <WineKeeperInner />;
}