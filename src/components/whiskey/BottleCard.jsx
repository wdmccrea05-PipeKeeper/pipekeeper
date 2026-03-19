import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ExternalLink, Package, LockOpen, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import {
  formatCurrency,
  getBottleDisplayValueLabel,
  getBottleTotalValue,
  getBottleUnitValue,
  getEffectiveBottleCount,
  getInventoryStatusSummary,
} from '@/components/utils/whiskeyValueHelpers';

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: {
      background: 'rgba(180,140,75,0.18)',
      border: '1px solid rgba(180,140,75,0.28)',
      color: 'rgba(245,241,231,0.86)',
    },
    green: {
      background: 'rgba(46,125,92,0.18)',
      border: '1px solid rgba(46,125,92,0.35)',
      color: '#7ED6A7',
    },
    red: {
      background: 'rgba(163,92,92,0.18)',
      border: '1px solid rgba(163,92,92,0.35)',
      color: '#F0B4B4',
    },
    blue: {
      background: 'rgba(79,120,180,0.18)',
      border: '1px solid rgba(79,120,180,0.30)',
      color: '#AFCBFF',
    },
  };

  const style = tones[tone] || tones.default;

  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={style}
    >
      {children}
    </span>
  );
}

export default function BottleCard({
  bottle,
  inventoryUnits = [],
  inventoryCountByBottleId = {},
  onEdit,
  onDelete,
  onOpen,
}) {
  const { t } = useTranslation();

  const hasInventoryUnits = inventoryUnits.length > 0;

  const unitValue = useMemo(() => getBottleUnitValue(bottle), [bottle]);
  const totalCount = useMemo(
    () => getEffectiveBottleCount(bottle, inventoryCountByBottleId, hasInventoryUnits),
    [bottle, inventoryCountByBottleId, hasInventoryUnits]
  );
  const totalValue = useMemo(
    () => getBottleTotalValue(bottle, inventoryCountByBottleId, hasInventoryUnits),
    [bottle, inventoryCountByBottleId, hasInventoryUnits]
  );
  const inventorySummary = useMemo(
    () => getInventoryStatusSummary(inventoryUnits, bottle?.id),
    [inventoryUnits, bottle?.id]
  );
  const valueLabel = useMemo(() => getBottleDisplayValueLabel(bottle), [bottle]);

  const photo = bottle?.photo || bottle?.image || bottle?.image_url || '';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(42,31,24,0.98), rgba(25,18,14,0.98))',
        border: '1px solid rgba(180,140,75,0.14)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.24)',
      }}
    >
      <div className="relative h-72 bg-black/20">
        {photo ? (
          <img
            src={photo}
            alt={bottle?.name || 'Bottle'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-10 h-10 opacity-30" fill="none" stroke="rgba(224,216,200,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3h4" /><path d="M11 3v4l-3 5.5A4.5 4.5 0 0 0 11.9 19h.2A4.5 4.5 0 0 0 16 12.5L13 7V3" /><path d="M9.5 12h5" />
            </svg>
            <span className="text-xs text-[#E0D8C8]/45 font-medium">{t('whiskey.noPhoto') || 'No photo'}</span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[85%]">
          {bottle?.type && <Badge>{bottle.type}</Badge>}
          {bottle?.bottle_type && <Badge tone="blue">{bottle.bottle_type}</Badge>}
          {bottle?.bottle_size && <Badge>{bottle.bottle_size}</Badge>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#F5F1E7] break-words">
            {bottle?.name || (t('whiskey.untitledBottle') || 'Untitled Bottle')}
          </h3>
          <p className="text-sm text-[#E0D8C8]/68 break-words mt-1">
            {[bottle?.distillery, bottle?.region, bottle?.country].filter(Boolean).join(' • ') || (t('whiskey.noOriginInfo') || 'No origin details')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.10)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              {valueLabel}
            </div>
            <div className="text-xl font-bold text-[#F5F1E7] mt-1">
              {formatCurrency(unitValue)}
            </div>
            <p className="text-xs mt-1 text-[#E0D8C8]/58">
              {t('whiskey.perBottle') || 'Per bottle'}
            </p>
          </div>

          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.10)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-xs font-semibold uppercase tracking-wide">
              <Package className="w-3.5 h-3.5" />
              {t('whiskey.inventory') || 'Inventory'}
            </div>
            <div className="text-xl font-bold text-[#F5F1E7] mt-1">
              {totalCount}
            </div>
            <p className="text-xs mt-1 text-[#E0D8C8]/58">
              {t('whiskey.totalBottles') || 'Total bottles'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {inventorySummary.open > 0 && <Badge tone="red">{inventorySummary.open} open</Badge>}
          {inventorySummary.sealed > 0 && <Badge tone="green">{inventorySummary.sealed} sealed</Badge>}
          {inventorySummary.reserve > 0 && <Badge tone="default">{inventorySummary.reserve} reserve</Badge>}
          {inventorySummary.drinking > 0 && <Badge tone="blue">{inventorySummary.drinking} drinking</Badge>}
          {!hasInventoryUnits && totalCount > 0 && <Badge tone="green">{totalCount} counted</Badge>}
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(163,92,92,0.08)', border: '1px solid rgba(163,92,92,0.15)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-[#D4A574]">
            {t('whiskey.totalPositionValue') || 'Total Position Value'}
          </div>
          <div className="text-xl font-bold text-[#F5F1E7] mt-1">
            {formatCurrency(totalValue)}
          </div>
          <p className="text-xs mt-1 text-[#E0D8C8]/60 break-words">
            {bottle?.notes
              ? bottle.notes.slice(0, 120) + (bottle.notes.length > 120 ? '…' : '')
              : (t('whiskey.noNotesYet') || 'No notes yet')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {typeof onOpen === 'function' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpen(bottle)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('common.open') || 'Open'}
            </Button>
          )}

          {typeof onEdit === 'function' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(bottle)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              {t('common.edit') || 'Edit'}
            </Button>
          )}

          {typeof onDelete === 'function' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDelete(bottle)}
              className="text-[#F0B4B4]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete') || 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}