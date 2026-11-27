/**
 * Keeper Core — Value Aggregation Service
 */

import { getEffectiveRates, getCurrentDisplayCurrency } from '@/lib/currency/exchangeRateStore';
import { convertFromBase } from '@/lib/currency/convertCurrency';
import { formatMoney } from '@/lib/currency/formatCurrency';
import { calculateCigarValue } from '@/utils/cigarValuation';
import { computeCurrentValue } from '@/components/valuation/valueEngine';

/**
 * Collection Intelligence 2.0 — consolidation note.
 *
 * Pipe, tobacco, bottle and wine values resolve through the canonical valuation
 * engine (src/components/valuation/valueEngine.js) so the Hub cannot disagree
 * with the module dashboards, detail pages and reports. Do not reintroduce
 * per-module field-order math here.
 */

export function getPipeValue(pipe) {
  if (!pipe) return 0;
  return computeCurrentValue(pipe, 'pipekeeper') || 0;
}

export function getTobaccoValue(blend) {
  if (!blend) return 0;
  // The engine prices tobacco as quantity × per-ounce rate. A blend with no
  // recorded inventory has no quantity to price, so keep its stored unit
  // estimate rather than reporting the blend as zero.
  const storedEstimate = Number(blend.manual_market_value) || Number(blend.ai_estimated_value) || 0;
  const totalOz =
    (Number(blend.tin_total_quantity_oz) || 0) +
    (Number(blend.bulk_total_quantity_oz) || 0) +
    (Number(blend.pouch_total_quantity_oz) || 0);

  if (totalOz > 0) {
    return computeCurrentValue(blend, 'pipekeeper') || storedEstimate;
  }
  return storedEstimate || computeCurrentValue(blend, 'pipekeeper');
}

export function getBottleValue(bottle) {
  if (!bottle) return 0;
  return computeCurrentValue(bottle, 'whiskeykeeper') || 0;
}

export function getWineValue(wine) {
  if (!wine) return 0;
  return (
    computeCurrentValue(wine, 'winekeeper') ||
    Number(wine.estimated_value) ||
    Number(wine.purchase_price) ||
    0
  );
}

export function getCigarValue(cigar) {
  if (!cigar) return 0;
  const valuation = calculateCigarValue(cigar);
  if (valuation?.estimatedTotalValue != null) return valuation.estimatedTotalValue;
  return 0;
}

export function getCoffeeBeanValue(bean) {
  if (!bean) return 0;
  return bean.estimated_value || bean.purchase_price || 0;
}

export function getValueByModuleType(moduleType, entity) {
  switch (moduleType) {
    case 'pipes':
      return getPipeValue(entity);
    case 'tobacco':
      return getTobaccoValue(entity);
    case 'whiskey':
      return getBottleValue(entity);
    case 'cigars':
      return getCigarValue(entity);
    case 'wines':
    case 'wine':
      return getWineValue(entity);
    case 'coffee':
      return getCoffeeBeanValue(entity);
    default:
      return 0;
  }
}

export function formatCurrencyValue(value, options = {}) {
  const { fallback = '—' } = options;

  if (!value || value <= 0) {
    return fallback;
  }

  try {
    const currency = options.currency || getCurrentDisplayCurrency();
    const ratePayload = getEffectiveRates();
    const converted = convertFromBase(value, currency, ratePayload);
    return formatMoney(converted, currency, options.locale);
  } catch {
    return fallback;
  }
}

export function calculateEcosystemValueMetrics(summary) {
  if (!summary) {
      return {
        total: 0,
        byModule: { pipes: 0, tobacco: 0, whiskey: 0, cigars: 0 },
        percentages: { pipes: 0, tobacco: 0, whiskey: 0, cigars: 0 },
      };
  }

  const byModule = {
    pipes: Number(summary?.pipes_value || 0),
    tobacco: Number(summary?.tobacco_value || 0),
    whiskey: Number(summary?.whiskey_value || 0),
    cigars: Number(summary?.cigars_value || summary?.cigar_value || 0),
  };

  const total = byModule.pipes + byModule.tobacco + byModule.whiskey + byModule.cigars;

  const percentages =
    total > 0
      ? {
          pipes: Math.round((byModule.pipes / total) * 100),
          tobacco: Math.round((byModule.tobacco / total) * 100),
          whiskey: Math.round((byModule.whiskey / total) * 100),
          cigars: Math.round((byModule.cigars / total) * 100),
        }
      : { pipes: 0, tobacco: 0, whiskey: 0, cigars: 0 };

  return { total, byModule, percentages };
}