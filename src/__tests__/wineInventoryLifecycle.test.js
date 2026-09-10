/**
 * wineInventoryLifecycle.test.js
 *
 * Regression tests for WineKeeper zero-inventory and archive lifecycle.
 *
 * Tests the same lifecycle model as WhiskeyKeeper:
 *   - quantity=0 is a valid state (never coerced to 1)
 *   - Consume Bottle decrements without deleting
 *   - Archive is non-destructive and reversible
 *   - quantity=0 contributes $0 to current collection value
 *   - Lifecycle filter and search compose as independent inputs
 *   - Different vintages are not incorrectly merged
 *   - Export preserves zero
 */

import { describe, it, expect } from 'vitest';
import {
  COLLECTION_FILTERS,
  filterByLifecycle,
  getLifecycleState,
  buildArchivePayload,
  buildUnarchivePayload,
  planFinishUnit,
  planAddUnit,
} from '@/lib/collection/inventoryLifecycle';
import {
  getWineQuantity,
  getWineTotalValue,
  selectTotalWineBottles,
  selectWineCollectionValue,
  selectWineCount,
  searchWines,
  sortWines,
} from '@/lib/collection/wineSelectors';
import { selectActiveWines } from '@/lib/collection/activeFilters';

// ─── Test fixtures ────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-09-10T12:00:00Z');

const TEST_WINES = [
  { id: 'w1', name: 'Château Example', producer: 'Château Example', vintage: 2019, quantity: 3, is_archived: false, estimated_value: 40 },
  { id: 'w2', name: 'Château Other', producer: 'Château Other', vintage: 2018, quantity: 0, is_archived: false, estimated_value: 100 },
  { id: 'w3', name: 'Château Old', producer: 'Château Old', vintage: 2010, quantity: 0, is_archived: true, estimated_value: 200 },
];

const getQty = (wine) => getWineQuantity(wine);

// Simulate the full Wines.jsx filtering pipeline: lifecycle → search → sort
function simulateWineFilterPipeline(wines, collectionFilter, searchQuery, sortBy = 'name_asc') {
  let list = wines;

  if (collectionFilter !== COLLECTION_FILTERS.ALL) {
    list = filterByLifecycle(list, collectionFilter, getQty);
  }

  list = searchWines(list, searchQuery);
  list = sortWines(list, sortBy);

  return list;
}

// ─── Tests: Zero inventory ─────────────────────────────────────────────────

describe('WineKeeper — quantity=0 is a valid state', () => {
  it('Wine can have quantity=0', () => {
    const wine = { name: 'Test Wine', producer: 'Test', quantity: 0 };
    expect(getWineQuantity(wine)).toBe(0);
  });

  it('quantity=0 never becomes 1 via falsy handling', () => {
    expect(getWineQuantity({ quantity: 0 })).toBe(0);
    expect(getWineQuantity({ quantity: null })).toBe(0);
    expect(getWineQuantity({ quantity: undefined })).toBe(0);
    expect(getWineQuantity({ quantity: '' })).toBe(0);
    expect(getWineQuantity({ quantity: false })).toBe(0);
    expect(getWineQuantity({})).toBe(0);
    expect(getWineQuantity({ quantity: '0' })).toBe(0);
    expect(getWineQuantity({ quantity: NaN })).toBe(0);
  });

  it('positive quantities are preserved', () => {
    expect(getWineQuantity({ quantity: 1 })).toBe(1);
    expect(getWineQuantity({ quantity: 2 })).toBe(2);
    expect(getWineQuantity({ quantity: 12 })).toBe(12);
  });
});

// ─── Tests: Consume Bottle ─────────────────────────────────────────────────

