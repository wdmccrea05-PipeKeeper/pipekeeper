/**
 * wineValuation.js
 *
 * Pure helpers for deriving and refreshing WineKeeper valuation fields.
 * Used by enrichWine (EnrichButton) to produce a consistent, complete patch.
 */

const REFRESH_AFTER_DAYS = 30;

/**
 * Normalise a raw confidence string to 'high' | 'medium' | 'low'.
 * Returns 'low' for any unrecognised or empty value.
 */
export function normalizeWineValuationConfidence(value) {
  const v = String(value || '').toLowerCase().trim();
  return ['high', 'medium', 'low'].includes(v) ? v : 'low';
}

/**
 * Returns true when wine valuation should be refreshed.
 *
 * Refresh triggers:
 *  - no market_estimated_unit_value present
 *  - existing confidence is low
 *  - valuation_updated_at / market_valuation_updated_at is older than 30 days
 *
 * Returns false only when manual_valuation_enabled is true (never auto-overwrite
 * a manual override) or when a recent high/medium confidence market value exists.
 */
export function shouldRefreshWineValuation(wine) {
  if (!wine) return true;
  if (wine.manual_valuation_enabled) return false;

  const hasMarketValue = Number(wine.market_estimated_unit_value) > 0;
  if (!hasMarketValue) return true;

  const confidence = normalizeWineValuationConfidence(
    wine.valuation_confidence || wine.market_valuation_confidence,
  );
  if (confidence === 'low') return true;

  const updatedAt = wine.valuation_updated_at || wine.market_valuation_updated_at;
  if (!updatedAt) return true;

  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) return true;

  const daysSince = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > REFRESH_AFTER_DAYS;
}

/**
 * Build a complete valuation patch from a wine record and the LLM enrichment result.
 *
 * - Respects manual_valuation_enabled: returns {} if manual override is active.
 * - Falls back to purchase_price when the LLM produced no market estimate.
 * - Populates both canonical (estimated_*) and market (market_*) fields.
 * - Calculates total = unit × quantity.
 *
 * @param {object} wine           Current wine record
 * @param {object} enrichmentResult  Raw LLM response object
 * @returns {object}  Patch ready to be merged into the record update
 */
export function deriveWineValuationPatch(wine, enrichmentResult) {
  if (!wine || !enrichmentResult) return {};
  if (wine.manual_valuation_enabled) return {};

  const quantity = Math.max(1, Number(wine.quantity) || 1);
  const now = new Date().toISOString();

  const enrichedUnit =
    Number(enrichmentResult.estimated_unit_value) > 0
      ? Number(enrichmentResult.estimated_unit_value)
      : null;
  const purchaseUnit =
    Number(wine.purchase_price) > 0 ? Number(wine.purchase_price) : null;

  const unitValue = enrichedUnit ?? purchaseUnit;
  if (!unitValue) return {};

  const totalValue = Math.round(unitValue * quantity * 100) / 100;
  const replacementCost = totalValue;

  const confidence = normalizeWineValuationConfidence(
    enrichedUnit ? enrichmentResult.valuation_confidence : 'low',
  );
  const source = enrichedUnit
    ? (String(enrichmentResult.valuation_source || '').trim() || 'Market reference')
    : 'Purchase price (fallback)';
  const notes =
    String(enrichmentResult.valuation_notes || '').trim() || null;
  const comparableCount =
    Number(enrichmentResult.comparable_count) > 0
      ? Math.round(Number(enrichmentResult.comparable_count))
      : 1;

  return {
    // Canonical fields
    estimated_unit_value: unitValue,
    estimated_total_value: totalValue,
    replacement_cost_estimate: replacementCost,
    valuation_source: source,
    valuation_confidence: confidence,
    valuation_notes: notes,
    valuation_updated_at: now,
    // Market fields
    market_estimated_unit_value: unitValue,
    market_estimated_total_value: totalValue,
    market_replacement_cost_estimate: replacementCost,
    market_valuation_source: source,
    market_valuation_confidence: confidence,
    market_valuation_updated_at: now,
    market_comparable_count: comparableCount,
  };
}
