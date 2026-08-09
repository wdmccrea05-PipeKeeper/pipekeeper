// platform/dashboard.js
// Shared dashboard aggregation service for the CollectionKeeper platform.
//
// Prepares reusable aggregation logic for the future CollectionKeeper Hub
// central dashboard. PipeKeeper continues to use the same visible dashboard,
// but the underlying aggregation logic is now shared and module-agnostic.
//
// Aggregated concepts:
//   - total item count
//   - total collection value
//   - recent activity
//   - favorites
//   - AI-eligible count
//   - module summary cards

import { buildCanonicalCollectionAggregate } from './reporting.js';

/**
 * Aggregate statistics for a single collection of items.
 * Works with both raw module records and normalized platform items.
 *
 * @param {object[]} items
 * @returns {{
 *   totalItemCount: number,
 *   favoriteCount: number,
 *   aiEligibleCount: number,
 *   aiExcludedCount: number,
 *   totalCollectionValue: number,
 * }}
 */
export function aggregateCollectionStats(items) {
  if (!Array.isArray(items)) {
    return {
      totalItemCount: 0,
      favoriteCount: 0,
      aiEligibleCount: 0,
      aiExcludedCount: 0,
      totalCollectionValue: 0,
    };
  }

  const aggregate = buildCanonicalCollectionAggregate(items);

  return {
    totalItemCount: aggregate.totalCount,
    favoriteCount: aggregate.favoriteCount,
    aiEligibleCount: aggregate.aiEligibleCount,
    aiExcludedCount: aggregate.aiExcludedCount,
    totalCollectionValue: aggregate.totalValue,
  };
}

/**
 * Aggregate per-module statistics.
 * Returns one stats object per module type key.
 *
 * @param {Record<string, object[]>} itemsByModule - e.g. { pipe: [...], tobacco: [...] }
 * @returns {Record<string, ReturnType<aggregateCollectionStats>>}
 */
export function aggregateModuleSummary(itemsByModule) {
  const summary = {};
  for (const [moduleType, items] of Object.entries(itemsByModule)) {
    summary[moduleType] = aggregateCollectionStats(items);
  }
  return summary;
}

/**
 * Aggregate platform-wide statistics across all modules.
 * Returns combined totals plus a per-module breakdown.
 * Designed as the data layer for the future CollectionKeeper Hub dashboard.
 *
 * @param {Record<string, object[]>} itemsByModule
 * @returns {ReturnType<aggregateCollectionStats> & { modules: Record<string, ReturnType<aggregateCollectionStats>> }}
 */
export function aggregatePlatformStats(itemsByModule) {
  const modules = aggregateModuleSummary(itemsByModule);
  const allItems = Object.values(itemsByModule).flat();
  return {
    ...aggregateCollectionStats(allItems),
    modules,
  };
}

/**
 * Sort items by most recently updated, for "recent activity" dashboard panels.
 * Falls back to created_at if updated_at is absent.
 *
 * @param {object[]} items
 * @param {number} [limit=10]
 * @returns {object[]}
 */
export function getRecentActivity(items, limit = 10) {
  if (!Array.isArray(items)) return [];
  return [...items]
    .sort((a, b) => {
      const aDate = new Date(a?.updated_at ?? a?.created_at ?? 0).getTime();
      const bDate = new Date(b?.updated_at ?? b?.created_at ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, limit);
}
