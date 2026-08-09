import { formatCurrencyAmount } from '@/utils/currency';
import { getBottleUnitValue as selectBottleUnitValue } from '@/lib/collection/whiskeySelectors';

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getBottleUnitValue(bottle) {
  return selectBottleUnitValue(bottle);
}

export function getBottleDisplayValueLabel(bottle) {
  if (toNumber(bottle?.manual_value_override, 0) > 0) return 'Manual Value';
  if (toNumber(bottle?.collector_value, 0) > 0) return 'Collector Value';
  if (toNumber(bottle?.aftermarket_price, 0) > 0) return 'Aftermarket Value';
  if (toNumber(bottle?.retail_price, 0) > 0) return 'Retail Value';
  if (toNumber(bottle?.purchase_price, 0) > 0) return 'Purchase Price';
  return 'Value';
}

export function getBottleCount(bottle) {
  const explicit = toNumber(bottle?.bottle_count, 0);
  if (explicit > 0) return explicit;

  const quantity = toNumber(bottle?.quantity, 0);
  if (quantity > 0) return quantity;

  return 1;
}

/**
 * @deprecated Use useCurrency().formatFromBase() in React components instead.
 */
export function formatCurrency(value) {
  return formatCurrencyAmount(value);
}

export function buildInventoryCountByBottleId(inventoryUnits = []) {
  return inventoryUnits.reduce((acc, unit) => {
    if (!unit?.bottle_id) return acc;
    const quantity = toNumber(unit?.quantity, 1);
    acc[unit.bottle_id] = (acc[unit.bottle_id] || 0) + quantity;
    return acc;
  }, {});
}

export function getEffectiveBottleCount(bottle, inventoryCountByBottleId = {}, hasInventoryUnits = false) {
  if (hasInventoryUnits) {
    return Math.max(1, toNumber(inventoryCountByBottleId?.[bottle?.id], 0));
  }
  return getBottleCount(bottle);
}

export function getBottleTotalValue(bottle, inventoryCountByBottleId = {}, hasInventoryUnits = false) {
  return getBottleUnitValue(bottle) * getEffectiveBottleCount(bottle, inventoryCountByBottleId, hasInventoryUnits);
}

export function getInventoryStatusSummary(inventoryUnits = [], bottleId) {
  const relevant = inventoryUnits.filter((u) => u?.bottle_id === bottleId);
  if (!relevant.length) {
    return {
      total: 0,
      open: 0,
      sealed: 0,
      reserve: 0,
      drinking: 0,
      archived: 0,
    };
  }

  const summary = {
    total: relevant.length,
    open: 0,
    sealed: 0,
    reserve: 0,
    drinking: 0,
    archived: 0,
  };

  for (const unit of relevant) {
    const status = String(unit?.status || '').toLowerCase();

    if (status === 'open') summary.open += 1;
    if (status === 'reserve') {
      summary.reserve += 1;
      summary.sealed += 1;
    }
    if (status === 'drinking') {
      summary.drinking += 1;
      summary.sealed += 1;
    }
    if (status === 'archived') summary.archived += 1;
  }

  return summary;
}