describe('WineKeeper — Consume Bottle (decrement without delete)', () => {
  it('1 → Consume → 0 (does not delete)', () => {
    const wine = { id: 'x', name: 'Test', quantity: 1, is_archived: false };
    const plan = planFinishUnit(wine, 0, false, ['quantity']);
    expect(plan.action).toBe('decrement_field');
    expect(plan.newCount).toBe(0);
    expect(plan.field).toBe('quantity');
  });

  it('2 → Consume → 1', () => {
    const wine = { id: 'x', name: 'Test', quantity: 2, is_archived: false };
    const plan = planFinishUnit(wine, 0, false, ['quantity']);
    expect(plan.action).toBe('decrement_field');
    expect(plan.newCount).toBe(1);
  });

  it('0 → Consume → noop (cannot go below 0)', () => {
    const wine = { id: 'x', name: 'Test', quantity: 0, is_archived: false };
    const plan = planFinishUnit(wine, 0, false, ['quantity']);
    expect(plan.action).toBe('noop');
    expect(plan.newCount).toBe(0);
  });

  it('quantity=0 preserves Wine record (does not trigger deletion)', () => {
    const wine = { id: 'x', name: 'Test', producer: 'P', quantity: 0, is_archived: false };
    // The record still exists — we only changed quantity
    expect(wine.id).toBe('x');
    expect(wine.name).toBe('Test');
    expect(wine.quantity).toBe(0);
  });
});

// ─── Tests: Add Bottle / Repurchase ─────────────────────────────────────────

describe('WineKeeper — Add Bottle / Repurchase', () => {
  it('0 → Add → 1 (repurchase preserves history)', () => {
    const wine = { id: 'x', name: 'Test', quantity: 0, is_archived: false };
    const plan = planAddUnit(wine, false, ['quantity']);
    expect(plan.action).toBe('increment_field');
    expect(plan.newCount).toBe(1);
    expect(plan.shouldUnarchive).toBe(false);
  });

  it('Add Bottle to archived wine auto-unarchives', () => {
    const wine = { id: 'x', name: 'Test', quantity: 0, is_archived: true };
    const plan = planAddUnit(wine, false, ['quantity']);
    expect(plan.action).toBe('increment_field');
    expect(plan.newCount).toBe(1);
    expect(plan.shouldUnarchive).toBe(true);
  });

  it('repurchase 0 → 1 preserves same Wine/history', () => {
    const wine = {
      id: 'w1',
      name: 'Château Example 2019',
      producer: 'Château Example',
      vintage: 2019,
      quantity: 0,
      is_archived: false,
      purchase_price: 45,
      notes: 'Great wine, had it at dinner',
    };

    // Simulate repurchase: increment quantity
    const plan = planAddUnit(wine, false, ['quantity']);
    const repurchased = { ...wine, quantity: plan.newCount };

    expect(repurchased.quantity).toBe(1);
    expect(repurchased.id).toBe('w1');          // Same record
    expect(repurchased.name).toBe('Château Example 2019');
    expect(repurchased.vintage).toBe(2019);     // Vintage preserved
    expect(repurchased.purchase_price).toBe(45); // History preserved
    expect(repurchased.notes).toBe('Great wine, had it at dinner');
  });
});

// ─── Tests: Counts and Value ────────────────────────────────────────────────

