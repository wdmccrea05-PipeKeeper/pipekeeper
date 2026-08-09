/**
 * wineSelectors.js
 *
 * Canonical, pure selector functions for all WineKeeper-derived metrics.
 *
 * Value priority chain:
 *   1. manual_estimated_value × qty  (when manual_valuation_enabled)
 *   2. estimated_total_value
 *   3. market_estimated_total_value
 *   4. estimated_unit_value × qty
 *   5. market_estimated_unit_value × qty
 *   6. estimated_value × qty          (legacy field)
 *   7. 0
 */

import { selectActiveWines } from './activeFilters.js';

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

// ---------------------------------------------------------------------------
// Single-wine helpers
// ---------------------------------------------------------------------------

export function getWineQuantity(wine) {
  if (!wine) return 0;
  return Math.max(1, n(wine.quantity) || 1);
}

export function getWineUnitValue(wine) {
  if (!wine) return 0;
  const qty = getWineQuantity(wine);
  if (wine.manual_valuation_enabled && n(wine.manual_estimated_value) > 0) return n(wine.manual_estimated_value);
  if (n(wine.estimated_total_value) > 0) return n(wine.estimated_total_value) / qty;
  if (n(wine.market_estimated_total_value) > 0) return n(wine.market_estimated_total_value) / qty;
  if (n(wine.estimated_unit_value) > 0) return n(wine.estimated_unit_value);
  if (n(wine.market_estimated_unit_value) > 0) return n(wine.market_estimated_unit_value);
  if (n(wine.estimated_value) > 0) return n(wine.estimated_value);
  if (n(wine.purchase_price) > 0) return n(wine.purchase_price);
  return 0;
}

export function getWineTotalValue(wine) {
  if (!wine) return 0;
  const qty = getWineQuantity(wine);
  if (wine.manual_valuation_enabled && n(wine.manual_estimated_value) > 0) return n(wine.manual_estimated_value) * qty;
  if (n(wine.estimated_total_value) > 0) return n(wine.estimated_total_value);
  if (n(wine.market_estimated_total_value) > 0) return n(wine.market_estimated_total_value);
  if (n(wine.estimated_unit_value) > 0) return n(wine.estimated_unit_value) * qty;
  if (n(wine.market_estimated_unit_value) > 0) return n(wine.market_estimated_unit_value) * qty;
  if (n(wine.estimated_value) > 0) return n(wine.estimated_value) * qty;
  if (n(wine.purchase_price) > 0) return n(wine.purchase_price) * qty;
  return 0;
}

export function hasWineValuation(wine) {
  if (!wine) return false;
  return (
    n(wine.manual_estimated_value) > 0 ||
    n(wine.estimated_total_value) > 0 ||
    n(wine.market_estimated_total_value) > 0 ||
    n(wine.estimated_unit_value) > 0 ||
    n(wine.market_estimated_unit_value) > 0 ||
    n(wine.estimated_value) > 0 ||
    n(wine.purchase_price) > 0
  );
}

export function getWineValuationSource(wine) {
  if (!wine) return null;
  if (wine.manual_valuation_enabled && n(wine.manual_estimated_value) > 0) return 'manual';
  if (n(wine.estimated_total_value) > 0 || n(wine.estimated_unit_value) > 0) return wine.valuation_source || 'enrichment';
  if (n(wine.market_estimated_total_value) > 0 || n(wine.market_estimated_unit_value) > 0) return wine.market_valuation_source || 'market';
  if (n(wine.estimated_value) > 0) return 'legacy';
  if (n(wine.purchase_price) > 0) return 'purchase_price';
  return null;
}

export function getWineValuationConfidence(wine) {
  if (!wine) return null;
  if (wine.manual_valuation_enabled) return 'manual';
  return wine.valuation_confidence || wine.market_valuation_confidence || null;
}

export function getWinePrimaryImage(wine) {
  if (!wine) return null;
  if (Array.isArray(wine.photos) && wine.photos.length > 0) return wine.photos[0];
  return wine.image_url || wine.primary_photo || null;
}

