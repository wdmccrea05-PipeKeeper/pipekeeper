/**
 * Keeper Core — Value Aggregation Service
 */

export function getPipeValue(pipe) {
  if (!pipe) return 0;
  return pipe.estimated_value || pipe.purchase_price || 0;
}

export function getTobaccoValue(blend) {
  if (!blend) return 0;
  return blend.manual_market_value || blend.ai_estimated_value || 0;
}

export function getBottleValue(bottle) {
  if (!bottle) return 0;
  return (
    bottle.collector_value ||
    bottle.aftermarket_price ||
    bottle.retail_price ||
    bottle.purchase_price ||
    0
  );
}

export function getCigarValue(cigar) {
  if (!cigar) return 0;
  return cigar.estimated_value || cigar.purchase_price || 0;
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
    case 'coffee':
      return getCoffeeBeanValue(entity);
    default:
      return 0;
  }
}

export function formatCurrencyValue(value, options = {}) {
  const { fallback = '—', locale = 'en-US', currency = 'USD' } = options;

  if (!value || value <= 0) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return fallback;
  }
}

export function calculateEcosystemValueMetrics(summary) {
  if (!summary) {
    return {
      total: 0,
      byModule: { pipes: 0, tobacco: 0, whiskey: 0 },
      percentages: { pipes: 0, tobacco: 0, whiskey: 0 },
    };
  }

  const byModule = {
    pipes: Number(summary?.pipes_value || 0),
    tobacco: Number(summary?.tobacco_value || 0),
    whiskey: Number(summary?.whiskey_value || 0),
  };

  const total = byModule.pipes + byModule.tobacco + byModule.whiskey;

  const percentages =
    total > 0
      ? {
          pipes: Math.round((byModule.pipes / total) * 100),
          tobacco: Math.round((byModule.tobacco / total) * 100),
          whiskey: Math.round((byModule.whiskey / total) * 100),
        }
      : { pipes: 0, tobacco: 0, whiskey: 0 };

  return { total, byModule, percentages };
}
