/**
 * Keeper Core — Value Aggregation Service
 * 
 * Centralized logic for valuing collection items and aggregating across modules.
 * Ensures consistent valuation methodology across the ecosystem.
 */

/**
 * Get normalized value for a pipe
 * @param {Object} pipe - Pipe entity
 * @returns {number} Normalized value
 */
export function getPipeValue(pipe) {
  if (!pipe) return 0;
  // Prefer estimated_value, fall back to purchase_price
  return pipe.estimated_value || pipe.purchase_price || 0;
}

/**
 * Get normalized value for a tobacco blend
 * @param {Object} blend - TobaccoBlend entity
 * @returns {number} Normalized value
 */
export function getTobaccoValue(blend) {
  if (!blend) return 0;
  // Prefer manual_market_value (user input), fall back to AI estimate
  return blend.manual_market_value || blend.ai_estimated_value || 0;
}

/**
 * Get normalized value for a whiskey bottle
 * @param {Object} bottle - Bottle entity
 * @returns {number} Normalized value
 */
export function getBottleValue(bottle) {
  if (!bottle) return 0;
  // Use the correct Bottle schema fields in priority order
  return bottle.collector_value || bottle.aftermarket_price || bottle.retail_price || bottle.average_market_value || bottle.purchase_price || 0;
}

/**
 * Get normalized value for a cigar (future module)
 * @param {Object} cigar - Cigar entity
 * @returns {number} Normalized value
 */
export function getCigarValue(cigar) {
  if (!cigar) return 0;
  // Placeholder for future cigar valuation
  return cigar.estimated_value || cigar.purchase_price || 0;
}

/**
 * Get normalized value for a coffee bean (future module)
 * @param {Object} bean - CoffeeBean entity
 * @returns {number} Normalized value
 */
export function getCoffeeBeanValue(bean) {
  if (!bean) return 0;
  // Placeholder for future coffee valuation
  return bean.estimated_value || bean.purchase_price || 0;
}

/**
 * Get value by module type
 * @param {string} moduleType - Module type (pipes, tobacco, whiskey, etc.)
 * @param {Object} entity - Entity object
 * @returns {number} Normalized value
 */
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

/**
 * Format currency value for display
 * @param {number} value - Raw numeric value
 * @param {Object} options - Formatting options
 * @returns {string} Formatted value (e.g., "$1,234.56" or "—")
 */
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

/**
 * Calculate ecosystem value summary
 * @param {Object} summary - Collection summary object from collectionSummary service
 * @returns {Object} Value metrics { total, byModule, percentages }
 */
export function calculateEcosystemValueMetrics(summary) {
  if (!summary) {
    return {
      total: 0,
      byModule: { pipes: 0, tobacco: 0, whiskey: 0 },
      percentages: { pipes: 0, tobacco: 0, whiskey: 0 },
    };
  }

  const total = (summary.pipes?.value || 0) +
                (summary.tobacco?.value || 0) +
                (summary.whiskey?.value || 0);

  const byModule = {
    pipes: summary.pipes?.value || 0,
    tobacco: summary.tobacco?.value || 0,
    whiskey: summary.whiskey?.value || 0,
  };

  const percentages = total > 0
    ? {
        pipes: Math.round((byModule.pipes / total) * 100),
        tobacco: Math.round((byModule.tobacco / total) * 100),
        whiskey: Math.round((byModule.whiskey / total) * 100),
      }
    : { pipes: 0, tobacco: 0, whiskey: 0 };

  return { total, byModule, percentages };
}