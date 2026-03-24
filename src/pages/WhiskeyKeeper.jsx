import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Plus, Search, TrendingUp, BookOpen, Glasses, BarChart3, Flame } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/components/utils/localeFormatters';
import {
  buildInventoryCountByBottleId,
  getBottleTotalValue,
  getBottleUnitValue,
  getEffectiveBottleCount,
} from '@/components/utils/whiskeyValueHelpers';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import CatalogPlate from '@/components/home/CatalogPlate';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { getWhiskeyHighlights } from '@/components/whiskey/getWhiskeyHighlights';
import WhiskeyHighlightCard from '@/components/whiskey/WhiskeyHighlightCard';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

export default function WhiskeyKeeper() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle?.list?.('-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: inventoryUnits = [] } = useQuery({
    queryKey: ['inventory-units-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.BottleInventoryUnit?.list?.('-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Calculate metrics
  const inventoryCountByBottleId = useMemo(
    () => buildInventoryCountByBottleId(inventoryUnits),
    [inventoryUnits]
  );

  const hasInventoryUnits = inventoryUnits.length > 0;

  const totalBottles = useMemo(() => {
    return bottles.reduce((sum, bottle) => {
      return sum + getEffectiveBottleCount(bottle, inventoryCountByBottleId, hasInventoryUnits);
    }, 0);
  }, [bottles, inventoryCountByBottleId, hasInventoryUnits]);

  const totalBottleValue = useMemo(() => {
    return bottles.reduce((sum, bottle) => {
      return sum + getBottleTotalValue(bottle, inventoryCountByBottleId, hasInventoryUnits);
    }, 0);
  }, [bottles, inventoryCountByBottleId, hasInventoryUnits]);

  const highlights = useMemo(() => {
    return getWhiskeyHighlights(bottles, inventoryUnits);
  }, [bottles, inventoryUnits]);

  const quickLaunchActions = [
    {
      key: 'addBottle',
      Icon: Plus,
      label: t('whiskey.addBottle', 'Add Bottle'),
      onClick: () => navigate('/Whiskey?action=add')
    },
    {
      key: 'quickSearch',
      Icon: Glasses,
      label: t('quickActions.quickSearchBottle', 'Quick Search'),
      onClick: () => navigate('/Whiskey')
    },
    {
      key: 'logTasting',
      Icon: Flame,
      label: t('quickActions.logTasting', 'Log Tasting'),
      onClick: () => navigate('/Tastings')
    },
    {
      key: 'insights',
      Icon: BarChart3,
      label: t('nav.insights', 'Insights'),
      onClick: () => navigate('/WhiskeyInsights')
    },
    {
      key: 'curator',
      iconImage: CURATOR_ICON,
      label: t('quickActions.collectionCurator', 'Collection Curator'),
      onClick: () => navigate('/Curator')
    }
  ];

  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <div className="space-y-8">
        {/* Hero */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/branding/whiskeykeeper-logo.png?v=3"
                alt="WhiskeyKeeper"
                className="w-11 h-11 object-contain bg-transparent"
                style={{
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.28))',
                  backgroundColor: 'transparent',
                }}
                draggable={false}
              />
              <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}>
                {t('whiskeykeeper.title', 'WhiskeyKeeper')}
              </h1>
            </div>
            <p className="text-base pl-14" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
              {t('whiskeykeeper.description', 'Track bottles, inventory, value, and tasting notes')}
            </p>
          </div>
          <Button onClick={() => navigate('/CollectionHub')} variant="outline" className="text-sm">
            {t('common.backToHub', 'Back to Hub')}
          </Button>
        </div>

        {/* Module Navigation - landing has no active tab */}
        <WhiskeyKeeperModuleNav currentPageName={null} />

        {/* Summary Cards */}
        <div className="rounded-lg p-5" style={{
          background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
        }}>
          <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
            {t('home.collectionSummary', 'Collection Summary')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
                {t('whiskey.collectionValue', 'Total Value')}
              </p>
              <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
                {formatCurrency(Math.round(totalBottleValue))}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
                {t('whiskey.bottleTypes', 'Bottle Types')}
              </p>
              <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
                {bottles.length}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
                {t('whiskey.inventory', 'Inventory')}
              </p>
              <p className="text-2xl font-bold" style={{ color: '#B4824B' }}>
                {totalBottles}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Launch */}
        <ModuleQuickLaunch actions={quickLaunchActions} />

        {/* Highlights */}
        {highlights.length > 0 && (
          <div>
            <h2 className="text-sm uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
              {t('home.highlights', 'Collection Highlights')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {highlights.map((highlight) => (
                <WhiskeyHighlightCard
                  key={highlight.key}
                  title={highlight.title}
                  value={highlight.value}
                  subtitle={highlight.subtitle}
                  accent={highlight.accent}
                  photo={highlight.photo}
                  onClick={() => {
                    if (highlight.bottleId) {
                      navigate(`/Whiskey?highlight=${encodeURIComponent(highlight.bottleId)}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </LockedModuleGuard>
  );
}