import {
  computeCurrentValue,
  buildValuationSnapshot,
} from '@/components/valuation/valueEngine';

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Returns the canonical unit value for a bottle, delegating to the shared engine.
 */
export function resolveBottleUnitValue(bottle) {
  return computeCurrentValue(bottle, 'whiskeykeeper');
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

/**
 * Returns { label, confidence } describing the value source.
 * Delegates to the shared engine for consistent source determination.
 */
export function resolveBottleValueSource(bottle) {
  if (!bottle) return { label: 'Unknown', confidence: 'low' };

  const snapshot = buildValuationSnapshot(bottle, 'whiskeykeeper');
  if (!snapshot) return { label: 'Unknown', confidence: 'low' };

  return {
    label: snapshot.source,
    confidence: snapshot.confidence,
  };
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
