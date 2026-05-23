import React, { useMemo, useState } from 'react';
import AddFlowModal from '@/components/addflow/AddFlowModal';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Plus, Flame, Glasses, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { selectWhiskeyMetrics } from '@/lib/collection/whiskeySelectors';
import WhiskeyKeeperModuleNav from '@/components/modules/WhiskeyKeeperModuleNav';
import ModuleQuickLaunch from '@/components/modules/ModuleQuickLaunch';
import ModulePageShell from '@/components/modules/ModulePageShell';
import { getWhiskeyHighlights } from '@/components/whiskey/getWhiskeyHighlights';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import { useCurrency } from '@/lib/currency/useCurrency';
import ModuleHighlightsSection from '@/components/modules/ModuleHighlightsSection';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';

const CURATOR_ICON = "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

function WhiskeyKeeperInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const { formatFromBase } = useCurrency();

  const { data: bottles = [] } = useQuery({
    queryKey: QUERY_KEYS.bottles(user?.email),
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email }, '-created_date').catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
  });

  const { data: inventoryUnits = [] } = useQuery({
    queryKey: QUERY_KEYS.whiskeyInventory(user?.email),
    queryFn: async () => {
      const result = await base44.entities.WhiskeyInventoryUnit
        .filter({ created_by: user.email }, '-created_date')
        .catch(() => []);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: STALE_TIME.HOMEPAGE,
  });

  const whiskeyMetrics = useMemo(
    () => selectWhiskeyMetrics(bottles, inventoryUnits, []),
    [bottles, inventoryUnits]
  );

  const highlights = useMemo(
    () => getWhiskeyHighlights(bottles, inventoryUnits, formatFromBase).map((h) => ({
      ...h,
      onClick: h.bottleId
        ? () => navigate(`/Whiskey?highlight=${encodeURIComponent(h.bottleId)}`)
        : undefined,
    })),
    [bottles, inventoryUnits, formatFromBase, navigate]
  );

  const whiskeyStats = [
    { label: t('whiskey.collectionValue'), value: formatFromBase(Math.round(whiskeyMetrics.collection_value)) },
    { label: t('whiskey.bottleTypes'), value: whiskeyMetrics.bottle_types },
    { label: t('whiskey.inventory'), value: whiskeyMetrics.total_bottles },
    { label: t('whiskey.avgAbv', 'Avg ABV'), value: whiskeyMetrics.avg_abv ? `${whiskeyMetrics.avg_abv.toFixed(1)}%` : '—' },
  ];

  const quickLaunchActions = [
    { key: 'addBottle', Icon: Plus, label: t('whiskey.addBottle'), onClick: () => setShowAddModal(true) },
    { key: 'browseCollection', Icon: Glasses, label: t('whiskey.yourCollection'), onClick: () => navigate('/Whiskey') },
    { key: 'logTasting', Icon: Flame, label: t('quickActions.logTasting'), onClick: () => navigate('/Tastings') },
    { key: 'insights', Icon: BarChart3, label: t('nav.insights'), onClick: () => navigate('/WhiskeyInsights') },
    { key: 'curator', iconImage: CURATOR_ICON, label: t('quickActions.collectionCurator'), onClick: () => navigate('/Curator') },
  ];

  return (
    <ModulePageShell
      title={t('whiskeykeeper.title', 'WhiskeyKeeper')}
      subtitle={t('whiskeykeeper.description', 'Track, value, and explore your whiskey collection')}
      icon={<WhiskeyKeeperIcon className="w-6 h-6" style={{ color: '#D47C7C' }} />}
      accentColor="#B66565"
      onBackToHub={() => navigate('/CollectionHub')}
      stats={whiskeyStats}
      moduleNav={<WhiskeyKeeperModuleNav currentPageName={null} />}
      actions={<ModuleQuickLaunch actions={quickLaunchActions} />}
    >
      <AddFlowModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialItemType="bottle"
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bottles(user?.email) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.whiskeyInventory(user?.email) });
          queryClient.invalidateQueries({ queryKey: ['whiskey-collection', user?.email] });
        }}
      />

      {highlights.length > 0 && (
        <ModuleHighlightsSection highlights={highlights} />
      )}
    </ModulePageShell>
  );
}

// LockedModuleGuard is already applied by App.jsx's WhiskeyReleaseRoute wrapper
export default function WhiskeyKeeper() {
  return <WhiskeyKeeperInner />;
}