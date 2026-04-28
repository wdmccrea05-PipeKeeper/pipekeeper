import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Wine, Plus, BarChart3, BookOpen } from 'lucide-react';
import ModulePageShell from '@/components/modules/ModulePageShell';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";
import { base44 } from '@/api/base44Client';
import WineKeeperModuleNav from '@/components/modules/WineKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import WhiskeyHighlightCard from '@/components/whiskey/WhiskeyHighlightCard';
import { useCurrency } from '@/lib/currency/useCurrency';
import AddFlowModal from '@/components/addflow/AddFlowModal';

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

    const totalValue = wines.reduce((sum, w) => {
      const qty = w.quantity || 1;
      if (w.manual_valuation_enabled && w.manual_estimated_value > 0) return sum + w.manual_estimated_value * qty;
      if (w.estimated_total_value > 0) return sum + w.estimated_total_value;
      if (w.market_estimated_total_value > 0) return sum + w.market_estimated_total_value;
      if (w.estimated_unit_value > 0) return sum + w.estimated_unit_value * qty;
      if (w.market_estimated_unit_value > 0) return sum + w.market_estimated_unit_value * qty;
      if (w.estimated_value > 0) return sum + w.estimated_value * qty;
      return sum;
    }, 0);
    if (totalValue > 0) {
      cards.push({
        key: 'totalValue',
        title: t('wine.collectionValue', 'Collection Value'),
        value: formatFromBase(totalValue),
        subtitle: `${wines.length} ${t('wine.bottles', 'bottles')}`,
        accent: '#8B3A3A',
      });
    }

    const rated = wines.filter((w) => w.rating > 0).sort((a, b) => b.rating - a.rating);
    if (rated.length > 0) {
      cards.push({
        key: 'topRated',
        title: t('wine.topRated', 'Top Rated'),
        value: rated[0].name,
        subtitle: `${rated[0].producer || ''} · ${rated[0].vintage || ''} · ★ ${rated[0].rating}/5`,
        accent: '#8B3A3A',
        photo: rated[0].photos?.[0],
        wineId: rated[0].id,
      });
    }

    const drinkingNow = wines.filter((w) => {
      if (!w.drinking_window_start || !w.drinking_window_end) return false;
      const now = new Date();
      return new Date(w.drinking_window_start) <= now && new Date(w.drinking_window_end) >= now;
    });
    if (drinkingNow.length > 0) {
      cards.push({
        key: 'drinkingNow',
        title: t('wine.drinkingNow', 'Drink Now'),
        value: String(drinkingNow.length),
        subtitle: t('wine.drinkingNowSubtitle', 'bottles at peak'),
        accent: '#2E7D5C',
      });
    }

    const favorites = wines.filter((w) => w.is_favorite);
    if (favorites.length > 0) {
      cards.push({
        key: 'favorite',
        title: t('wine.favorites', 'Favorites'),
        value: favorites[0].name,
        subtitle: favorites[0].producer || '',
        accent: '#8B3A3A',
        photo: favorites[0].photos?.[0],
        wineId: favorites[0].id,
      });
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
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: 'rgba(180,140,75,0.8)' }}>
            {t('home.highlights', 'Collection Highlights')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {highlights.map((h) => (
              <WhiskeyHighlightCard
                key={h.key}
                title={h.title}
                value={h.value}
                subtitle={h.subtitle}
                accent={h.accent}
                photo={h.photo}
                onClick={() => h.wineId && navigate(`/Wines?highlight=${encodeURIComponent(h.wineId)}`)}
              />
            ))}
          </div>
        </div>
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
    </ModulePageShell>

    <AddFlowModal
      open={showAddModal}
      onClose={() => setShowAddModal(false)}
      initialItemType="wine"
    />
    </>
  );
}

export default function WineKeeper() {
  return <WineKeeperInner />;
}