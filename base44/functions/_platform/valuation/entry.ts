// functions/_platform/valuation.ts
// Shared valuation service (backend) — mirrors src/platform/valuation.js.
//
// Centralizes purchase_price, estimated_value, and total collection value logic
// so that future modules can reuse the same framework without duplicating logic.

type ItemLike = {
  estimated_value?: number | null;
  purchase_price?: number | null;
  [key: string]: unknown;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

/**
 * Resolve the best available value for a single item.
 * Prefers estimated_value; falls back to purchase_price; defaults to 0.
 */
export function getItemValue(item: ItemLike): number {
  if (!item) return 0;
  const v = item.estimated_value ?? item.purchase_price ?? 0;
  return toNumber(v);
}

/**
 * Sum the value of every item in a collection.
 */
export function calculateCollectionValue(items: ItemLike[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + getItemValue(item), 0);
}

/**
 * Produce a full valuation summary for a collection.
 */
export function getValueSummary(items: ItemLike[]): {
  itemCount: number;
  totalPurchasePrice: number;
  totalEstimatedValue: number;
  totalValue: number;
  averageValue: number;
} {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      itemCount: 0,
      totalPurchasePrice: 0,
      totalEstimatedValue: 0,
      totalValue: 0,
      averageValue: 0,
    };
  }

  const totalPurchasePrice = items.reduce(
    (sum, item) => sum + toNumber(item?.purchase_price),
    0
  );
  const totalEstimatedValue = items.reduce(
    (sum, item) => sum + toNumber(item?.estimated_value),
    0
  );
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
 */
export function getMultiModuleValueSummary(
  itemsByModule: Record<string, ItemLike[]>
): Record<string, ReturnType<typeof getValueSummary>> {
  const result: Record<string, ReturnType<typeof getValueSummary>> = {};
  const allItems: ItemLike[] = [];

  for (const [moduleType, items] of Object.entries(itemsByModule)) {
    result[moduleType] = getValueSummary(items);
    allItems.push(...items);
  }

  result.combined = getValueSummary(allItems);
  return result;
}
