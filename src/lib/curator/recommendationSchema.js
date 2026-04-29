/**
 * Curator Recommendation Schema
 *
 * Canonical schema definitions for the Curator recommendation model.
 * Every recommendation is a structured object — no freeform prose blobs.
 *
 * Five canonical categories (per Curator specification):
 *   A. Record Optimization   — metadata enrichment, valuation, reclassification
 *   B. Collection Optimization — pipe specialization, reassignment, gap identification
 *   C. Purchase & Restock    — replenish items, convert wishlist to action
 *   D. Pairings              — session-ready combinations
 *   E. Grow & Expand         — curated outside-of-collection suggestions
 */

// ─── Category Constants ───────────────────────────────────────────────────────

export const CATEGORY = {
  // ── Five canonical Curator categories ────────────────────────────────────
  RECORD_OPTIMIZATION:      'record_optimization',    // A: metadata, valuation, reclassification
  COLLECTION_OPTIMIZATION:  'collection_optimization', // B: specialization, rotation, gap
  PURCHASE:                 'purchase',               // C: restock, wishlist conversion
  PAIRING:                  'pairing',                // D: session-ready combinations
  GROW_EXPAND:              'grow_expand',            // E: outside-of-collection suggestions

  // ── Legacy aliases (backward compat with UI surfaces that key on these) ──
  METADATA:         'record_optimization',   // → Record Optimization
  BALANCE:          'collection_optimization', // → Collection Optimization
  UTILIZATION:      'collection_optimization', // → Collection Optimization
  SPECIALIZATION:   'collection_optimization', // → Collection Optimization
  CIGAR_DISCOVERY:  'purchase',              // → Purchase & Restock
};

export const CATEGORY_LABELS = {
  [CATEGORY.RECORD_OPTIMIZATION]:     'Collection Health',
  [CATEGORY.COLLECTION_OPTIMIZATION]: 'Collection Optimization',
  [CATEGORY.PURCHASE]:                'Purchase & Restock',
  [CATEGORY.PAIRING]:                 'Pairings',
  [CATEGORY.GROW_EXPAND]:             'Grow & Expand',
};

export const CATEGORY_ORDER = [
  CATEGORY.RECORD_OPTIMIZATION,
  CATEGORY.COLLECTION_OPTIMIZATION,
  CATEGORY.PURCHASE,
  CATEGORY.PAIRING,
  CATEGORY.GROW_EXPAND,
];

// ─── Action Type Constants ────────────────────────────────────────────────────

export const ACTION_TYPE = {
  AUTO_FIX:             'auto_fix',
  ADVISORY:             'advisory',
  REVIEW_REQUIRED:      'review_required',
  MULTI_PATH:           'multi_path',
  SHOPPING_LIST_ACTION: 'shopping_list_action',
};

export const ACTION_TYPE_LABELS = {
  [ACTION_TYPE.AUTO_FIX]:             'Auto Fix',
  [ACTION_TYPE.ADVISORY]:             'Advisory',
  [ACTION_TYPE.REVIEW_REQUIRED]:      'Review Required',
  [ACTION_TYPE.MULTI_PATH]:           'Needs Your Input',
  [ACTION_TYPE.SHOPPING_LIST_ACTION]: 'Shopping Action',
};

export const ACTION_TYPE_COLORS = {
  [ACTION_TYPE.AUTO_FIX]:             { bg: 'rgba(74,124,92,0.18)',  text: 'rgba(80,180,130,1)',   border: 'rgba(74,124,92,0.4)' },
  [ACTION_TYPE.ADVISORY]:             { bg: 'rgba(74,124,156,0.18)', text: 'rgba(120,170,220,1)',  border: 'rgba(74,124,156,0.4)' },
  [ACTION_TYPE.REVIEW_REQUIRED]:      { bg: 'rgba(180,100,50,0.18)', text: 'rgba(220,140,90,1)',   border: 'rgba(180,100,50,0.4)' },
  [ACTION_TYPE.MULTI_PATH]:           { bg: 'rgba(139,94,58,0.18)',  text: 'rgba(200,155,100,1)',  border: 'rgba(139,94,58,0.4)' },
  [ACTION_TYPE.SHOPPING_LIST_ACTION]: { bg: 'rgba(74,124,156,0.18)', text: 'rgba(160,200,240,1)',  border: 'rgba(74,124,156,0.4)' },
};

