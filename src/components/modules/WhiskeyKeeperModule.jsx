import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { BookOpen, TrendingUp, BarChart3, Plus, Search, Camera, Wand2 } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';

const WK_LOGO = "https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png";
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/components/utils/localeFormatters';
import ModuleNav from './ModuleNav';
import CatalogPlate from '@/components/home/CatalogPlate';
import ModuleQuickLaunch from './ModuleQuickLaunch';
import QuickSearchBottle from '@/components/ai/QuickSearchBottle';
import BottleIdentifier from '@/components/whiskey/BottleIdentifier';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BottleForm from '@/components/whiskey/BottleForm';
import LogTastingModal from '@/components/whiskey/LogTastingModal';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

export default function WhiskeyKeeperModule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showIdentifier, setShowIdentifier] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showLogTasting, setShowLogTasting] = useState(false);
  const [identifiedBottleData, setIdentifiedBottleData] = useState(null);

  // Module navigation
  const moduleNav = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', iconImage: WK_LOGO },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

  // Fetch data
  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: inventoryUnits = [] } = useQuery({
    queryKey: ['inventory-units-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.WhiskeyInventoryUnit.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 100);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Value priority function for consistent calculations across all displays
  const getBottleUnitValue = (bottle) => {
    return Number(
      bottle?.collector_value ??
      bottle?.aftermarket_price ??
      bottle?.retail_price ??
      bottle?.average_market_value ??
      bottle?.purchase_price ??
      0
    ) || 0;
  };

  const getBottleCount = (bottle) => {
    const explicitCount = Number(bottle?.bottle_count);
    return Number.isFinite(explicitCount) && explicitCount > 0 ? explicitCount : 1;
  };

  // Inventory count map for value calculation
  const inventoryCountByBottleId = useMemo(() => {
    const map = {};
    for (const unit of inventoryUnits) {
      if (!unit?.bottle_id) continue;
      map[unit.bottle_id] = (map[unit.bottle_id] || 0) + 1;
    }
    return map;
  }, [inventoryUnits]);

  // Dual bottle metrics — the canonical distinction
  const bottleTypes = bottles.length;

  const totalBottles = useMemo(() => {
    if (inventoryUnits.length > 0) return inventoryUnits.length;
    return bottles.reduce((sum, b) => sum + getBottleCount(b), 0);
  }, [bottles, inventoryUnits]);

  const openBottles = useMemo(
    () => inventoryUnits.filter((u) => u.status === 'open').length,
    [inventoryUnits]
  );

  const sealedBottles = useMemo(
    () => inventoryUnits.filter((u) => u.status === 'reserve' || u.status === 'drinking').length,
    [inventoryUnits]
  );

  // Total value using consistent priority function
  const totalBottleValue = useMemo(() => {
    return bottles.reduce((sum, bottle) => {
      const count = inventoryUnits.length > 0
        ? (inventoryCountByBottleId[bottle.id] || 0)
        : getBottleCount(bottle);

      return sum + (getBottleUnitValue(bottle) * Math.max(count, 1));
    }, 0);
  }, [bottles, inventoryUnits.length, inventoryCountByBottleId]);

  const highestRatedBottle = useMemo(() => {
    const withRating = bottles.filter(b => b?.rating && b.rating > 0);
    if (!withRating.length) return null;
    return withRating.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0] || null;
  }, [bottles]);

  const mostValuableBottle = useMemo(() => {
    const candidates = bottles
      .map((bottle) => ({ ...bottle, __unitValue: getBottleUnitValue(bottle) }))
      .filter((bottle) => bottle.__unitValue > 0);

    if (!candidates.length) return null;

    return candidates.sort((a, b) => b.__unitValue - a.__unitValue)[0] || null;
  }, [bottles]);

  const recentTasting = useMemo(() => tastingLogs[0] || null, [tastingLogs]);

  const handleBottleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['bottles-summary'] });
    queryClient.invalidateQueries({ queryKey: ['bottles'] });
  };

  const handleBottleIdentified = (bottleData) => {
    setIdentifiedBottleData(bottleData);
    setShowIdentifier(false);
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async (data) => {
    try {
      await base44.entities.Bottle.create(data);
      setShowQuickAdd(false);
      setIdentifiedBottleData(null);
      handleBottleAdded();
    } catch (err) {
      console.error('Quick add error:', err);
      throw err;
    }
  };

  const handleQuickAddCancel = () => {
    setShowQuickAdd(false);
    setIdentifiedBottleData(null);
  };

  const quickLaunchActions = [
    {
      key: 'addBottle',
      Icon: Plus,
      label: t('quickActions.addBottle'),
      onClick: () => navigate('/Whiskey?action=add')
    },
    {
      key: 'quickSearch',
      Icon: Search,
      label: t('quickActions.quickSearchBottle'),
      onClick: () => setShowQuickSearch(true)
    },
    {
      key: 'identifyBottle',
      Icon: Camera,
      label: t('quickActions.identifyBottle'),
      onClick: () => setShowIdentifier(true)
    },
    {
      key: 'logTasting',
      Icon: BookOpen,
      label: t('quickActions.logTasting'),
      onClick: () => setShowLogTasting(true)
    },
    {
      key: 'curator',
      iconImage: CURATOR_ICON,
      label: t('quickActions.collectionCurator'),
      onClick: () => navigate('/Curator')
    },
    {
      key: 'insights',
      Icon: TrendingUp,
      label: t('quickActions.insights'),
      onClick: () => navigate('/WhiskeyInsights')
    },
    {
      key: 'aiUpdates',
      Icon: Wand2,
      label: t('quickActions.aiUpdates') || 'AI Updates',
      onClick: () => navigate('/WhiskeyAIUpdates')
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img
              src={WK_LOGO}
              alt="WhiskeyKeeper"
              className="w-12 h-12 object-contain flex-shrink-0"
              style={{ mixBlendMode: 'screen' }}
            />
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
              {t('whiskeykeeper.title') || 'WhiskeyKeeper'}
            </h1>
          </div>
          <p className="text-base pl-15" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
            {t('whiskeykeeper.description') || 'Track your whiskey collection and tastings'}
          </p>
        </div>
        <Button onClick={() => navigate('/CollectionHub')} variant="outline" className="text-sm">
          {t('common.backToHub') || 'Back to Hub'}
        </Button>
      </div>

      {/* Module Navigation - THE REAL INTERNAL NAV */}
      <ModuleNav items={moduleNav} currentPath={location.pathname} />

      {/* Summary Cards */}
      <div className="rounded-lg p-5" style={{
        background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
        border: '1px solid rgba(120, 90, 65, 0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
      }}>
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('home.collectionSummary') || 'Collection Summary'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.totalValue') || 'Total Value'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(Math.round(totalBottleValue))}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              Bottle Types
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
              {bottleTypes}
            </p>
            <p className="text-xs" style={{ color: 'rgba(180,140,75,0.45)' }}>distinct labels</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              Total Bottles
            </p>
            <p className="text-2xl font-bold" style={{ color: '#8B7355' }}>
              {totalBottles}
            </p>
            {inventoryUnits.length > 0 && (openBottles > 0 || unopenedBottles > 0) && (
              <p className="text-xs" style={{ color: 'rgba(139,115,85,0.65)' }}>
                {openBottles} open · {unopenedBottles} sealed
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.tastings') || 'Tastings'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#A35C5C' }}>
              {tastingLogs.length}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launch */}
      <ModuleQuickLaunch actions={quickLaunchActions} />

      {/* Highlights */}
      {(highestRatedBottle || mostValuableBottle || recentTasting) && (
        <div>
          <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
            {t('home.highlights') || 'Collection Highlights'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highestRatedBottle && (
              <CatalogPlate
                title={t('whiskeykeeper.highestRated') || 'Highest Rated'}
                value={`${highestRatedBottle.rating || 0}/5`}
                subtitle={highestRatedBottle.name}
                heroImage={highestRatedBottle.photo}
                bgImage={highestRatedBottle.photo}
                accent="#D4AF37"
                onClick={() => navigate(`/Whiskey?highlight=${encodeURIComponent(highestRatedBottle.id)}`)}
              />
            )}
            {mostValuableBottle && (
              <CatalogPlate
                title={t('home.mostValuable') || 'Most Valuable'}
                value={formatCurrency(mostValuableBottle.purchase_price)}
                subtitle={mostValuableBottle.name}
                heroImage={mostValuableBottle.photo}
                bgImage={mostValuableBottle.photo}
                accent="#B4824B"
                onClick={() => navigate(`/Whiskey?highlight=${encodeURIComponent(mostValuableBottle.id)}`)}
              />
            )}
            {recentTasting && (
              <CatalogPlate
                title={t('whiskeykeeper.recentTasting') || 'Recent Tasting'}
                value={recentTasting.bottle_name}
                subtitle={new Date(recentTasting.tasting_date).toLocaleDateString()}
                heroImage={null}
                bgImage={null}
                accent="#8B6A47"
                onClick={() => navigate('/Tastings')}
              />
            )}
          </div>
        </div>
      )}

      {/* Log Tasting Modal */}
      <LogTastingModal
        isOpen={showLogTasting}
        onClose={() => setShowLogTasting(false)}
        bottles={bottles}
        user={user}
      />

      {/* Quick Search Modal */}
      <QuickSearchBottle 
        isOpen={showQuickSearch} 
        onClose={() => setShowQuickSearch(false)}
        onBottleAdded={handleBottleAdded}
      />

      {/* Bottle Identifier Sheet */}
      <Sheet open={showIdentifier} onOpenChange={setShowIdentifier}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t('bottleIdentifier.aiBottleIdentification')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <BottleIdentifier onBottleIdentified={handleBottleIdentified} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick Add from Identified Bottle */}
      <Sheet open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t('quickActions.quickAddBottle')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <BottleForm 
              bottle={identifiedBottleData} 
              onSubmit={handleQuickAddSubmit}
              onCancel={handleQuickAddCancel}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}