export function getWineDisplayName(wine) {
  if (!wine) return '';
  return wine.name || '';
}

export function getWineProducer(wine) {
  if (!wine) return '';
  return wine.producer || '';
}

export function getWineVintage(wine) {
  if (!wine) return null;
  return wine.vintage || null;
}

export function getWineRegionDisplay(wine) {
  if (!wine) return '';
  const parts = [wine.appellation, wine.region, wine.country_of_origin || wine.country].filter(Boolean);
  return parts[0] || '';
}

export function getWineDrinkWindowStatus(wine) {
  if (!wine) return null;
  const start = wine.drink_window_start || wine.drinking_window_start;
  const end = wine.drink_window_end || wine.drinking_window_end;
  if (!start && !end) return null;
  const now = new Date();
  if (end && now > new Date(end)) return 'past_peak';
  if (start && now < new Date(start)) return 'too_young';
  if (start && end) return 'drink_now';
  return null;
}

// ---------------------------------------------------------------------------
// Rarity / Collectibility scoring — WhiskeyKeeper-style weighted factors
// ---------------------------------------------------------------------------

/** Producer reputation tiers (well-known prestige producers). */
const PRESTIGE_PRODUCERS = [
  // Burgundy
  'romanee-conti', 'drc', 'leroy', 'rousseau', 'lafarge', 'roumier', 'comte de vogue',
  // Bordeaux
  'petrus', 'le pin', 'cheval blanc', 'latour', 'lafite', 'mouton', 'margaux',
  'haut-brion', 'ausone', 'pichon', 'ducru', 'leoville',
  // Napa / US
  'screaming eagle', 'harlan', 'opus one', 'bond', 'caymus', 'stag\'s leap',
  // Rhone
  'guigal', 'chapoutier', 'jaboulet', 'beaucastel',
  // Italy
  'sassicaia', 'ornellaia', 'gaja', 'solaia', 'tignanello', 'giacomo conterno',
  // Spain
  'vega sicilia', 'pingus',
  // Other icons
  'penfolds', 'henschke', 'giaconda',
];

const PRESTIGE_REGIONS = [
  'romanée-conti', 'chambertin', 'montrachet', 'corton', 'petrus', 'pomerol',
  'saint-émilion', 'barossa valley', 'napa valley', 'sonoma', 'willamette',
  'priorat', 'brunello', 'barolo', 'barbaresco', 'champagne', 'hermitage',
  'côte-rôtie', 'châteauneuf-du-pape', 'burgundy', 'bordeaux',
];

function matchesPrestige(str, list) {
  if (!str) return false;
  const s = str.toLowerCase();
  return list.some((term) => s.includes(term));
}

/**
 * Compute a wine-specific 0–100 rarity/collectibility score.
 * Returns null when there is insufficient data to produce a meaningful score.
 * Uses a weighted additive model with a confidence-derived divisor.
 *
 * Factor weights:
 *   market value    — 30 pts max
 *   vintage age     — 20 pts max
 *   producer prestige — 20 pts max
 *   region prestige — 10 pts max
 *   drink window    — 10 pts max
 *   quantity scarcity — 5 pts max
 *   replacement difficulty — 5 pts max
 *
 * Minimum 2 signals required to return a score.
 */
