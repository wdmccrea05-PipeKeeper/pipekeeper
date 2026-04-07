/**
 * Curator Recommendation Schema
 *
 * Canonical schema definitions for the new Curator recommendation model.
 * Every recommendation is a structured object — no freeform prose blobs.
 */

// ─── Category Constants ───────────────────────────────────────────────────────

export const CATEGORY = {
  METADATA:       'metadata',
  BALANCE:        'balance',
  UTILIZATION:    'utilization',
  PURCHASE:       'purchase',
  SPECIALIZATION: 'specialization',
  PAIRING:        'pairing',
};

export const CATEGORY_LABELS = {
  [CATEGORY.METADATA]:       'Data & Metadata',
  [CATEGORY.BALANCE]:        'Collection Balance',
  [CATEGORY.UTILIZATION]:    'Utilization & Rotation',
  [CATEGORY.PURCHASE]:       'Purchase & Restock',
  [CATEGORY.SPECIALIZATION]: 'Specialization & Strategy',
  [CATEGORY.PAIRING]:        'Pairing & Experience',
};

export const CATEGORY_ORDER = [
  CATEGORY.METADATA,
  CATEGORY.BALANCE,
  CATEGORY.UTILIZATION,
  CATEGORY.PURCHASE,
  CATEGORY.SPECIALIZATION,
  CATEGORY.PAIRING,
];

// ─── Action Type Constants ────────────────────────────────────────────────────

export const ACTION_TYPE = {
  AUTO_FIX:        'auto_fix',
  ADVISORY:        'advisory',
  REVIEW_REQUIRED: 'review_required',
  MULTI_PATH:      'multi_path',
};

export const ACTION_TYPE_LABELS = {
  [ACTION_TYPE.AUTO_FIX]:        'Auto Fix',
  [ACTION_TYPE.ADVISORY]:        'Advisory',
  [ACTION_TYPE.REVIEW_REQUIRED]: 'Review Required',
  [ACTION_TYPE.MULTI_PATH]:      'Needs Your Input',
};

export const ACTION_TYPE_COLORS = {
  [ACTION_TYPE.AUTO_FIX]:        { bg: 'rgba(74,124,92,0.18)',  text: 'rgba(80,180,130,1)',   border: 'rgba(74,124,92,0.4)' },
  [ACTION_TYPE.ADVISORY]:        { bg: 'rgba(74,124,156,0.18)', text: 'rgba(120,170,220,1)',  border: 'rgba(74,124,156,0.4)' },
  [ACTION_TYPE.REVIEW_REQUIRED]: { bg: 'rgba(180,100,50,0.18)', text: 'rgba(220,140,90,1)',   border: 'rgba(180,100,50,0.4)' },
  [ACTION_TYPE.MULTI_PATH]:      { bg: 'rgba(139,94,58,0.18)',  text: 'rgba(200,155,100,1)',  border: 'rgba(139,94,58,0.4)' },
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
  MULTI:   'multi',
};

// ─── Ownership Context Constants ──────────────────────────────────────────────

export const OWNERSHIP_CONTEXT = {
  IN_COLLECTION: 'in_collection',
  EXTERNAL:      'external',
  MIXED:         'mixed',
};

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
    category:           CATEGORY.METADATA,
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
