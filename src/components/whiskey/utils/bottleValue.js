export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function resolveBottleUnitValue(bottle) {
  if (!bottle) return 0;

  return (
    toNumber(bottle.collector_value) ||
    toNumber(bottle.aftermarket_price) ||
    toNumber(bottle.retail_price) ||
    toNumber(bottle.purchase_price) ||
    0
  );
}

export function resolveBottleQuantity(bottle) {
  if (!bottle) return 1;

  if (Number.isFinite(Number(bottle.total_bottles)) && Number(bottle.total_bottles) > 0) {
    return Number(bottle.total_bottles);
  }

  if (Number.isFinite(Number(bottle.bottle_count)) && Number(bottle.bottle_count) > 0) {
    return Number(bottle.bottle_count);
  }

  return 1;
}

export function resolveBottleTotalValue(bottle) {
  return resolveBottleUnitValue(bottle) * resolveBottleQuantity(bottle);
}

export function resolveBottleValueSource(bottle) {
  if (!bottle) return { label: 'Unknown', confidence: 'low' };

  if (toNumber(bottle.collector_value) > 0) {
    return { label: 'Collector Value', confidence: 'high' };
  }

  if (toNumber(bottle.aftermarket_price) > 0) {
    return { label: 'Aftermarket Value', confidence: 'medium' };
  }

  if (toNumber(bottle.retail_price) > 0) {
    return { label: 'Retail Value', confidence: 'medium' };
  }

  if (toNumber(bottle.purchase_price) > 0) {
    return { label: 'Purchase Price', confidence: 'low' };
  }

  return { label: 'Unknown', confidence: 'low' };
}

export function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
