import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Wine, Plus, BarChart3, BookOpen, Share2 } from 'lucide-react';
import ModulePageShell from '@/components/modules/ModulePageShell';
import ModuleHighlightsSection from '@/components/modules/ModuleHighlightsSection';
import ModuleRecentActivitySection from '@/components/modules/ModuleRecentActivitySection';
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import { useCurrency } from '@/lib/currency/useCurrency';
import AddFlowModal from '@/components/addflow/AddFlowModal';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';
import {
  getWinePrimaryImage,
  getWineTotalValue,
  getWineDisplayName,
  getWineProducer,
  selectTotalWineBottles,
  selectWineCollectionValue,
} from '@/lib/collection/wineSelectors';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

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
  const queryClient = useQueryClient();
  const { formatFromBase } = useCurrency();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: wines = [] } = useQuery({
    queryKey: QUERY_KEYS.wines(user?.email),
    queryFn: async () => {
      const result = await base44.entities.Wine.filter(
        { created_by: user?.email },
        '-created_date'
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: QUERY_KEYS.wineTastingsSummary(user?.email),
    queryFn: async () => {
      const result = await base44.entities.WineTasting.filter(
        { created_by: user?.email },
        '-date',
        100
      ).catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
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
        value: getWineDisplayName(mostVal),
        subtitle: getWineProducer(mostVal)
          ? `${getWineProducer(mostVal)}${mostVal.vintage ? ` · ${mostVal.vintage}` : ''}`
          : mostVal.vintage || formatFromBase(mostVal._tv),
        accent: '#8B3A3A',
        photo: getWinePrimaryImage(mostVal),
        onClick: () => navigate(`/Wines?highlight=${encodeURIComponent(mostVal.id)}`),
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
        value: getWineDisplayName(dw),
        subtitle: [getWineProducer(dw), dw.vintage].filter(Boolean).join(' · ') || t('wine.drinkingNowSubtitle', 'at peak drinking window'),
        accent: '#2E7D5C',
        photo: getWinePrimaryImage(dw),
        onClick: () => navigate(`/Wines?highlight=${encodeURIComponent(dw.id)}`),
      });
    }

    // Highest Rated Wine
    const rated = wines.filter((w) => w.rating > 0).sort((a, b) => b.rating - a.rating);
    if (rated.length > 0) {
      cards.push({
        key: 'topRated',
        title: t('wine.topRated', 'Top Rated'),
        value: getWineDisplayName(rated[0]),
        subtitle: `★ ${rated[0].rating}/5${getWineProducer(rated[0]) ? ` · ${getWineProducer(rated[0])}` : ''}`,
        accent: '#8B4B6B',
        photo: getWinePrimaryImage(rated[0]),
        onClick: () => navigate(`/Wines?highlight=${encodeURIComponent(rated[0].id)}`),
      });
    }

    // Fallback: Collection Value
    if (cards.length < 3) {
      const cv = selectWineCollectionValue(wines);
      if (cv > 0) {
        const tb = selectTotalWineBottles(wines);
        cards.push({
          key: 'collectionValue',
          title: t('wine.collectionValue', 'Collection Value'),
          value: formatFromBase(cv),
          subtitle: `${tb} ${tb === 1 ? t('wine.bottleSingular', 'bottle') : t('wine.bottlePlural', 'bottles')}`,
          accent: '#4A7C5E',
          photo: null,
          onClick: () => navigate('/WineInsights'),
        });
      }
    }

    // Fallback: Top Producer
    if (cards.length < 3) {
      const producerMap = {};
      wines.forEach((w) => {
        const p = getWineProducer(w);
        if (p) producerMap[p] = (producerMap[p] || 0) + 1;
      });
      const topProducerEntry = Object.entries(producerMap).sort((a, b) => b[1] - a[1])[0];
      if (topProducerEntry) {
        const [producer, count] = topProducerEntry;
        const sample = wines.find((w) => getWineProducer(w) === producer);
        cards.push({
          key: 'topProducer',
          title: t('wine.topProducer', 'Top Producer'),
          value: producer,
          subtitle: `${count} ${count === 1 ? t('wine.bottleSingular', 'bottle') : t('wine.bottlePlural', 'bottles')}`,
          accent: '#7B5EA7',
          photo: getWinePrimaryImage(sample),
          onClick: () => navigate('/Wines'),
        });
      }
    }

    // Fallback: Favorites
    if (cards.length < 3) {
      const favorites = wines.filter((w) => w.is_favorite);
      if (favorites.length > 0) {
        cards.push({
          key: 'favorite',
          title: t('wine.favorites', 'Favorites'),
          value: getWineDisplayName(favorites[0]),
          subtitle: getWineProducer(favorites[0]) || '',
          accent: '#8B3A3A',
          photo: getWinePrimaryImage(favorites[0]),
          onClick: () => navigate(`/Wines?highlight=${encodeURIComponent(favorites[0].id)}`),
        });
      }
    }

    // Fallback: Recently Added
    if (cards.length < 3) {
      const byDate = [...wines].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      if (byDate.length > 0) {
        const recent = byDate[0];
        cards.push({
          key: 'recentlyAdded',
          title: t('wine.recentlyAdded', 'Recently Added'),
          value: getWineDisplayName(recent),
          subtitle: getWineProducer(recent) || (recent.vintage ? String(recent.vintage) : ''),
          accent: '#3A6B8B',
          photo: getWinePrimaryImage(recent),
          onClick: () => navigate(`/Wines?highlight=${encodeURIComponent(recent.id)}`),
        });
      }
    }

    return cards.slice(0, 3);
  }, [wines, formatFromBase, t, navigate]);

  const quickLaunchActions = [
    { key: 'addWine', Icon: Plus, label: t('wine.addBottle', 'Add Bottle'), onClick: () => setShowAddModal(true) },
    { key: 'collection', Icon: Wine, label: t('wine.collection', 'Wine Collection'), onClick: () => navigate('/Wines') },
    { key: 'logTasting', Icon: BookOpen, label: t('wine.logTasting', 'Log Tasting'), onClick: () => navigate('/Wines?action=tasting') },
    { key: 'insights', Icon: BarChart3, label: t('nav.insights', 'Insights'), onClick: () => navigate('/WineInsights') },
    { key: 'shareStory', Icon: Share2, label: t('wine.shareStory', 'Share Story'), onClick: () => navigate('/Wines') },
    { key: 'curator', iconImage: CURATOR_ICON, label: t('quickActions.collectionCurator', 'Collection Curator'), onClick: () => navigate('/Curator') },
  ];

  const totalBottles = selectTotalWineBottles(wines);
  const collectionValue = selectWineCollectionValue(wines);

  const wineStats = [
    { label: t('wine.bottleTypes', 'Bottle Types'), value: wines.length },
    { label: t('wine.totalBottles', 'Total Bottles'), value: totalBottles },
    { label: t('wine.collectionValue', 'Collection Value'), value: collectionValue > 0 ? formatFromBase(collectionValue) : '—' },
    { label: t('wine.tastingsLogged', 'Tastings'), value: tastings.length },
  ];

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

      {/* Collection Highlights */}
      <ModuleHighlightsSection highlights={highlights} />

      {/* Recent Tastings */}
      {recentTastings.length > 0 && (
        <ModuleRecentActivitySection title={t('wine.recentTastings', 'Recent Tastings')}>
          <div className="space-y-3">
            {recentTastings.map((tasting) => (
              <RecentTastingCard key={tasting.id} tasting={tasting} t={t} />
            ))}
          </div>
        </ModuleRecentActivitySection>
      )}

    </ModulePageShell>

    <AddFlowModal
      open={showAddModal}
      onClose={() => setShowAddModal(false)}
      initialItemType="wine"
      onCreated={() => {
        queryClient.invalidateQueries({ queryKey: ['wines', user?.email] });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wines(user?.email) });
        queryClient.invalidateQueries({ queryKey: ['wine-collection-summary', user?.email] });
      }}
    />
    </>
  );
}

export default function WineKeeper() {
  return <WineKeeperInner />;
}