import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ExternalLink, Package, ShieldCheck, Heart } from 'lucide-react';
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
      color: '#F5F1E7',
    },
    green: {
      background: 'rgba(46,125,92,0.18)',
      border: '1px solid rgba(46,125,92,0.35)',
      color: '#9BE0B7',
    },
    red: {
      background: 'rgba(163,92,92,0.18)',
      border: '1px solid rgba(163,92,92,0.35)',
      color: '#F0B4B4',
    },
    blue: {
      background: 'rgba(79,120,180,0.18)',
      border: '1px solid rgba(79,120,180,0.30)',
      color: '#C5D9FF',
    },
  };

  const style = tones[tone] || tones.default;

  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium" style={style}>
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
  onToggleFavorite,
  onClick,
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

  const photo =
    (Array.isArray(bottle?.photos) ? bottle.photos[0] : '') ||
    bottle?.photo ||
    bottle?.image ||
    bottle?.image_url ||
    '';

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[rgba(180,140,75,0.42)] hover:-translate-y-0.5"
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(58,40,28,0.98), rgba(31,21,16,1))',
        border: '1px solid rgba(180,140,75,0.22)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.42)',
      }}
    >
      <div className="relative h-48 bg-gradient-to-b from-[#3d2a1d] to-[#24160f]">
        {photo ? (
          <img
            src={photo}
            alt={bottle?.name || 'Bottle'}
            className="w-full h-48 object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-sm text-[#E0D8C8]/48 font-medium">
              {t('whiskey.noPhoto') || 'No photo'}
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[80%]">
          {bottle?.type && <Badge>{bottle.type}</Badge>}
          {bottle?.bottle_type && <Badge tone="blue">{bottle.bottle_type}</Badge>}
          {bottle?.bottle_size && <Badge>{bottle.bottle_size}</Badge>}
        </div>

        {typeof onToggleFavorite === 'function' && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(bottle, e); }}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-all"
            style={{
              background: bottle?.favorite ? 'rgba(163,92,92,0.85)' : 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            aria-label={bottle?.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className="w-4 h-4"
              style={{ color: bottle?.favorite ? '#fff' : 'rgba(255,255,255,0.55)' }}
              fill={bottle?.favorite ? 'currentColor' : 'none'}
            />
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-[#F5F1E7] leading-tight break-words">
            {bottle?.name || (t('whiskey.untitledBottle') || 'Untitled Bottle')}
          </h3>
          <p className="text-sm text-[#E0D8C8] break-words mt-1.5 leading-relaxed">
            {[bottle?.distillery, bottle?.region, bottle?.country].filter(Boolean).join(' • ') ||
              (t('whiskey.noOriginInfo') || 'No origin details')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl p-3.5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(180,140,75,0.15)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              {valueLabel}
            </div>
            <div className="text-xl font-bold text-[#F5F1E7] mt-1">
              {formatCurrency(unitValue)}
            </div>
            <p className="text-xs mt-1 text-[#D8C7A6]/76">
              Per bottle
            </p>
          </div>

          <div
            className="rounded-xl p-3.5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(180,140,75,0.15)' }}
          >
            <div className="flex items-center gap-2 text-[#D4A574] text-xs font-semibold uppercase tracking-wide">
              <Package className="w-3.5 h-3.5" />
              Inventory
            </div>
            <div className="text-xl font-bold text-[#F5F1E7] mt-1">
              {totalCount}
            </div>
            <p className="text-xs mt-1 text-[#D8C7A6]/76">
              Total bottles
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {inventorySummary.open > 0 && <Badge tone="red">{inventorySummary.open} open</Badge>}
          {inventorySummary.sealed > 0 && <Badge tone="green">{inventorySummary.sealed} sealed</Badge>}
          {inventorySummary.reserve > 0 && <Badge>{inventorySummary.reserve} reserve</Badge>}
          {inventorySummary.drinking > 0 && <Badge tone="blue">{inventorySummary.drinking} drinking</Badge>}
          {!hasInventoryUnits && totalCount > 0 && <Badge tone="green">{totalCount} counted</Badge>}
        </div>

        <div
          className="rounded-xl p-3.5"
          style={{ background: 'rgba(163,92,92,0.10)', border: '1px solid rgba(163,92,92,0.18)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-[#D4A574]">
            Total Position Value
          </div>
          <div className="text-xl font-bold text-[#F5F1E7] mt-1">
            {formatCurrency(totalValue)}
          </div>
          <p className="text-sm text-[#E0D8C8]/76 break-words mt-2 leading-relaxed">
            {bottle?.notes
              ? bottle.notes.slice(0, 120) + (bottle.notes.length > 120 ? '…' : '')
              : (t('whiskey.noNotesYet') || 'No notes yet')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {typeof onOpen === 'function' && (
            <Button type="button" variant="outline" size="sm" onClick={() => onOpen(bottle)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </Button>
          )}

          {typeof onEdit === 'function' && (
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(bottle)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
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
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}