// ─── Priority Constants ───────────────────────────────────────────────────────

export const PRIORITY = {
  HIGH:   'high',
  MEDIUM: 'medium',
  LOW:    'low',
};

export const PRIORITY_STYLES = {
  [PRIORITY.HIGH]:   { bg: 'rgba(139,58,58,0.2)',   text: 'rgba(220,140,140,1)',  border: 'rgba(139,58,58,0.35)',  label: 'High' },
  [PRIORITY.MEDIUM]: { bg: 'rgba(180,140,75,0.15)', text: 'rgba(212,165,116,1)',  border: 'rgba(180,140,75,0.3)',  label: 'Medium' },
  [PRIORITY.LOW]:    { bg: 'rgba(80,80,80,0.12)',   text: 'rgba(180,180,180,0.85)', border: 'rgba(100,100,100,0.22)', label: 'Low' },
};

// ─── Module Key Constants ─────────────────────────────────────────────────────

export const MODULE_KEY = {
  PIPE:    'pipe',
  TOBACCO: 'tobacco',
  WHISKEY: 'whiskey',
  CIGAR:   'cigar',
  WINE:    'wine',
  MULTI:   'multi',
};

// ─── Ownership Context Constants ──────────────────────────────────────────────

export const OWNERSHIP_CONTEXT = {
  IN_COLLECTION: 'in_collection',
  EXTERNAL:      'external',
  MIXED:         'mixed',
};

// ─── Scoring Engine ───────────────────────────────────────────────────────────

/**
 * Compute a multi-factor confidence string for a recommendation.
 *
 * Factors (each 0–1):
 *   preferenceAlignment    — how well the recommendation matches known preferences
 *   usageHistoryRelevance  — how much session log data supports this
 *   dataCompleteness       — how complete the relevant records are
 *   diversityContribution  — how much this adds variety vs. repeating the same advice
 *
 * Returns 'high' | 'medium' | 'low'.
 * If any factor is explicitly 0, the result is capped at 'medium'.
 * If insufficient data exists (all factors null/undefined), returns 'low'.
 */
export function computeConfidence({
  preferenceAlignment   = null,
  usageHistoryRelevance = null,
  dataCompleteness      = null,
  diversityContribution = null,
} = {}) {
  const factors = [
    preferenceAlignment,
    usageHistoryRelevance,
    dataCompleteness,
    diversityContribution,
  ].filter((f) => f !== null && f !== undefined);

  if (factors.length === 0) return 'low';

  const mean = factors.reduce((s, f) => s + f, 0) / factors.length;
  const hasZero = factors.some((f) => f === 0);

  if (mean >= 0.75 && !hasZero) return 'high';
  if (mean >= 0.4)               return 'medium';
  return 'low';
}

// ─── Factory Function ─────────────────────────────────────────────────────────

let _idCounter = 0;

/**
 * Create a structured recommendation object.
 *
 * @param {object} overrides - Fields to override / set
 * @returns {object} Structured recommendation
 */
export function createRecommendation(overrides = {}) {
  _idCounter += 1;
  const items = Array.isArray(overrides.items) ? overrides.items : [];
  const previewCount = 4;
  const previewItems = items.slice(0, previewCount);
  const remainingCount = Math.max(0, items.length - previewCount);

  return {
    id:                 `rec_${_idCounter}_${overrides.goal || 'unknown'}`,
    category:           CATEGORY.RECORD_OPTIMIZATION,
    goal:               '',
    actionType:         ACTION_TYPE.ADVISORY,
    title:              '',
    summary:            '',
    whyItMatters:       '',
    recommendationText: '',
    moduleKey:          MODULE_KEY.MULTI,
    ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority:           PRIORITY.MEDIUM,
    confidence:         'medium',
    items,
    previewItems,
    remainingCount,
    actionPayload:      null,
    detailPayload:      null,
    ...overrides,
    // Recompute preview after overrides
    previewItems:       items.slice(0, previewCount),
    remainingCount:     Math.max(0, items.length - previewCount),
  };
}
