/**
 * Recommendation Grouping
 *
 * Groups a flat list of recommendations into ordered category sections.
 *
 * Routing responsibilities (enforced by the engines):
 *
 *   RECORD_OPTIMIZATION:
 *     — Data quality issues only: missing metadata, non-canonical values, valuation gaps.
 *     — Examples: blend_missing_type, bottle_missing_valuation, pipe_missing_shape.
 *
 *   COLLECTION_OPTIMIZATION:
 *     — Collection-level concerns only: rotation, balance, specialization, gap analysis.
 *     — Examples: tobacco_type_imbalance, underused_blends, specialization_candidates.
 *
 * These two categories must NOT overlap. Record issues → RECORD_OPTIMIZATION.
 * Collection strategy → COLLECTION_OPTIMIZATION.
 */

import { CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from './recommendationSchema.js';

/**
 * Returns true if a recommendation should be excluded from Collection Optimization
 * rotation/utilization suggestions because it involves collectible/protected items.
 */
function isCollectibleOnlyRec(rec) {
  if (!rec?.items?.length) return false;
  return rec.items.every(
    (item) =>
      item.strategy === 'Hold' ||
      item.strategy === 'Protect' ||
      item.is_collectible === true ||
      item.collectible === true ||
      item.rarity === 'rare' ||
      item.rarity === 'very_rare' ||
      item.rarity === 'extremely_rare'
  );
}

export const COLLECTION_OPT_ROTATION_GOALS = new Set([
  'underused_blends', 'never_smoked_blends', 'underused_pipes', 'specialization_candidates',
]);

/**
 * Group recommendations by category in the canonical display order.
 *
 * @param {import('./recommendationSchema.js').Recommendation[]} recommendations
 * @returns {{ category: string, label: string, recommendations: object[] }[]}
 */
export function groupRecommendations(recommendations = []) {
  const byCategory = {};

  for (const rec of recommendations) {
    const cat = rec.category || CATEGORY.METADATA;

    // Skip collectible-only items from rotation/utilization goals in collection_optimization
    if (
      cat === CATEGORY.COLLECTION_OPTIMIZATION &&
      COLLECTION_OPT_ROTATION_GOALS.has(rec.goal) &&
      isCollectibleOnlyRec(rec)
    ) {
      continue;
    }

    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(rec);
  }

  return CATEGORY_ORDER
    .filter((cat) => byCategory[cat]?.length > 0)
    .map((cat) => ({
      category:        cat,
      label:           CATEGORY_LABELS[cat] || cat,
      title:           CATEGORY_LABELS[cat] || cat,
      recommendations: byCategory[cat],
    }));
}

/**
 * Flatten grouped sections back to a flat list.
 *
 * @param {{ recommendations: object[] }[]} sections
 * @returns {object[]}
 */
export function flattenGroupedRecommendations(sections = []) {
  return sections.flatMap((s) => s.recommendations || []);
}

/**
 * Get a display-ready summary of categories and counts.
 *
 * @param {{ category: string, label: string, recommendations: object[] }[]} sections
 * @returns {{ totalRecs: number, totalItems: number, sectionCount: number }}
 */
export function getGroupSummary(sections = []) {
  const totalRecs  = sections.reduce((s, g) => s + g.recommendations.length, 0);
  const totalItems = sections.reduce(
    (s, g) => s + g.recommendations.reduce((r, rec) => r + (rec.items?.length || 0), 0),
    0
  );
  return { totalRecs, totalItems, sectionCount: sections.length };
}