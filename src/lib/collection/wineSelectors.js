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

/** Compute a simple 0-100 rarity/collectibility score based on available data. */
export function getWineRarityScore(wine) {
  if (!wine) return null;
  let score = 0;
  let factors = 0;

  const unitValue = getWineUnitValue(wine);
  if (unitValue > 0) {
    factors++;
    // $0-50: 10pts, $50-150: 25, $150-500: 50, $500+: 75, $1000+: 90
    if (unitValue >= 1000) score += 90;
    else if (unitValue >= 500) score += 75;
    else if (unitValue >= 150) score += 50;
    else if (unitValue >= 50) score += 25;
    else score += 10;
  }

  // Vintage age
  if (wine.vintage) {
    factors++;
    const age = new Date().getFullYear() - Number(wine.vintage);
    if (age >= 30) score += 90;
    else if (age >= 20) score += 70;
    else if (age >= 10) score += 40;
    else if (age >= 5) score += 20;
    else score += 5;
  }

  // Drink window status contribution
  const dwStatus = getWineDrinkWindowStatus(wine);
  if (dwStatus === 'drink_now') { score += 20; factors++; }
  else if (dwStatus === 'too_young') { score += 10; factors++; }

  if (factors === 0) return null;
  return Math.min(100, Math.round(score / factors));
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
  return Array.isArray(wines) ? wines.length : 0;
}

export function selectTotalWineBottles(wines) {
  if (!Array.isArray(wines)) return 0;
  return wines.reduce((s, w) => s + getWineQuantity(w), 0);
}

export function selectWineCollectionValue(wines) {
  if (!Array.isArray(wines)) return 0;
  return wines.reduce((s, w) => s + getWineTotalValue(w), 0);
}

export function selectUnvaluedWineCount(wines) {
  if (!Array.isArray(wines)) return 0;
  return wines.filter((w) => !hasWineValuation(w)).length;
}