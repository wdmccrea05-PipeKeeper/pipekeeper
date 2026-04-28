/**
 * cigarValuation.js
 *
 * Pure helpers for deriving and refreshing CigarKeeper valuation fields.
 * Used by enrichCigar (EnrichButton) to produce a consistent, complete patch.
 */

const REFRESH_AFTER_DAYS = 30;

function getRemainingSticks(cigar) {
  const singles = Number(cigar?.singles_equivalent);
  if (Number.isFinite(singles) && singles > 0) return singles;
  const qty = Number(cigar?.quantity);
  const cpp = Number(cigar?.cigars_per_package);
  if (Number.isFinite(qty) && qty > 0 && Number.isFinite(cpp) && cpp > 0) return qty * cpp;
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

/**
 * Normalise a raw confidence string to 'high' | 'medium' | 'low'.
 * Returns 'low' for any unrecognised or empty value.
 */
export function normalizeCigarValuationConfidence(value) {
  const v = String(value || '').toLowerCase().trim();
  return ['high', 'medium', 'low'].includes(v) ? v : 'low';
}

/**
 * Returns true when cigar valuation should be refreshed.
 *
 * Refresh triggers:
 *  - no market_estimated_unit_value present
 *  - existing confidence is low
 *  - valuation_updated_at / market_valuation_updated_at is older than 30 days
 *
 * Returns false only when manual_valuation_enabled is true.
 */
export function shouldRefreshCigarValuation(cigar) {
  if (!cigar) return true;
  if (cigar.manual_valuation_enabled) return false;

  const hasMarketValue = Number(cigar.market_estimated_unit_value) > 0;
  if (!hasMarketValue) return true;

  const confidence = normalizeCigarValuationConfidence(
    cigar.valuation_confidence || cigar.market_valuation_confidence,
  );
  if (confidence === 'low') return true;

  const updatedAt = cigar.valuation_updated_at || cigar.market_valuation_updated_at;
  if (!updatedAt) return true;

  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) return true;

  const daysSince = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > REFRESH_AFTER_DAYS;
}

/**
 * Build a complete valuation patch from a cigar record and the LLM enrichment result.
 *
 * - Respects manual_valuation_enabled: returns {} if manual override is active.
 * - Per-stick value is required; total = per-stick × remaining sticks.
 * - Replacement estimate = per-stick × remaining sticks.
 * - Populates both market_* and canonical valuation fields.
 *
 * @param {object} cigar           Current cigar record
 * @param {object} enrichmentResult  Raw LLM response object
 * @returns {object}  Patch ready to be merged into the record update
 */
export function deriveCigarValuationPatch(cigar, enrichmentResult) {
  if (!cigar || !enrichmentResult) return {};
  if (cigar.manual_valuation_enabled) return {};

  const sticks = getRemainingSticks(cigar);
  const now = new Date().toISOString();

  const inferredUnit =
    Number(enrichmentResult.estimated_unit_value) > 0
      ? Number(enrichmentResult.estimated_unit_value)
      : Number(enrichmentResult.msrp_per_stick) > 0
        ? Number(enrichmentResult.msrp_per_stick)
        : null;

  if (!inferredUnit) return {};

  const totalValue = Math.round(inferredUnit * sticks * 100) / 100;
  const replacementCost = totalValue;

  const confidence = normalizeCigarValuationConfidence(enrichmentResult.valuation_confidence);
  const source =
    String(enrichmentResult.valuation_source || '').trim() || 'Market reference';
  const notes =
    String(enrichmentResult.valuation_notes || '').trim() || null;
  const comparableCount =
    Number(enrichmentResult.comparable_count) > 0
      ? Math.round(Number(enrichmentResult.comparable_count))
      : 1;

  return {
    // Market fields (primary)
    market_estimated_unit_value: inferredUnit,
    market_estimated_total_value: totalValue,
    market_replacement_cost_estimate: replacementCost,
    market_valuation_source: source,
    market_valuation_confidence: confidence,
    market_valuation_updated_at: now,
    market_comparable_count: comparableCount,
    // Canonical fields
    valuation_source: source,
    valuation_confidence: confidence,
    valuation_notes: notes,
    valuation_updated_at: now,
  };
}
