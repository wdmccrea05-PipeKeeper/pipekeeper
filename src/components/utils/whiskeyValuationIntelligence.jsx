/**
 * WhiskeyKeeper Valuation Intelligence
 * 
 * Separates retail, aftermarket, and collector values
 * Distinguishes pricing based on source type and bottle characteristics
 */

export function parseValuationSource(source) {
  if (!source) return { type: 'unknown', confidence: 'low' };

  const lowerSource = source.toLowerCase();

  // Retail source indicators
  if (
    lowerSource.includes('distillery') ||
    lowerSource.includes('retail') ||
    lowerSource.includes('store') ||
    lowerSource.includes('shop') ||
    lowerSource.includes('msrp') ||
    lowerSource.includes('list price')
  ) {
    return { type: 'retail', confidence: 'high' };
  }

  // Aftermarket source indicators
  if (
    lowerSource.includes('auction') ||
    lowerSource.includes('realized') ||
    lowerSource.includes('hammer price') ||
    lowerSource.includes('sold for') ||
    lowerSource.includes('secondary') ||
    lowerSource.includes('marketplace') ||
    lowerSource.includes('resale') ||
    lowerSource.includes('private sale')
  ) {
    return { type: 'aftermarket', confidence: 'high' };
  }

  // Collector value indicators (inferred characteristics)
  if (
    lowerSource.includes('collector') ||
    lowerSource.includes('limited edition') ||
    lowerSource.includes('discontinued') ||
    lowerSource.includes('rare') ||
    lowerSource.includes('scarce')
  ) {
    return { type: 'collector', confidence: 'medium' };
  }

  return { type: 'unknown', confidence: 'low' };
}

/**
 * Determine which pricing tier to prioritize based on inventory status
 */
export function getPricingPriority(inventoryStatus) {
  // Collector-held / sealed bottles
  if (inventoryStatus === 'reserve') {
    return ['collector_value', 'aftermarket_price', 'retail_price'];
  }

  // Drinking inventory (unopened for consumption)
  if (inventoryStatus === 'drinking') {
    return ['retail_price', 'aftermarket_price', 'collector_value'];
  }

  // Open bottles (being consumed)
  if (inventoryStatus === 'open') {
    return ['retail_price']; // Only retail price relevant for open drinking bottles
  }

  // Default
  return ['retail_price', 'aftermarket_price', 'collector_value'];
}

/**
 * Get the primary value to display for a bottle
 */
export function getPrimaryValue(bottle, inventoryStatus) {
  const priority = getPricingPriority(inventoryStatus);

  for (const field of priority) {
    if (bottle[field] && Number(bottle[field]) > 0) {
      return {
        value: Number(bottle[field]),
        source: field,
        label: field.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      };
    }
  }

  // Fallback to actual purchase price
  if (bottle.purchase_price && Number(bottle.purchase_price) > 0) {
    return {
      value: Number(bottle.purchase_price),
      source: 'purchase_price',
      label: 'Amount Paid',
    };
  }

  return { value: 0, source: null, label: null };
}

/**
 * Determine if a bottle is likely collectible
 */
export function isLikelyCollectible(bottle) {
  // Heuristics for detecting collectible bottles
  const collectibleIndicators = [
    bottle.age && Number(bottle.age) > 20, // High age
    bottle.type && ['Single Malt', 'Scotch Whisky', 'Bourbon'].includes(bottle.type), // Premium types
    bottle.distillery && [
      'Macallan', 'Glenfiddich', 'Glenmorangie', 'Laphroaig', 'Lagavulin',
      'Highland Park', 'Dalmore', 'Buffalo Trace', 'Pappy Van Winkle'
    ].some(d => bottle.distillery.toLowerCase().includes(d.toLowerCase())),
    bottle.rating && Number(bottle.rating) >= 4, // High rating
  ];

  return collectibleIndicators.filter(Boolean).length >= 2;
}

/**
 * Build value source summary from available data
 */
export function buildValueSourceSummary(bottle) {
  const sources = [];

  if (bottle.retail_price) {
    sources.push('Retail pricing');
  }
  if (bottle.aftermarket_price) {
    sources.push('Aftermarket/auction data');
  }
  if (bottle.collector_value) {
    sources.push('Collector market analysis');
  }

  if (sources.length === 0) return null;

  return sources.join('; ');
}

/**
 * Estimate confidence based on data completeness
 */
export function estimateValueConfidence(bottle) {
  const dataPoints = [
    !!bottle.purchase_price,
    !!bottle.retail_price,
    !!bottle.aftermarket_price,
    !!bottle.collector_value,
    !!bottle.value_source_summary,
  ].filter(Boolean).length;

  if (dataPoints >= 4) return 'high';
  if (dataPoints >= 2) return 'medium';
  return 'low';
}

/**
 * Format pricing explanation for display
 */
export function getPricingExplanation(bottle, field) {
  const explanations = {
    retail_price: 'Current active retail market price (store shelf/distillery price)',
    aftermarket_price: 'Secondary market / auction pricing (what collectors are paying)',
    collector_value: 'Estimated collector value for sealed bottles (not opened)',
    purchase_price: 'Actual amount you paid for this bottle',
  };

  return explanations[field] || 'Value estimate';
}

/**
 * Determine if a price difference is explained by retail vs aftermarket
 */
export function explainPricingDifference(bottle1, bottle2) {
  if (!bottle1 || !bottle2) return null;

  // Check if same bottle with different purchase types
  if (
    bottle1.distillery === bottle2.distillery &&
    bottle1.name === bottle2.name &&
    bottle1.bottle_size === bottle2.bottle_size
  ) {
    if (bottle1.purchase_type === 'retail' && bottle2.purchase_type === 'aftermarket') {
      return 'Aftermarket bottles typically command a premium over retail prices';
    }
    if (bottle1.purchase_type === 'aftermarket' && bottle2.purchase_type === 'retail') {
      return 'Retail pricing is usually lower than aftermarket/auction pricing';
    }
  }

  return null;
}