// platform/reporting.js
// Shared reporting and export inclusion service for the CollectionKeeper platform.
//
// Centralizes the rules for which items appear in generated reports and exports.
// Future modules (WhiskeyKeeper, CigarKeeper, etc.) can reuse this framework
// without duplicating logic.
//
// Key rules:
//   - ai_excluded items ARE included in reports (exclusion only affects AI pipelines)
//   - public_visibility controls whether private items appear in shared/exported reports
//   - All items count toward collection value and inventory totals

/**
 * Filter items for inclusion in a report or export.
 *
 * @param {object[]} items - Raw or normalized item records.
 * @param {object} [options]
 * @param {boolean} [options.includePrivate=true] - When false, omit items where
 *   public_visibility is explicitly false.
 * @returns {object[]}
 */
export function getReportableItems(items, { includePrivate = true } = {}) {
  if (!Array.isArray(items)) return [];
  if (includePrivate) return items;
  return items.filter((item) => item && item.public_visibility !== false);
}

/**
 * Build a structured report data object for a collection of items.
 * Suitable as input for PDF/Excel export functions and dashboard summaries.
 *
 * @param {object[]} items - Raw or normalized item records.
 * @param {object} [options]
 * @param {boolean} [options.includePrivate=true] - Include private items.
 * @returns {{
 *   items: object[],
 *   totalCount: number,
 *   totalValue: number,
 *   favoriteCount: number,
 *   aiExcludedCount: number,
 * }}
 */
export function buildReportData(items, options = {}) {
  const reportableItems = getReportableItems(items, options);

  const totalValue = reportableItems.reduce((sum, item) => {
    const v = item?.estimated_value ?? item?.purchase_price ?? 0;
    return sum + (typeof v === "number" ? v : parseFloat(v) || 0);
  }, 0);

  const favoriteCount = reportableItems.filter(
    (item) => item?.is_favorite || item?.favorite
  ).length;

  const aiExcludedCount = reportableItems.filter(
    (item) => item?.ai_excluded
  ).length;

  return {
    items: reportableItems,
    totalCount: reportableItems.length,
    totalValue,
    favoriteCount,
    aiExcludedCount,
  };
}

export function buildCanonicalCollectionAggregate(items, options = {}) {
  const report = buildReportData(items, options);
  return {
    totalCount: report.totalCount,
    totalValue: report.totalValue,
    favoriteCount: report.favoriteCount,
    aiExcludedCount: report.aiExcludedCount,
    aiEligibleCount: report.totalCount - report.aiExcludedCount,
    reportableItems: report.items,
  };
}

/**
 * Build report data aggregated across multiple modules.
 *
 * @param {Record<string, object[]>} itemsByModule
 * @param {object} [options]
 * @returns {Record<string, ReturnType<buildReportData>> & { combined: ReturnType<buildReportData> }}
 */
export function buildMultiModuleReportData(itemsByModule, options = {}) {
  const result = {};
  const allItems = [];

  for (const [moduleType, items] of Object.entries(itemsByModule)) {
    result[moduleType] = buildReportData(items, options);
    allItems.push(...items);
  }

  result.combined = buildReportData(allItems, options);
  return result;
}
