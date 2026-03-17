import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
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
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{
        background: 'rgba(180,140,75,0.18)',
        border: '1px solid rgba(180,140,75,0.28)',
        color: 'rgba(245,241,231,0.86)',
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

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(42,31,24,0.98), rgba(25,18,14,0.98))',
        border: '1px solid rgba(180,140,75,0.14)',
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="w-full lg:w-24 h-28 rounded-xl overflow-hidden bg-black/20 flex-shrink-0">
          {bottle?.photo ? (
            <img
              src={bottle.photo}
              alt={bottle?.name || 'Bottle'}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#E0D8C8]/30">
              {t('whiskey.noPhoto') || 'No photo'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#F5F1E7] break-words">
                {bottle?.name || (t('whiskey.untitledBottle') || 'Untitled Bottle')}
              </h3>
              <p className="text-sm text-[#E0D8C8]/68 break-words">
                {[bottle?.distillery, bottle?.region, bottle?.country].filter(Boolean).join(' • ') || (t('whiskey.noOriginInfo') || 'No origin details')}
              </p>
            </div>

            <div className="text-left xl:text-right">
              <div className="text-xs uppercase tracking-wide text-[#D4A574] font-semibold">
                {valueLabel}
              </div>
              <div className="text-lg font-bold text-[#F5F1E7]">
                {formatCurrency(unitValue)}
              </div>
              <div className="text-xs text-[#E0D8C8]/58">
                {t('whiskey.totalValue') || 'Total'}: {formatCurrency(totalValue)}
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

          <p className="text-sm text-[#E0D8C8]/62 break-words">
            {bottle?.notes
              ? bottle.notes.slice(0, 180) + (bottle.notes.length > 180 ? '…' : '')
              : (t('whiskey.noNotesYet') || 'No notes yet')}
          </p>
        </div>

        <div className="flex lg:flex-col gap-2 lg:w-[130px] flex-shrink-0">
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
