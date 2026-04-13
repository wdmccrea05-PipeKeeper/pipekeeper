import {
  computeCurrentValue,
  buildValuationSnapshot,
} from '@/components/valuation/valueEngine';
import { formatCurrency as _formatCurrencyLocale } from '@/components/utils/localeFormatters';

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
  return _formatCurrencyLocale(value);
}

/**
 * Returns a 5-level rarity rating for a bottle.
 *
 * RARITY SCALE:
 *   5 — Extremely Rare  ●●●●●
 *   4 — Rare            ●●●●○
 *   3 — Limited         ●●●○○
 *   2 — Available       ●●○○○
 *   1 — Common          ●○○○○
 *
 * Criteria:
 *   - production_status (discontinued / limited / etc.)
 *   - aftermarket_price vs retail_price (premium ratio)
 *   - collector_value (absolute threshold)
 *
 * @param {object} bottle
 * @returns {{ level: number, label: string, dots: string, explanation: string }}
 */
const DISCONTINUED_STATUSES = new Set(['discontinued', 'distillery closed', 'closed']);
const LIMITED_STATUSES      = new Set(['limited', 'allocated', 'limited release']);

const RARITY_LEVELS = [
  { min: 7, level: 5, label: 'Extremely Rare', dots: '●●●●●', explanation: 'Discontinued and commands significant premium on the secondary market' },
  { min: 5, level: 4, label: 'Rare',           dots: '●●●●○', explanation: 'Limited production and/or notable aftermarket demand' },
  { min: 3, level: 3, label: 'Limited',        dots: '●●●○○', explanation: 'Limited availability or elevated collector interest' },
  { min: 1, level: 2, label: 'Available',      dots: '●●○○○', explanation: 'Generally available through standard retail channels' },
  { min: 0, level: 1, label: 'Common',         dots: '●○○○○', explanation: 'Widely available and easy to replace' },
];

export function getRarityLevel(bottle) {
  if (!bottle) {
    return { level: 2, label: 'Available', dots: '●●○○○', explanation: 'No bottle data provided' };
  }

  const retailPrice    = toNumber(bottle.retail_price);
  const aftermarket    = toNumber(bottle.aftermarket_price);
  const collectorValue = toNumber(bottle.collector_value);
  const status         = String(bottle.production_status || '').toLowerCase();

  const isDiscontinued = DISCONTINUED_STATUSES.has(status);
  const isLimited      = LIMITED_STATUSES.has(status);
  const premiumRatio   = retailPrice > 0 ? aftermarket / retailPrice : 0;

  let score = 0;
  if (isDiscontinued)       score += 3;
  if (isLimited)            score += 2;
  if (premiumRatio > 3)     score += 3;
  else if (premiumRatio > 2) score += 2;
  else if (premiumRatio > 1.5) score += 1;
  if (collectorValue > 500) score += 3;
  else if (collectorValue > 200) score += 2;
  else if (collectorValue > 100) score += 1;

  const match = RARITY_LEVELS.find((l) => score >= l.min);
  return match || RARITY_LEVELS[RARITY_LEVELS.length - 1];
}