export function getWineRarityScore(wine) {
  if (!wine) return null;

  let totalPoints = 0;
  let signalCount = 0;
  const maxPoints = 100;

  // 1. Market / estimated unit value — up to 30 pts
  const unitValue = getWineUnitValue(wine);
  if (unitValue > 0) {
    signalCount++;
    if (unitValue >= 2000)      totalPoints += 30;
    else if (unitValue >= 1000) totalPoints += 25;
    else if (unitValue >= 500)  totalPoints += 20;
    else if (unitValue >= 200)  totalPoints += 14;
    else if (unitValue >= 75)   totalPoints += 8;
    else                        totalPoints += 3;
  }

  // 2. Vintage age — up to 20 pts
  if (wine.vintage) {
    const age = new Date().getFullYear() - Number(wine.vintage);
    signalCount++;
    if (age >= 40)      totalPoints += 20;
    else if (age >= 25) totalPoints += 16;
    else if (age >= 15) totalPoints += 11;
    else if (age >= 8)  totalPoints += 6;
    else if (age >= 3)  totalPoints += 2;
    // 0–2 years: no age contribution
  }

  // 3. Producer prestige — up to 20 pts
  if (wine.producer) {
    signalCount++;
    if (matchesPrestige(wine.producer, PRESTIGE_PRODUCERS)) {
      totalPoints += 20;
    } else if (wine.producer.length > 2) {
      // Known producer entered (some value, not prestige-listed)
      totalPoints += 3;
    }
  }

  // 4. Region / appellation prestige — up to 10 pts
  const regionStr = [wine.region, wine.appellation, wine.country_of_origin].filter(Boolean).join(' ');
  if (regionStr) {
    signalCount++;
    if (matchesPrestige(regionStr, PRESTIGE_REGIONS)) {
      totalPoints += 10;
    } else {
      totalPoints += 2;
    }
  }

  // 5. Drinking window — up to 10 pts
  const dwStatus = getWineDrinkWindowStatus(wine);
  if (dwStatus) {
    signalCount++;
    if (dwStatus === 'drink_now')  totalPoints += 10;
    else if (dwStatus === 'too_young') totalPoints += 5;
    else if (dwStatus === 'past_peak') totalPoints += 2;
  }

  // 6. Quantity scarcity — up to 5 pts (fewer bottles = scarcer)
  const qty = getWineQuantity(wine);
  if (qty > 0) {
    signalCount++;
    if (qty === 1)      totalPoints += 5;
    else if (qty <= 3)  totalPoints += 3;
    else if (qty <= 6)  totalPoints += 1;
  }

  // 7. Replacement difficulty signal — up to 5 pts
  if (wine.replacement_difficulty) {
    signalCount++;
    const rd = wine.replacement_difficulty;
    if (rd === 'very_hard') totalPoints += 5;
    else if (rd === 'hard') totalPoints += 3;
    else if (rd === 'moderate') totalPoints += 1;
  }

  // Require at least 2 signals for a meaningful score
  if (signalCount < 2) return null;

  return Math.min(maxPoints, Math.round(totalPoints));
}

/**
 * Returns an object with score, label, confidence, factors, and reasoning.
 * Mirrors WhiskeyKeeper rarity result shape.
 */
export function getWineRarityResult(wine) {
  if (!wine) return null;

  const score = getWineRarityScore(wine);

  if (score === null) {
    return {
      score: null,
      label: null,
      confidence: 'insufficient',
      factors: [],
      reasoning: 'Not enough data to score rarity yet.',
    };
  }

  const label =
    score >= 85 ? 'Exceptional' :
    score >= 65 ? 'Rare' :
    score >= 45 ? 'Collectible' :
    score >= 25 ? 'Notable' :
    'Common';

  const confidence =
    getWineValuationConfidence(wine) === 'high' || getWineValuationConfidence(wine) === 'manual'
      ? 'high'
      : getWineValuationConfidence(wine) === 'medium' ? 'medium' : 'low';

  const unitValue = getWineUnitValue(wine);
  const factors = [];

  if (unitValue > 0) factors.push({ label: 'Market Value', note: `$${Math.round(unitValue)}/btl` });
  if (wine.vintage) factors.push({ label: 'Vintage', note: `${wine.vintage} (${new Date().getFullYear() - Number(wine.vintage)} yrs)` });
  if (wine.producer) factors.push({ label: 'Producer', note: wine.producer });
  if (wine.region || wine.appellation) factors.push({ label: 'Region', note: wine.appellation || wine.region });
  const dwStatus = getWineDrinkWindowStatus(wine);
  if (dwStatus) factors.push({ label: 'Drinking Window', note: { drink_now: 'Drink Now', too_young: 'Too Young', past_peak: 'Past Peak' }[dwStatus] });
  if (wine.replacement_difficulty) factors.push({ label: 'Replacement', note: wine.replacement_difficulty.replace('_', ' ') });

  const reasoning = [
    unitValue > 0 && `Market value $${Math.round(unitValue)}/btl`,
    wine.vintage && `${new Date().getFullYear() - Number(wine.vintage)}-year-old vintage`,
    matchesPrestige(wine.producer, PRESTIGE_PRODUCERS) && 'Prestige producer',
    matchesPrestige([wine.region, wine.appellation, wine.country_of_origin].filter(Boolean).join(' '), PRESTIGE_REGIONS) && 'Prestigious region',
    dwStatus === 'drink_now' && 'Currently in drinking window',
  ].filter(Boolean).join('. ') || 'Score based on available data.';

  return { score, label, confidence, factors, reasoning };
}

