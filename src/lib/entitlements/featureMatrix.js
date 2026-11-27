/**
 * src/lib/entitlements/featureMatrix.js
 *
 * The feature entitlement matrix: one place that says which membership level a
 * feature belongs to.
 *
 * Two kinds of rows:
 *   enforcement: 'live'     — matches what the app enforces today.
 *   enforcement: 'proposed' — a recommendation for Pro/Premium that is NOT
 *                             enforced. Nothing is blocked by a proposed row;
 *                             it exists so the change can be reviewed and
 *                             approved before any right is taken away.
 *
 * Free inventory management, acquisition documentation and basic storage
 * management are preserved as free rows.
 */

export const MEMBERSHIP_LEVELS = Object.freeze(['free', 'pro', 'premium']);

const TIER_RANK = { free: 0, pro: 1, premium: 2 };

export function tierRank(tier) {
  return TIER_RANK[String(tier || 'free').toLowerCase()] ?? 0;
}

export function normalizeTier(tier) {
  const value = String(tier || 'free').toLowerCase();
  return MEMBERSHIP_LEVELS.includes(value) ? value : 'free';
}

function row(id, label, group, requiredTier, options = {}) {
  return Object.freeze({
    id,
    label,
    group,
    requiredTier,
    enforcement: options.enforcement || 'live',
    module: options.module || 'cigarkeeper',
    note: options.note || '',
  });
}

export const FEATURE_MATRIX = Object.freeze([
  // ── Preserved free capabilities ─────────────────────────────────────────────
  row('cigars.inventory', 'Cigar inventory and quantity tracking', 'collection', 'free'),
  row('cigars.acquisition', 'Acquisition documentation and provenance', 'collection', 'free'),
  row('cigars.records', 'Cigar records, photographs and notes', 'collection', 'free'),
  row('cigars.storage', 'Basic storage management (humidors, assignment)', 'storage', 'free'),
  row('cigars.storage_position', 'Tray / shelf / drawer positions', 'storage', 'free'),
  row('cigars.ratings', 'Structured ratings and tasting notes', 'collection', 'free'),
  row('cigars.humidor_maintenance', 'Humidor maintenance and inspection records', 'storage', 'free'),
  row('cigars.environment_log', 'Manual humidity and temperature readings', 'environment', 'free'),

  // ── Live Pro capabilities ───────────────────────────────────────────────────
  row('cigars.curator', 'Curator collection analysis', 'intelligence', 'pro', {
    note: 'Gated by module entitlement today.',
  }),
  row('cigars.valuation', 'Estimated collection values and valuation snapshots', 'value', 'pro'),
  row('cigars.insights', 'CigarKeeper insights and analytics screens', 'intelligence', 'pro'),
  row('cigars.reports', 'Report generation', 'reports', 'pro'),

  // ── Proposed (documented only, never enforced here) ─────────────────────────
  row('cigars.environment_history', 'Environmental history charts and threshold alerts', 'environment', 'pro', {
    enforcement: 'proposed',
    note: 'Built and visible to every collector in this release. Proposed for Pro before enforcement.',
  }),
  row('cigars.reconciliation', 'Humidor reconciliation and discrepancy reporting', 'storage', 'pro', {
    enforcement: 'proposed',
    note: 'Built and visible to every collector in this release. Proposed for Pro before enforcement.',
  }),
  row('cigars.advanced_reports', 'Configurable dashboard metrics and advanced reporting', 'reports', 'pro', {
    enforcement: 'proposed',
  }),
  row('cigars.insurance_docs', 'Insurance and estate documentation exports', 'reports', 'premium', {
    enforcement: 'proposed',
  }),
  row('cigars.curator_advanced', 'Curator advanced collection explanations', 'intelligence', 'premium', {
    enforcement: 'proposed',
  }),
]);

const MATRIX_BY_ID = new Map(FEATURE_MATRIX.map((feature) => [feature.id, feature]));

export function getFeature(featureId) {
  return MATRIX_BY_ID.get(featureId) || null;
}

/**
 * Access decision for one feature at one membership level.
 *
 * A proposed row reports what it would require, but `enforced: false` — callers
 * must not block on it.
 */
export function resolveFeatureAccess(featureId, tier = 'free') {
  const feature = getFeature(featureId);
  if (!feature) {
    return { featureId, known: false, allowed: true, enforced: false, requiredTier: 'free', tier: normalizeTier(tier) };
  }
  const currentTier = normalizeTier(tier);
  const meetsTier = tierRank(currentTier) >= tierRank(feature.requiredTier);
  return {
    featureId,
    known: true,
    label: feature.label,
    group: feature.group,
    requiredTier: feature.requiredTier,
    tier: currentTier,
    allowed: feature.enforcement === 'proposed' ? true : meetsTier,
    meetsTier,
    enforced: feature.enforcement === 'live',
    enforcement: feature.enforcement,
    note: feature.note,
  };
}

export function featuresForTier(tier = 'free') {
  return FEATURE_MATRIX.filter((feature) => tierRank(feature.requiredTier) <= tierRank(normalizeTier(tier)));
}

export function featuresByGroup() {
  return FEATURE_MATRIX.reduce((acc, feature) => {
    if (!acc[feature.group]) acc[feature.group] = [];
    acc[feature.group].push(feature);
    return acc;
  }, {});
}

/** Counts used by the admin matrix view and by tests. */
export function summarizeMatrix() {
  return FEATURE_MATRIX.reduce(
    (acc, feature) => {
      acc.total += 1;
      acc[feature.enforcement] = (acc[feature.enforcement] || 0) + 1;
      acc.byTier[feature.requiredTier] = (acc.byTier[feature.requiredTier] || 0) + 1;
      return acc;
    },
    { total: 0, live: 0, proposed: 0, byTier: { free: 0, pro: 0, premium: 0 } }
  );
}

/** Every free-tier row, i.e. the rights that must not regress. */
export function freeFeatureIds() {
  return FEATURE_MATRIX.filter((feature) => feature.requiredTier === 'free').map((feature) => feature.id);
}

/** Rows that would change an existing right if approved. */
export function proposedFeatureIds() {
  return FEATURE_MATRIX.filter((feature) => feature.enforcement === 'proposed').map((feature) => feature.id);
}