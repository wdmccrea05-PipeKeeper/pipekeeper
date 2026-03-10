// platform/valuation.js
// Shared valuation service for the CollectionKeeper platform.
//
// Centralizes purchase price, estimated value, and total collection value logic
// so that future modules (WhiskeyKeeper, CigarKeeper, etc.) can reuse the same
// framework without duplicating logic.
//
// Works with both raw module records and normalized platform items.
// All items — including ai_excluded ones — count toward collection value.

/**
 * Resolve the best available value for a single item.
 * Prefers estimated_value; falls back to purchase_price; defaults to 0.
 *
 * @param {object} item - Raw or normalized item record.
 * @returns {number}
 */
export function getItemValue(item) {
  if (!item) return 0;
  const v = item.estimated_value ?? item.purchase_price ?? 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

/**
 * Sum the value of every item in a collection using getItemValue.
 *
 * @param {object[]} items
 * @returns {number}
 */
export function calculateCollectionValue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + getItemValue(item), 0);
}

/**
 * Produce a full valuation summary for a collection.
 * Suitable for dashboard cards, reports, and future cross-module hub totals.
 *
 * @param {object[]} items
 * @returns {{
 *   itemCount: number,
 *   totalPurchasePrice: number,
 *   totalEstimatedValue: number,
 *   totalValue: number,
 *   averageValue: number,
 * }}
 */
export function getValueSummary(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      itemCount: 0,
      totalPurchasePrice: 0,
      totalEstimatedValue: 0,
      totalValue: 0,
      averageValue: 0,
    };
  }

  const totalPurchasePrice = items.reduce((sum, item) => {
    const v = item?.purchase_price ?? 0;
    return sum + (typeof v === "number" ? v : parseFloat(v) || 0);
  }, 0);

  const totalEstimatedValue = items.reduce((sum, item) => {
    const v = item?.estimated_value ?? 0;
    return sum + (typeof v === "number" ? v : parseFloat(v) || 0);
  }, 0);

  const totalValue = calculateCollectionValue(items);

  return {
    itemCount: items.length,
    totalPurchasePrice,
    totalEstimatedValue,
    totalValue,
    averageValue: totalValue / items.length,
  };
}

/**
 * Aggregate valuation summaries across multiple modules.
 * Keys are module type strings (e.g. "pipe", "tobacco").
 *
 * @param {Record<string, object[]>} itemsByModule
 * @returns {Record<string, ReturnType<getValueSummary>> & { combined: ReturnType<getValueSummary> }}
 */
export function getMultiModuleValueSummary(itemsByModule) {
  const result = {};
  const allItems = [];

  for (const [moduleType, items] of Object.entries(itemsByModule)) {
    result[moduleType] = getValueSummary(items);
    allItems.push(...items);
  }

  result.combined = getValueSummary(allItems);
  return result;
}
