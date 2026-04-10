import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/components/i18n/safeTranslation';
import BottleCard from '@/components/whiskey/BottleCard';
import BottleListItem from '@/components/whiskey/BottleListItem';
import CatalogPlate from '@/components/home/CatalogPlate';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Package,
  LockOpen,
  ShieldCheck,
} from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import {
  buildInventoryCountByBottleId,
  formatCurrency,
  getBottleTotalValue,
  getBottleUnitValue,
  getEffectiveBottleCount,
} from '@/components/utils/whiskeyValueHelpers';
import { checkFreeTierLimit } from '@/components/utils/freeTierLimits';
import FreeTierUpgradePrompt from '@/components/subscription/FreeTierUpgradePrompt';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesBottleSearch(bottle, query) {
  const q = normalizeText(query);
  if (!q) return true;

  const haystack = [
    bottle?.name,
    bottle?.distillery,
    bottle?.region,
    bottle?.country,
    bottle?.type,
    bottle?.bottle_type,
    bottle?.bottle_size,
    bottle?.notes,
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');

  return haystack.includes(q);
}

export default function WhiskeyKeeperModule({
  onAddBottle,
  onEditBottle,
  onOpenBottle,
  onDeleteBottle,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const [bottles, setBottles] = useState([]);
  const [inventoryUnits, setInventoryUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [bottleRows, inventoryRows] = await Promise.all([
        base44.entities.Bottle.filter({ created_by: user.email }, '-created_date').catch(() => []),
        base44.entities.WhiskeyInventoryUnit.filter({ created_by: user.email }).catch(() => []),
      ]);

      setBottles(Array.isArray(bottleRows) ? bottleRows : []);
      setInventoryUnits(Array.isArray(inventoryRows) ? inventoryRows : []);
    } catch (error) {
      console.error('[WhiskeyKeeperModule] loadData failed:', error);
      setBottles([]);
      setInventoryUnits([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user?.email) loadData();
  }, [loadData, user?.email]);

  const inventoryCountByBottleId = useMemo(
    () => buildInventoryCountByBottleId(inventoryUnits),
    [inventoryUnits]
  );

  const filteredBottles = useMemo(() => {
    return bottles.filter((bottle) => matchesBottleSearch(bottle, searchQuery));
  }, [bottles, searchQuery]);

  const bottleTypes = bottles.length;
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

  const openBottles = useMemo(() => {
    if (inventoryUnits.length > 0) {
      return inventoryUnits.filter((u) => String(u?.status || '').toLowerCase() === 'open').length;
    }

    return bottles.filter((b) => String(b?.status || '').toLowerCase() === 'open').length;
  }, [inventoryUnits, bottles]);

  const sealedBottles = useMemo(() => {
    if (inventoryUnits.length > 0) {
      return inventoryUnits.filter((u) => {
        const status = String(u?.status || '').toLowerCase();
        return status === 'reserve' || status === 'drinking';
      }).length;
    }

    return Math.max(totalBottles - openBottles, 0);
  }, [inventoryUnits, bottles, totalBottles, openBottles]);

  const mostValuableBottle = useMemo(() => {
    const candidates = bottles
      .map((bottle) => ({
        ...bottle,
        __unitValue: getBottleUnitValue(bottle),
        __totalValue: getBottleTotalValue(bottle, inventoryCountByBottleId, hasInventoryUnits),
      }))
      .filter((bottle) => bottle.__unitValue > 0);

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (b.__unitValue !== a.__unitValue) return b.__unitValue - a.__unitValue;
      return b.__totalValue - a.__totalValue;
    });

    return candidates[0] || null;
  }, [bottles, inventoryCountByBottleId, hasInventoryUnits]);

  const bottleTypeBreakdown = useMemo(() => {
    const counts = {};
    for (const bottle of bottles) {
      const type = String(bottle?.type || 'Other').trim() || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [bottles]);

  // Check free tier limits
  const bottleLimit = checkFreeTierLimit('whiskeykeeper', 'bottles', bottleTypes, user);

  const handleBottleUpdated = async () => {
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Free Tier Limit Warning */}
      {bottleLimit.atLimit && !user?.whiskeykeeper_paid && (
        <FreeTierUpgradePrompt
          moduleId="whiskeykeeper"
          title="Bottle Collection Limit Reached"
          description={`You've reached the ${bottleLimit.limit} bottle limit on your free tier. Upgrade to WhiskeyKeeper Pro for unlimited storage.`}
        />
      )}

      <div
        className="rounded-2xl p-5 md:p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(44,30,22,0.98), rgba(27,20,16,0.98))',
          border: '1px solid rgba(180,140,75,0.16)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F5F1E7]">
              {t('whiskey.title') || 'WhiskeyKeeper'}
            </h1>
            <p className="text-sm mt-1 text-[#E0D8C8]/70">
              {t('whiskey.subtitle') || 'Track bottles, inventory, value, and tasting notes in one place.'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              onClick={onAddBottle}
              className="bg-[#A35C5C] hover:bg-[#8F4E4E] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('whiskey.addBottle') || 'Add Bottle'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.10)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-sm font-semibold">
              <WhiskeyKeeperIcon className="w-4 h-4" />
              {t('whiskey.bottleTypes') || 'Bottle Types'}
            </div>
            <div className="text-3xl font-bold text-[#F5F1E7] mt-2">{bottleTypes}</div>
            <p className="text-xs mt-1 text-[#E0D8C8]/60">
              {totalBottles} {t('whiskey.totalBottles') || 'total bottles'}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.10)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-sm font-semibold">
              <Package className="w-4 h-4" />
              {t('whiskey.inventory') || 'Inventory'}
            </div>
            <div className="text-3xl font-bold text-[#F5F1E7] mt-2">{totalBottles}</div>
            <p className="text-xs mt-1 text-[#E0D8C8]/60">
              {openBottles} {t('whiskey.open') || 'open'} · {sealedBottles} {t('whiskey.sealed') || 'sealed'}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.10)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" />
              {t('whiskey.collectionValue') || 'Collection Value'}
            </div>
            <div className="text-3xl font-bold text-[#F5F1E7] mt-2">
              {formatCurrency(totalBottleValue)}
            </div>
            <p className="text-xs mt-1 text-[#E0D8C8]/60">
              {t('whiskey.basedOnBestKnownValues') || 'Based on best known value per bottle'}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.10)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-sm font-semibold">
              <LockOpen className="w-4 h-4" />
              {t('whiskey.topBottleType') || 'Top Bottle Type'}
            </div>
            <div className="text-2xl font-bold text-[#F5F1E7] mt-2 break-words">
              {bottleTypeBreakdown[0]?.[0] || (t('common.none') || 'None')}
            </div>
            <p className="text-xs mt-1 text-[#E0D8C8]/60">
              {bottleTypeBreakdown[0]?.[1] || 0} bottles
            </p>
          </div>
        </div>
      </div>

      {mostValuableBottle && (
        <CatalogPlate
          title={t('home.mostValuable') || 'Most Valuable'}
          value={formatCurrency(mostValuableBottle.__unitValue || 0)}
          subtitle={mostValuableBottle.name}
          heroImage={mostValuableBottle.photo}
          bgImage={mostValuableBottle.photo}
          accent="#B4824B"
          onClick={() =>
            navigate(`/Whiskey?highlight=${encodeURIComponent(mostValuableBottle.id)}`)
          }
        />
      )}

      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(44,30,22,0.92), rgba(26,19,15,0.96))',
          border: '1px solid rgba(180,140,75,0.14)',
        }}
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#E0D8C8]/45" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('whiskey.searchPlaceholder') || 'Search bottles, distilleries, notes, region...'}
              className="pl-9 bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.15)] text-[#F5F1E7]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-[#A35C5C] hover:bg-[#8F4E4E]' : ''}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              {t('common.grid') || 'Grid'}
            </Button>
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#A35C5C] hover:bg-[#8F4E4E]' : ''}
            >
              <List className="w-4 h-4 mr-2" />
              {t('common.list') || 'List'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'rgba(44,30,22,0.75)', border: '1px solid rgba(180,140,75,0.12)' }}
        >
          <p className="text-[#E0D8C8]/70">{t('common.loading') || 'Loading...'}</p>
        </div>
      ) : filteredBottles.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'rgba(44,30,22,0.75)', border: '1px solid rgba(180,140,75,0.12)' }}
        >
          <WhiskeyKeeperIcon className="w-10 h-10 mx-auto mb-3 text-[#D4A574]/70" />
          <h3 className="text-lg font-semibold text-[#F5F1E7]">
            {t('whiskey.noBottlesFound') || 'No bottles found'}
          </h3>
          <p className="text-sm mt-1 text-[#E0D8C8]/65">
            {searchQuery
              ? (t('whiskey.adjustSearch') || 'Try a different search.')
              : (t('whiskey.addFirstBottle') || 'Add your first bottle to get started.')}
          </p>
          {!searchQuery && (
            <Button
              type="button"
              onClick={onAddBottle}
              className="mt-4 bg-[#A35C5C] hover:bg-[#8F4E4E] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('whiskey.addBottle') || 'Add Bottle'}
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBottles.map((bottle) => (
            <BottleCard
              key={bottle.id}
              bottle={bottle}
              inventoryUnits={inventoryUnits}
              inventoryCountByBottleId={inventoryCountByBottleId}
              onEdit={onEditBottle}
              onDelete={onDeleteBottle}
              onOpen={onOpenBottle}
              onUpdated={handleBottleUpdated}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBottles.map((bottle) => (
            <BottleListItem
              key={bottle.id}
              bottle={bottle}
              inventoryUnits={inventoryUnits}
              inventoryCountByBottleId={inventoryCountByBottleId}
              onEdit={onEditBottle}
              onDelete={onDeleteBottle}
              onOpen={onOpenBottle}
              onUpdated={handleBottleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}