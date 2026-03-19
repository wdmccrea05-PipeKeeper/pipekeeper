// v2 - canonical value helpers
export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Canonical single-bottle unit value resolver.
 * Priority: collector_value > aftermarket_price > retail_price > purchase_price
 * average_market_value intentionally NOT used (legacy field, unreliable).
 */
export function getBottleUnitValue(bottle) {
  if (toNumber(bottle?.collector_value, 0) > 0) return toNumber(bottle.collector_value, 0);
  if (toNumber(bottle?.aftermarket_price, 0) > 0) return toNumber(bottle.aftermarket_price, 0);
  if (toNumber(bottle?.retail_price, 0) > 0) return toNumber(bottle.retail_price, 0);
  if (toNumber(bottle?.purchase_price, 0) > 0) return toNumber(bottle.purchase_price, 0);
  return 0;
}

/**
 * Sum canonical unit value across all bottles (no inventory quantity).
 * Use this for collection total value displays.
 */
export function sumBottleCollectionValue(bottles) {
  if (!Array.isArray(bottles)) return 0;
  return bottles.reduce((sum, b) => sum + getBottleUnitValue(b), 0);
}

export function getBottleDisplayValueLabel(bottle) {
  if (toNumber(bottle?.collector_value, 0) > 0) return 'Collector Value';
  if (toNumber(bottle?.aftermarket_price, 0) > 0) return 'Aftermarket Value';
  if (toNumber(bottle?.retail_price, 0) > 0) return 'Retail Value';
  if (toNumber(bottle?.average_market_value, 0) > 0) return 'Market Value';
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

export function formatCurrency(value) {
  const n = toNumber(value, 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function buildInventoryCountByBottleId(inventoryUnits) {
  if (!Array.isArray(inventoryUnits)) return {};
  return inventoryUnits.reduce((acc, unit) => {
    if (!unit?.bottle_id) return acc;
    acc[unit.bottle_id] = (acc[unit.bottle_id] || 0) + 1;
    return acc;
  }, {});
}

export function getEffectiveBottleCount(bottle, inventoryCountByBottleId, hasInventoryUnits) {
  if (hasInventoryUnits) {
    return Math.max(1, toNumber(inventoryCountByBottleId?.[bottle?.id], 0));
  }
  return getBottleCount(bottle);
}

export function getBottleTotalValue(bottle, inventoryCountByBottleId, hasInventoryUnits) {
  return getBottleUnitValue(bottle) * getEffectiveBottleCount(bottle, inventoryCountByBottleId, hasInventoryUnits);
}

export function getInventoryStatusSummary(inventoryUnits, bottleId) {
  const units = Array.isArray(inventoryUnits) ? inventoryUnits : [];
  const relevant = units.filter((u) => u?.bottle_id === bottleId);
  if (!relevant.length) {
    return { total: 0, open: 0, sealed: 0, reserve: 0, drinking: 0, archived: 0 };
  }

  const summary = { total: relevant.length, open: 0, sealed: 0, reserve: 0, drinking: 0, archived: 0 };

  for (const unit of relevant) {
    const status = String(unit?.status || '').toLowerCase();
    if (status === 'open') summary.open += 1;
    if (status === 'reserve') { summary.reserve += 1; summary.sealed += 1; }
    if (status === 'drinking') { summary.drinking += 1; summary.sealed += 1; }
    if (status === 'archived') summary.archived += 1;
  }

  return summary;
}