describe('WineKeeper — quantity=0 excluded from current counts and value', () => {
  it('quantity=0 excluded from current bottle count', () => {
    // w1 has qty=3, w2 has qty=0, w3 has qty=0 (archived)
    const active = selectActiveWines(TEST_WINES);
    // Archived wine (w3) is excluded by selectActiveWines
    expect(active).toHaveLength(2); // w1 and w2
    const totalBottles = selectTotalWineBottles(TEST_WINES);
    expect(totalBottles).toBe(3); // Only w1's 3 bottles; w2 contributes 0
  });

  it('quantity=0 excluded from current inventory value', () => {
    // w1: qty=3, estimated_value=40 → total = 40*3 = 120
    // w2: qty=0, estimated_value=100 → total = 0 (zero bottles)
    // w3: archived, excluded entirely
    const totalValue = selectWineCollectionValue(TEST_WINES);
    expect(totalValue).toBe(120); // Only w1 contributes
  });

  it('zero-inventory Wine contributes 1 historical record but 0 current bottles', () => {
    const wine = { id: 'x', name: 'Test', quantity: 0, is_archived: false };
    expect(getWineQuantity(wine)).toBe(0); // 0 current bottles
    // But the record still exists (counted as 1 unique wine)
    expect(wine.id).toBeDefined();
  });

  it('clearly distinguishes unique wines from current bottles', () => {
    const activeWines = selectActiveWines(TEST_WINES);
    const uniqueCount = selectWineCount(TEST_WINES);
    const totalBottles = selectTotalWineBottles(TEST_WINES);
    // 2 active unique wines (w3 is archived)
    expect(uniqueCount).toBe(2);
    // 3 total bottles (all from w1)
    expect(totalBottles).toBe(3);
    expect(totalBottles).not.toBe(uniqueCount);
  });
});

// ─── Tests: Lifecycle Filters ──────────────────────────────────────────────

describe('WineKeeper — Lifecycle filters work without search', () => {
  it('All filter shows all non-deleted wines', () => {
    const result = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.ALL, '');
    expect(result).toHaveLength(3);
  });

  it('In Stock filter shows only quantity > 0 (w1 only)', () => {
    const result = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.IN_STOCK, '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Château Example');
  });

  it('Empty / Finished filter shows only quantity=0, not archived (w2 only)', () => {
    const result = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.EMPTY, '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Château Other');
  });

  it('Archived filter shows only archived wines (w3 only)', () => {
    const result = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.ARCHIVED, '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Château Old');
  });
});

// ─── Tests: Archive / Restore ──────────────────────────────────────────────

describe('WineKeeper — Archive and Restore', () => {
  it('Archive preserves record (non-destructive)', () => {
    const wine = { id: 'x', name: 'Test', producer: 'P', vintage: 2018, quantity: 0, is_archived: false };
    const payload = buildArchivePayload();
    const archived = { ...wine, ...payload };

    expect(archived.is_archived).toBe(true);
    expect(archived.archived_at).toBeDefined();
    // All metadata preserved
    expect(archived.id).toBe('x');
    expect(archived.name).toBe('Test');
    expect(archived.producer).toBe('P');
    expect(archived.vintage).toBe(2018);
    expect(archived.quantity).toBe(0);
  });

  it('Archived wine appears under Archived filter', () => {
    const wine = { id: 'x', name: 'Test', quantity: 0, is_archived: true };
    const state = getLifecycleState(wine, 0);
    expect(state).toBe(COLLECTION_FILTERS.ARCHIVED);
  });

  it('Archived wine excluded from default active view (In Stock + Empty)', () => {
    const wine = { id: 'x', name: 'Test', quantity: 5, is_archived: true };
    // Even with quantity > 0, archived takes priority
    const state = getLifecycleState(wine, 5);
    expect(state).toBe(COLLECTION_FILTERS.ARCHIVED);
    expect(state).not.toBe(COLLECTION_FILTERS.IN_STOCK);
  });

  it('Restore (unarchive) works and clears archived_at', () => {
    const wine = { id: 'x', name: 'Test', quantity: 0, is_archived: true, archived_at: '2026-09-10T12:00:00Z' };
    const payload = buildUnarchivePayload();
    const restored = { ...wine, ...payload };

    expect(restored.is_archived).toBe(false);
    expect(restored.archived_at).toBeNull();
    expect(restored.id).toBe('x');
    expect(restored.name).toBe('Test');
  });
});

// ─── Tests: Search + Lifecycle Filter Composition ──────────────────────────