/** Convenience export — just the label string. */
export function getWineRarityLabel(wine) {
  const result = getWineRarityResult(wine);
  return result?.label || null;
}

// ---------------------------------------------------------------------------
// Sorting & filtering
// ---------------------------------------------------------------------------

export function sortWines(wines, sortKey) {
  if (!Array.isArray(wines)) return [];
  const list = [...wines];
  switch (sortKey) {
    case 'name_asc': return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'name_desc': return list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    case 'producer_asc': return list.sort((a, b) => (a.producer || '').localeCompare(b.producer || ''));
    case 'producer_desc': return list.sort((a, b) => (b.producer || '').localeCompare(a.producer || ''));
    case 'vintage_asc': return list.sort((a, b) => (n(a.vintage) || 9999) - (n(b.vintage) || 9999));
    case 'vintage_desc': return list.sort((a, b) => (n(b.vintage) || 0) - (n(a.vintage) || 0));
    case 'value_desc': return list.sort((a, b) => getWineTotalValue(b) - getWineTotalValue(a));
    case 'value_asc': return list.sort((a, b) => getWineTotalValue(a) - getWineTotalValue(b));
    case 'rating_desc': return list.sort((a, b) => (n(b.rating) || 0) - (n(a.rating) || 0));
    case 'quantity_desc': return list.sort((a, b) => getWineQuantity(b) - getWineQuantity(a));
    case 'region_asc': return list.sort((a, b) => (a.region || '').localeCompare(b.region || ''));
    case 'varietal_asc': return list.sort((a, b) => (a.varietal || '').localeCompare(b.varietal || ''));
    case 'style_asc': return list.sort((a, b) => (a.style || '').localeCompare(b.style || ''));
    case 'drink_window': return list.sort((a, b) => {
      const aEnd = a.drink_window_end || a.drinking_window_end;
      const bEnd = b.drink_window_end || b.drinking_window_end;
      if (!aEnd && !bEnd) return 0;
      if (!aEnd) return 1;
      if (!bEnd) return -1;
      return new Date(aEnd) - new Date(bEnd);
    });
    case 'drink_now': return list.sort((a, b) => {
      const aStatus = getWineDrinkWindowStatus(a);
      const bStatus = getWineDrinkWindowStatus(b);
      const rank = { drink_now: 0, too_young: 1, past_peak: 2 };
      return (rank[aStatus] ?? 3) - (rank[bStatus] ?? 3);
    });
    case 'recently_added': return list.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    case 'recently_updated': return list.sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
    case 'needs_valuation': return list.sort((a, b) => (hasWineValuation(a) ? 1 : 0) - (hasWineValuation(b) ? 1 : 0));
    default: return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
}

export function filterWines(wines, filters = {}) {
  if (!Array.isArray(wines)) return [];
  return wines.filter((wine) => {
    if (filters.style && wine.style !== filters.style) return false;
    if (filters.varietal && !(wine.varietal || '').toLowerCase().includes(filters.varietal.toLowerCase())) return false;
    if (filters.region && !(wine.region || '').toLowerCase().includes(filters.region.toLowerCase())) return false;
    if (filters.country && !(wine.country_of_origin || wine.country || '').toLowerCase().includes(filters.country.toLowerCase())) return false;
    if (filters.vintage_min && Number(wine.vintage) < Number(filters.vintage_min)) return false;
    if (filters.vintage_max && Number(wine.vintage) > Number(filters.vintage_max)) return false;
    if (filters.drink_window) {
      const status = getWineDrinkWindowStatus(wine);
      if (status !== filters.drink_window) return false;
    }
    if (filters.valued === 'valued' && !hasWineValuation(wine)) return false;
    if (filters.valued === 'unvalued' && hasWineValuation(wine)) return false;
    if (filters.min_rating && n(wine.rating) < Number(filters.min_rating)) return false;
    return true;
  });
}

export function searchWines(wines, query) {
  if (!query) return wines;
  const q = query.toLowerCase();
  return wines.filter((w) =>
    [w.name, w.producer, w.varietal, w.region, w.country_of_origin, w.country, w.appellation, w.style, w.notes, String(w.vintage || '')]
      .some((v) => v?.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------
// Collection-level selectors
// ---------------------------------------------------------------------------

export function selectWineCount(wines) {
  return selectActiveWines(wines).length;
}

export function selectTotalWineBottles(wines) {
  return selectActiveWines(wines).reduce((s, w) => s + getWineQuantity(w), 0);
}

export function selectWineCollectionValue(wines) {
  return selectActiveWines(wines).reduce((s, w) => s + getWineTotalValue(w), 0);
}

export function selectUnvaluedWineCount(wines) {
  return selectActiveWines(wines).filter((w) => !hasWineValuation(w)).length;
}

export function selectWineReadyToDrinkCount(wines) {
  return selectActiveWines(wines).filter((w) => getWineDrinkWindowStatus(w) === 'drink_now').length;
}

// ---------------------------------------------------------------------------
// Tasting-log selectors
// ---------------------------------------------------------------------------

/**
 * Count WineTasting records (all tastings for the wine collection).
 *
 * @param {object[]} tastings
 * @returns {number}
 */
export function selectWineTastingCount(tastings) {
  return Array.isArray(tastings) ? tastings.length : 0;
}

/**
 * Build a map of { wine_id → tasting count } from WineTasting records.
 *
 * @param {object[]} tastings
 * @returns {Record<string, number>}
 */
export function buildWineTastingIndex(tastings) {
  if (!Array.isArray(tastings)) return {};
  return tastings.reduce((acc, t) => {
    if (!t?.wine_id) return acc;
    acc[t.wine_id] = (acc[t.wine_id] || 0) + 1;
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Combined metrics object
// ---------------------------------------------------------------------------

/**
 * selectWineMetrics — compute all canonical wine metrics in one call.
 *
 * Mirrors the selectWhiskeyMetrics / selectPipeMetrics pattern so every
 * surface (dashboard, insights, reports, AI) can consume a single object.
 *
 * @param {object[]} wines
 * @param {object[]} [tastings]
 * @returns {{
 *   wine_count:          number,
 *   total_in_cellar:     number,
 *   collection_value:    number,
 *   unvalued_count:      number,
 *   ready_to_drink:      number,
 *   total_tastings:      number,
 *   average_rating:      number|null,
 * }}
 */
export function selectWineMetrics(wines = [], tastings = []) {
  const wineList = selectActiveWines(wines);

  const rated = wineList.filter((w) => w?.rating != null && Number(w.rating) > 0);
  const average_rating =
    rated.length > 0
      ? rated.reduce((s, w) => s + Number(w.rating), 0) / rated.length
      : null;

  return {
    wine_count:       selectWineCount(wineList),
    total_in_cellar:  selectTotalWineBottles(wineList),
    collection_value: selectWineCollectionValue(wineList),
    unvalued_count:   selectUnvaluedWineCount(wineList),
    ready_to_drink:   selectWineReadyToDrinkCount(wineList),
    total_tastings:   selectWineTastingCount(tastings),
    average_rating,
  };
}
