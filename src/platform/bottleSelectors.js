/**
 * Bottle Selectors — Single source of truth for bottle statistics.
 *
 * All screens (Dashboard, Insights, Curator, Cards, Reports) must use
 * computeBottleStats() instead of computing counts inline.
 */

/**
 * Compute canonical bottle statistics from raw data.
 *
 * @param {Array} bottles        — array of Bottle records
 * @param {Array} inventoryUnits — array of InventoryUnit records (optional)
 * @returns {{
 *   bottles_total:         number,  // sum of all inventory units
 *   bottles_open:          number,  // units with status open/drinking
 *   bottles_sealed:        number,  // units with status reserve/sealed
 *   distinct_bottle_types: number,  // unique bottle records (labels)
 * }}
 */
export function computeBottleStats(bottles = [], inventoryUnits = []) {
  const distinctBottleTypes = Array.isArray(bottles) ? bottles.length : 0;

  if (!Array.isArray(inventoryUnits) || inventoryUnits.length === 0) {
    // Fall back to bottle-level quantity fields
    let total = 0;
    let open = 0;
    let sealed = 0;
    for (const b of (bottles || [])) {
      const qty = Math.max(0, Number(b?.bottle_count) || Number(b?.quantity) || 0);
      total += qty;
      const fill = Number(b?.current_fill ?? 100);
      if (fill < 100) open += qty;
      else sealed += qty;
    }
    return { bottles_total: total, bottles_open: open, bottles_sealed: sealed, distinct_bottle_types: distinctBottleTypes };
  }

  let total = 0;
  let open = 0;
  let sealed = 0;

  for (const unit of inventoryUnits) {
    const qty = Number(unit?.quantity) || 1;
    total += qty;
    const status = String(unit?.status || '').toLowerCase();
    if (status === 'open' || status === 'drinking') {
      open += qty;
    } else if (status === 'reserve' || status === 'sealed') {
      sealed += qty;
    }
  }

  return { bottles_total: total, bottles_open: open, bottles_sealed: sealed, distinct_bottle_types: distinctBottleTypes };
}
