import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ExternalLink, Heart } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import {
  formatCurrency,
  getBottleDisplayValueLabel,
  getBottleTotalValue,
  getBottleUnitValue,
  getEffectiveBottleCount,
  getInventoryStatusSummary,
} from '@/components/utils/whiskeyValueHelpers';

function MiniBadge({ children }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: 'rgba(180,140,75,0.18)',
        border: '1px solid rgba(180,140,75,0.28)',
        color: '#F5F1E7',
      }}
    >
      {children}
    </span>
  );
}

export default function BottleListItem({
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

  const photo =
    bottle?.photo ||
    bottle?.image ||
    bottle?.image_url ||
    (Array.isArray(bottle?.photos) ? bottle.photos[0] : '') ||
    '';

  return (
    <div
      className="rounded-2xl p-4 md:p-5"
      style={{
        background: 'linear-gradient(145deg, rgba(58,40,28,0.98), rgba(31,21,16,0.98))',
        border: '1px solid rgba(180,140,75,0.16)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.32)',
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        <div
          className="w-full lg:w-28 h-32 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, rgba(35,25,18,0.96), rgba(20,14,10,0.98))',
            border: '1px solid rgba(180,140,75,0.12)',
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={bottle?.name || 'Bottle'}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#E0D8C8]/45">
              {t('whiskey.noPhoto') || 'No photo'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-[#F5F1E7] break-words leading-tight">
                {bottle?.name || (t('whiskey.untitledBottle') || 'Untitled Bottle')}
              </h3>
              <p className="text-sm text-[#E0D8C8]/82 break-words mt-1">
                {[bottle?.distillery, bottle?.region, bottle?.country].filter(Boolean).join(' • ') ||
                  (t('whiskey.noOriginInfo') || 'No origin details')}
              </p>
            </div>

            <div className="text-left xl:text-right shrink-0">
              <div className="text-xs uppercase tracking-wide text-[#D4A574] font-semibold">
                {valueLabel}
              </div>
              <div className="text-2xl font-bold text-[#F5F1E7] mt-1">
                {formatCurrency(unitValue)}
              </div>
              <div className="text-sm text-[#D8C7A6]/72 mt-1">
                Total: {formatCurrency(totalValue)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {bottle?.type && <MiniBadge>{bottle.type}</MiniBadge>}
            {bottle?.bottle_type && <MiniBadge>{bottle.bottle_type}</MiniBadge>}
            {bottle?.bottle_size && <MiniBadge>{bottle.bottle_size}</MiniBadge>}
            <MiniBadge>{totalCount} total</MiniBadge>
            {inventorySummary.open > 0 && <MiniBadge>{inventorySummary.open} open</MiniBadge>}
            {inventorySummary.sealed > 0 && <MiniBadge>{inventorySummary.sealed} sealed</MiniBadge>}
          </div>

          <p className="text-sm text-[#E0D8C8]/76 break-words leading-relaxed">
            {bottle?.notes
              ? bottle.notes.slice(0, 180) + (bottle.notes.length > 180 ? '…' : '')
              : (t('whiskey.noNotesYet') || 'No notes yet')}
          </p>
        </div>

        <div className="flex lg:flex-col gap-2 lg:w-[132px] flex-shrink-0">
          {typeof onOpen === 'function' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpen(bottle)}
              className="flex-1"
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
              className="flex-1"
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
              className="flex-1 text-[#F0B4B4]"
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