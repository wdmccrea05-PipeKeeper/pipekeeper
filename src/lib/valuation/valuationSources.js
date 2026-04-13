/**
 * valuationSources.js
 *
 * Regional pricing context and value-source configuration.
 *
 * Provides:
 *   - Country/region price multipliers (relative to US base price)
 *   - Confidence adjustments per value source
 *   - Source trust tiers for valuation data
 *
 * These multipliers represent realistic market-price differentials
 * due to import duties, VAT, distribution costs, and local demand.
 * They are intentionally conservative estimates.
 */

// ---------------------------------------------------------------------------
// Regional price multipliers by country (relative to US shelf price = 1.0)
// ---------------------------------------------------------------------------

/**
 * countryMultiplier(countryCode, itemType)
 *
 * Returns the approximate local-market price multiplier compared to the
 * canonical US base price.
 *
 * Examples (Sazerac Rye 750ml US MSRP ~$30):
 *   IE: ~1.55 → ≈€46 (import duty + VAT)
 *   JP: ~2.20 → ≈$66 USD equivalent
 *   AU: ~1.65 → ≈AUD$50
 *   GB: ~1.40 → ≈£42
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} [itemType]
 * @returns {number} multiplier (e.g. 1.0 = same as US, 1.5 = 50% more expensive)
 */
export function countryMultiplier(countryCode, itemType = 'bottle') {
  const code = (countryCode || 'US').toUpperCase();

  // Country-level base multipliers (all item types unless overridden)
  const base = {
    US: 1.00,
    GB: 1.40,
    IE: 1.55,
    FR: 1.45,
    DE: 1.38,
    IT: 1.42,
    ES: 1.35,
    NL: 1.38,
    BE: 1.40,
    AT: 1.40,
    CA: 1.30,
    AU: 1.65,
    NZ: 1.70,
    JP: 2.20,
    SG: 1.80,
    ZA: 1.20,
  };

  // Per-item-type overrides where the differential is notably different
  const overrides = {
    pipe: {
      // Pipes sourced from European makers are cheaper in Europe
      GB: 0.90,
      IE: 0.95,
      DE: 0.88,
      IT: 0.85,
      // US pipe market is generally at import-premium prices
      US: 1.00,
      AU: 1.20,
      JP: 1.30,
      CA: 1.10,
    },
    blend: {
      // European blends are cheaper in Europe
      GB: 0.92,
      IE: 0.98,
      DE: 0.94,
      FR: 0.90,
      US: 1.00,
      AU: 1.35,
      JP: 1.60,
      CA: 1.15,
    },
    tobacco: { // same as blend
      GB: 0.92, IE: 0.98, DE: 0.94, FR: 0.90,
      US: 1.00, AU: 1.35, JP: 1.60, CA: 1.15,
    },
  };

  const typeMap = overrides[itemType];
  if (typeMap && typeMap[code] !== undefined) return typeMap[code];

  return base[code] ?? 1.00;
}

// ---------------------------------------------------------------------------
// Confidence adjustments per source type
// ---------------------------------------------------------------------------

/**
 * Source trust configuration for value data.
 * Higher weight = more trustworthy / confident.
 */
export const VALUE_SOURCE_TRUST = {
  manual_override:  { weight: 1.0, label: 'Manual entry',         confidence: 'high'   },
  auction_comp:     { weight: 0.92, label: 'Auction comparable',   confidence: 'high'   },
  retailer_current: { weight: 0.88, label: 'Current retail price', confidence: 'high'   },
  retailer_recent:  { weight: 0.78, label: 'Recent retail price',  confidence: 'medium' },
  collector_value:  { weight: 0.75, label: 'Collector estimate',   confidence: 'medium' },
  ai_estimate:      { weight: 0.60, label: 'AI estimate',          confidence: 'medium' },
  purchase_price:   { weight: 0.55, label: 'Purchase price basis', confidence: 'low'    },
  formula_derived:  { weight: 0.45, label: 'Formula-derived',      confidence: 'low'    },
};

// ---------------------------------------------------------------------------
// Value source priority lists per item type
// ---------------------------------------------------------------------------

/**
 * Ordered list of field names to check for a canonical value, most-preferred first.
 */
export const VALUE_FIELD_PRIORITY = {
  bottle: [
    'manual_value_override',
    'collector_value',
    'aftermarket_price',
    'retail_price',
    'purchase_price',
  ],
  blend: [
    'manual_market_value',
    'manual_value_override',
    'ai_estimated_value',
    'price_per_oz',
    'cost_basis',
    'purchase_price',
  ],
  tobacco: [
    'manual_market_value',
    'manual_value_override',
    'ai_estimated_value',
    'price_per_oz',
    'cost_basis',
    'purchase_price',
  ],
  pipe: [
    'estimated_value',
    'manual_value_override',
    'collector_value',
    'purchase_price',
  ],
};
