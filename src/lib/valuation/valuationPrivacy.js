/**
 * src/lib/valuation/valuationPrivacy.js
 *
 * Financial records stay private by default.
 *
 * A publicly shared collection, a community profile or an exported link shows
 * that an item exists and how it is documented. It never shows cost, value,
 * appraisal figures, insurance status or valuation history unless the owner has
 * explicitly authorized financial fields for that share.
 *
 * Pure functions only.
 */

export const FINANCIAL_FIELDS = Object.freeze([
  'amount',
  'amount_base',
  'currency',
  'fx_rate',
  'range_low',
  'range_high',
  'purchase_price',
  'purchase_cost',
  'estimated_value',
  'estimated_total_value',
  'market_estimated_total_value',
  'market_estimated_unit_value',
  'estimated_unit_value',
  'manual_estimated_value',
  'collector_value',
  'retail_price',
  'aftermarket_price',
  'manual_value_override',
  'average_market_value',
  'ai_estimated_value',
  'ai_value_range_low',
  'ai_value_range_high',
  'ai_projection_12m',
  'ai_projection_36m',
  'valuation',
  'valuation_amount',
  'insurance_value',
]);

const FINANCIAL_FIELD_SET = new Set(FINANCIAL_FIELDS);

/**
 * May financial fields be included in a share?
 *
 * Anything other than an explicit `true` on the share authorization denies.
 */
export function canExposeFinancials(authorization = {}) {
  return authorization?.include_financials === true || authorization?.include_value === true && authorization?.financial_authorized === true;
}

/** Remove every financial field from an object, recursively (arrays included). */
export function stripFinancialFields(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((entry) => stripFinancialFields(entry, depth + 1));
  if (typeof value !== 'object') return value;

  return Object.entries(value).reduce((acc, [key, entry]) => {
    if (FINANCIAL_FIELD_SET.has(key)) return acc;
    acc[key] = stripFinancialFields(entry, depth + 1);
    return acc;
  }, {});
}

/**
 * Public view of a valuation entry.
 *
 * Without authorization the collector's own figures are removed but the
 * documentation facts remain: that an appraisal exists, its date and its
 * confidence band. That is enough for provenance and preservation display
 * without disclosing money.
 */
export function buildPublicValuationView(entry = {}, authorization = {}) {
  const authorized = canExposeFinancials(authorization);
  const base = {
    kind: entry?.kind || null,
    kind_label: entry?.kindLabel || entry?.kind_label || null,
    evidence: entry?.evidence || null,
    valuation_date: entry?.valuationDate || entry?.valuation_date || null,
    confidence: entry?.confidence || null,
    verified: Boolean(entry?.verified),
    document_count: entry?.documentCount ?? entry?.document_count ?? 0,
    appraiser_named: Boolean(entry?.appraiser),
  };

  if (!authorized) return base;

  return {
    ...base,
    amount: entry?.amount ?? null,
    currency: entry?.currency ?? null,
    amount_base: entry?.amountBase ?? entry?.amount_base ?? null,
    range_low: entry?.rangeLow ?? entry?.range_low ?? null,
    range_high: entry?.rangeHigh ?? entry?.range_high ?? null,
    source: entry?.source || '',
    methodology: entry?.methodology || '',
  };
}

/** True when a share configuration would disclose money. */
export function shareDisclosesFinancials(shareConfig = {}) {
  return canExposeFinancials(shareConfig);
}

/** Human-readable reminder shown wherever a share is configured. */
export const PRIVACY_NOTICE =
  'Costs, values, appraisals and insurance details stay private. They are never included in a shared collection unless you turn on financial fields for that share.';