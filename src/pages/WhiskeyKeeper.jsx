import React, { useMemo, useState } from 'react';
import AddFlowModal from '@/components/addflow/AddFlowModal';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Plus, Flame, Glasses, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/components/utils/localeFormatters';
import {
  buildInventoryCountByBottleId,
  getBottleTotalValue,
  getEffectiveBottleCount,
} from '@/components/utils/whiskeyValueHelpers';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { getWhiskeyHighlights } from '@/components/whiskey/getWhiskeyHighlights';
import WhiskeyHighlightCard from '@/components/whiskey/WhiskeyHighlightCard';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

function WhiskeyKeeperInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email }, '-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const bottleIds = useMemo(
    () => new Set((bottles || []).map((b) => b.id).filter(Boolean)),
    [bottles]
  );

  const { data: inventoryUnits = [] } = useQuery({
    queryKey: ['inventory-units-summary', user?.email, bottles.length],
    queryFn: async () => {
      if (!user?.email) return [];

      let result = [];

      try {
        result = await base44.entities.BottleInventoryUnit?.filter?.({ created_by: user.email }, '-created_date');
      } catch {
        result = await base44.entities.BottleInventoryUnit?.list?.('-created_date').catch(() => []);
      }

      const rows = Array.isArray(result) ? result : [];

      return rows.filter((unit) => {
        if (unit?.created_by && unit.created_by === user.email) return true;
        if (unit?.bottle_id && bottleIds.has(unit.bottle_id)) return true;
        return false;
      });
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

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
      onClick: () => setShowAddModal(true)
    },
    {
      key: 'browseCollection',
      Icon: Glasses,
      label: t('whiskey.yourCollection', 'Browse Collection'),
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
    <div className="space-y-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <AddFlowModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialItemType="bottle"
      />

      <WhiskeyKeeperModuleNav currentPageName={null} />

      <div
        className="rounded-lg p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
        }}
      >
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
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

      <ModuleQuickLaunch actions={quickLaunchActions} />

      {highlights.length > 0 && (
        <div>
          <h2
            className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
            style={{ color: 'rgba(180, 140, 75, 0.8)' }}
          >
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
  );
}

export default function WhiskeyKeeper() {
  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <WhiskeyKeeperInner />
    </LockedModuleGuard>
  );
}