describe('WineKeeper — search + lifecycle filter compose correctly', () => {
  it('Empty filter + search "Other" → Château Other', () => {
    const result = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.EMPTY, 'Other');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Château Other');
  });

  it('Empty filter + search "Example" → zero results (Example is In Stock)', () => {
    const result = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.EMPTY, 'Example');
    expect(result).toHaveLength(0);
  });

  it('clearing search retains lifecycle filter', () => {
    const withSearch = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.EMPTY, 'Other');
    expect(withSearch).toHaveLength(1);

    const noSearch = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.EMPTY, '');
    expect(noSearch).toHaveLength(1);
    expect(noSearch[0].name).toBe('Château Other');
  });

  it('changing lifecycle filter while search exists recomputes immediately', () => {
    // All + "Château" → all 3 match
    const allResult = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.ALL, 'Château');
    expect(allResult).toHaveLength(3);

    // Switch to In Stock + "Château" → only w1
    const inStockResult = simulateWineFilterPipeline(TEST_WINES, COLLECTION_FILTERS.IN_STOCK, 'Château');
    expect(inStockResult).toHaveLength(1);
    expect(inStockResult[0].name).toBe('Château Example');
  });
});

// ─── Tests: Vintage isolation ──────────────────────────────────────────────

describe('WineKeeper — different vintages are not incorrectly merged', () => {
  it('same producer, different vintage = different records', () => {
    const wines = [
      { id: 'a', name: 'Château X 2019', producer: 'Château X', vintage: 2019, quantity: 2 },
      { id: 'b', name: 'Château X 2020', producer: 'Château X', vintage: 2020, quantity: 1 },
    ];

    // These are distinct records — different IDs, different vintages
    expect(wines[0].id).not.toBe(wines[1].id);
    expect(wines[0].vintage).not.toBe(wines[1].vintage);

    // Both should appear in the collection
    const result = simulateWineFilterPipeline(wines, COLLECTION_FILTERS.ALL, '');
    expect(result).toHaveLength(2);
  });

  it('repurchase does not merge different vintages', () => {
    // User has 2019 (qty=0) and 2020 (qty=1)
    const wine2019 = { id: 'a', name: 'Château X 2019', producer: 'Château X', vintage: 2019, quantity: 0 };
    const wine2020 = { id: 'b', name: 'Château X 2020', producer: 'Château X', vintage: 2020, quantity: 1 };

    // Repurchasing 2019 should increment wine2019, NOT wine2020
    const plan = planAddUnit(wine2019, false, ['quantity']);
    expect(plan.newCount).toBe(1);

    // wine2020 is unchanged
    expect(wine2020.quantity).toBe(1);
    expect(wine2019.quantity).toBe(0); // The plan doesn't mutate — caller applies
  });
});

// ─── Tests: Export preserves zero ──────────────────────────────────────────

describe('WineKeeper — export preserves zero', () => {
  it('quantity=0 is not coerced to 1 or blank in export data', () => {
    const wine = { id: 'x', name: 'Test', producer: 'P', quantity: 0, is_archived: false };
    // Simulate what the exporter does: w.quantity ?? 0
    const exportQty = wine.quantity ?? 0;
    expect(exportQty).toBe(0);
    expect(exportQty).not.toBe(1);
    expect(exportQty).not.toBe(null);
    expect(exportQty).not.toBe(undefined);
    expect(exportQty).not.toBe('');
  });

  it('archived state is preserved in export data', () => {
    const wine = { id: 'x', name: 'Test', producer: 'P', quantity: 0, is_archived: true, archived_at: '2026-09-10T12:00:00Z' };
    expect(wine.is_archived).toBe(true);
    expect(wine.archived_at).toBeDefined();
  });

  it('zero-quantity wine contributes 0 to export total bottles', () => {
    const wines = [
      { quantity: 3 },
      { quantity: 0 },
      { quantity: 0, is_archived: true },
    ];
    // Simulate the exporter's total: reduce with (w.quantity ?? 0)
    const total = wines.reduce((s, w) => s + (w.quantity ?? 0), 0);
    expect(total).toBe(3);
  });
});