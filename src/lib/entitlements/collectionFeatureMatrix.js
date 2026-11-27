/**
 * src/lib/entitlements/collectionFeatureMatrix.js
 *
 * Collection-wide feature entitlement matrix for Collection Intelligence 2.0.
 *
 * Two kinds of rows, same contract as the CigarKeeper matrix:
 *   enforcement: 'live'     — what the app enforces today (verified in code).
 *   enforcement: 'proposed' — a recommendation only. Nothing is blocked by a
 *                             proposed row; it exists so the decision can be
 *                             reviewed and approved before any right changes.
 *
 * Free inventory management, acquisition documentation, basic storage
 * management and the existing free features are preserved as free rows.
 */

export const MODULES = Object.freeze({
  pipekeeper: 'PipeKeeper',
  tobacco: 'Tobacco cellar',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
  shared: 'Collection-wide',
});

export const MEMBERSHIP_LEVELS = Object.freeze(['free', 'pro']);

const TIER_RANK = { free: 0, pro: 1 };

export function tierRank(tier) {
  return TIER_RANK[String(tier || 'free').toLowerCase()] ?? 0;
}

export function normalizeTier(tier) {
  const value = String(tier || 'free').toLowerCase();
  return MEMBERSHIP_LEVELS.includes(value) ? value : 'free';
}

function row(id, label, group, requiredTier, modules, options = {}) {
  return Object.freeze({
    id,
    label,
    group,
    requiredTier,
    modules: Object.freeze(modules),
    enforcement: options.enforcement || 'live',
    note: options.note || '',
  });
}

const ALL_MODULES = Object.keys(MODULES);

export const COLLECTION_FEATURE_MATRIX = Object.freeze([
  // ── Preserved free capabilities ────────────────────────────────────────────
  row('collection.inventory', 'Inventory and quantity tracking', 'collection', 'free', ALL_MODULES),
  row('collection.records', 'Records, photographs and personal notes', 'collection', 'free', ALL_MODULES),
  row('collection.acquisition', 'Acquisition documentation and provenance', 'collection', 'free', ALL_MODULES),
  row('collection.storage', 'Basic storage management and assignment', 'storage', 'free', ALL_MODULES),
  row('collection.storage_position', 'Shelf, tray and drawer positions', 'storage', 'free', ALL_MODULES),
  row('collection.ratings', 'Ratings and tasting notes', 'collection', 'free', ALL_MODULES),
  row('collection.search', 'Search, filter and sort', 'navigation', 'free', ALL_MODULES),
  row('collection.lifecycle', 'Archive and lifecycle states', 'collection', 'free', ALL_MODULES),
  row('collection.documents', 'Private document attachments', 'documents', 'free', ALL_MODULES),
  row('collection.csv_basic', 'Basic CSV export of a collection list', 'reports', 'free', ALL_MODULES, {
    note: 'The list-level CSV export that has always been free.',
  }),

  // ── Live Pro capabilities (verified in code this release) ──────────────────
  row('curator.analysis', 'Curator collection analysis and conversation', 'intelligence', 'pro', ALL_MODULES, {
    note: 'Gated by module entitlement in the UI; the AI-consuming endpoints now re-check server-side.',
  }),
  row('curator.record_actions', 'Curator proposed record changes (apply and undo)', 'intelligence', 'pro', ALL_MODULES, {
    note: 'Server re-validates ownership and entitlement before writing.',
  }),
  row('curator.session_recommendations', 'Curator session recommendations', 'intelligence', 'pro', ALL_MODULES),
  row('reports.center_view', 'Reporting Center — viewing all reports', 'reports', 'free', ALL_MODULES, {
    note: 'Viewing stays open to every signed-in collector, matching the existing Collection Reports page.',
  }),
  row('reports.export', 'Report export (PDF and CSV)', 'reports', 'pro', ALL_MODULES, {
    note: 'Re-checked by the reportCenter function with requireEntitlement(EXPORT_REPORTS).',
  }),

  // ── Proposed (documented only, never enforced here) ────────────────────────
  row('reports.advanced', 'Configurable dashboards and advanced reporting', 'reports', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Built and visible to every collector in this release. Requires approval before enforcement.',
  }),
  row('reports.insurance_estate', 'Insurance and estate documentation exports', 'reports', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Available today through the Valuation Center. Proposed for Pro; approval required.',
  }),
  row('valuation.center', 'Valuation Center (costs, appraisals, snapshots)', 'value', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Built and reachable by every collector today. Approval required before gating.',
  }),
  row('share.read_only_links', 'Read-only collection share links', 'sharing', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Private by default and already server-projected. Approval required before gating.',
  }),
  row('share.gift_membership', 'Software membership gifting and redemption', 'sharing', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Administrative issuance; redemption is a membership right, not a paid feature.',
  }),
  row('collection.curator_advanced', 'Advanced Curator collection explanations', 'intelligence', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Reserved for a future Pro-only depth tier. Not built as a separate gate.',
  }),
  row('collection.bulk_tools', 'Bulk edit, merge and duplicate review', 'tools', 'pro', ALL_MODULES, {
    enforcement: 'proposed',
    note: 'Available to every collector today through Collection Tools. Approval required.',
  }),
]);

const MATRIX_BY_ID = new Map(COLLECTION_FEATURE_MATRIX.map((feature) => [feature.id, feature]));

export function getCollectionFeature(featureId) {
  return MATRIX_BY_ID.get(featureId) || null;
}

/**
 * Access decision for one feature at one membership level.
 * A proposed row reports what it would require but never blocks.
 */
export function resolveCollectionFeature(featureId, tier = 'free') {
  const feature = getCollectionFeature(featureId);
  const currentTier = normalizeTier(tier);
  if (!feature) {
    return { featureId, known: false, allowed: true, enforced: false, requiredTier: 'free', tier: currentTier };
  }
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

export function featuresForCollectionTier(tier = 'free') {
  return COLLECTION_FEATURE_MATRIX.filter(
    (feature) => tierRank(feature.requiredTier) <= tierRank(normalizeTier(tier))
  );
}

export function collectionFeaturesByGroup() {
  return COLLECTION_FEATURE_MATRIX.reduce((acc, feature) => {
    if (!acc[feature.group]) acc[feature.group] = [];
    acc[feature.group].push(feature);
    return acc;
  }, {});
}

/** Counts used by the admin diagnostics page and by tests. */
export function summarizeCollectionMatrix() {
  return COLLECTION_FEATURE_MATRIX.reduce(
    (acc, feature) => {
      acc.total += 1;
      acc[feature.enforcement] = (acc[feature.enforcement] || 0) + 1;
      acc.byTier[feature.requiredTier] = (acc.byTier[feature.requiredTier] || 0) + 1;
      return acc;
    },
    { total: 0, live: 0, proposed: 0, byTier: { free: 0, pro: 0 } }
  );
}

/** Every free-tier row — the rights that must not regress. */
export function freeCollectionFeatureIds() {
  return COLLECTION_FEATURE_MATRIX.filter((feature) => feature.requiredTier === 'free').map((feature) => feature.id);
}

/** Rows that would change an existing right if approved. */
export function proposedCollectionFeatureIds() {
  return COLLECTION_FEATURE_MATRIX.filter((feature) => feature.enforcement === 'proposed').map((feature) => feature.id);
}