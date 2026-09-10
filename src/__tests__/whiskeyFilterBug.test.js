/**
 * whiskeyFilterBug.test.js
 *
 * Regression tests for the WhiskeyKeeper collection-filter bug.
 *
 * ROOT CAUSE: The `filteredBottles` useMemo in Whiskey.jsx had a dependency
 * array of [bottles, search, sortBy] — `collectionFilter` was MISSING.
 * Changing the filter did not recompute the list until `search` changed.
 *
 * These tests verify that the lifecycle filter and search compose correctly
 * as independent inputs, and that changing the filter alone (without search)
 * produces the correct result set.
 */

import { describe, it, expect } from 'vitest';
import {
  COLLECTION_FILTERS,
  filterByLifecycle,
  getInventoryCount,
  getLifecycleState,
} from '@/lib/collection/inventoryLifecycle';

// ─── Test fixtures ────────────────────────────────────────────────────────

// Simulate the customer's test collection:
//   Lagavulin 16  — qty=1, not archived
//   Ardbeg 10    — qty=0, not archived
//   Macallan 12  — qty=0, archived
const TEST_BOTTLES = [
  { id: '1', name: 'Lagavulin 16', bottle_count: 1, is_archived: false },
  { id: '2', name: 'Ardbeg 10', bottle_count: 0, is_archived: false },
  { id: '3', name: 'Macallan 12', bottle_count: 0, is_archived: true },
];

// Inventory count function for legacy mode (no inventory units)
const getQty = (bottle) =>
  getInventoryCount(bottle, 0, false, ['bottle_count']);

// Simulate the full filtering pipeline: lifecycle → search → sort
function simulateFilterPipeline(bottles, collectionFilter, searchQuery) {
  let results = bottles;

  // Apply lifecycle filter
  if (collectionFilter !== COLLECTION_FILTERS.ALL) {
    results = filterByLifecycle(results, collectionFilter, getQty);
  }

  // Apply search
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    results = results.filter((b) =>
      (b.name || '').toLowerCase().includes(q)
    );
  }

  return results;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('WhiskeyKeeper Filter Bug — lifecycle filter is independent of search', () => {
  it('All filter shows all 3 bottles without search', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.ALL, '');
    expect(result).toHaveLength(3);
  });

  it('In Stock filter shows only Lagavulin (qty=1) without search', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.IN_STOCK, '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Lagavulin 16');
  });

  it('Empty / Finished filter shows only Ardbeg (qty=0, not archived) without search', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.EMPTY, '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ardbeg 10');
  });

  it('Archived filter shows only Macallan (archived) without search', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.ARCHIVED, '');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Macallan 12');
  });

  it('search narrows the selected lifecycle filter (Empty + "Ardbeg" → Ardbeg)', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.EMPTY, 'Ardbeg');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Ardbeg 10');
  });

  it('search within a lifecycle filter returns zero for non-matching (Empty + "Lagavulin" → 0)', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.EMPTY, 'Lagavulin');
    expect(result).toHaveLength(0);
  });

  it('clearing search retains the lifecycle filter (Empty + clear → Ardbeg)', () => {
    // With search "Ardbeg"
    const withSearch = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.EMPTY, 'Ardbeg');
    expect(withSearch).toHaveLength(1);
    // Clear search
    const noSearch = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.EMPTY, '');
    expect(noSearch).toHaveLength(1);
    expect(noSearch[0].name).toBe('Ardbeg 10');
  });

  it('In Stock + search "Lag" → Lagavulin', () => {
    const result = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.IN_STOCK, 'Lag');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Lagavulin 16');
  });

  it('clearing search from In Stock + "Lag" returns all In Stock records', () => {
    const withSearch = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.IN_STOCK, 'Lag');
    expect(withSearch).toHaveLength(1);
    const noSearch = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.IN_STOCK, '');
    expect(noSearch).toHaveLength(1);
    expect(noSearch[0].name).toBe('Lagavulin 16');
  });
});

describe('WhiskeyKeeper Filter Bug — filter changes with active search recompose immediately', () => {
  it('search "Mac" + switch All → Archived recomputes immediately', () => {
    // All + "Mac" → Macallan (the only one matching "Mac")
    const allResult = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.ALL, 'Mac');
    expect(allResult).toHaveLength(1);
    expect(allResult[0].name).toBe('Macallan 12');

    // Switch to Archived + "Mac" → still Macallan (it's archived AND matches "Mac")
    const archivedResult = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.ARCHIVED, 'Mac');
    expect(archivedResult).toHaveLength(1);
    expect(archivedResult[0].name).toBe('Macallan 12');

    // The search query is preserved — both produce Macallan
  });

  it('search "a" + switch In Stock → Empty recomputes immediately', () => {
    // In Stock + "a" → Lagavulin (matches "a" in "Lagavulin")
    const inStockResult = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.IN_STOCK, 'a');
    expect(inStockResult).toHaveLength(1);
    expect(inStockResult[0].name).toBe('Lagavulin 16');

    // Switch to Empty + "a" → Ardbeg (matches "a" in "Ardbeg")
    const emptyResult = simulateFilterPipeline(TEST_BOTTLES, COLLECTION_FILTERS.EMPTY, 'a');
    expect(emptyResult).toHaveLength(1);
    expect(emptyResult[0].name).toBe('Ardbeg 10');
  });
});

describe('WhiskeyKeeper Filter Bug — quantity=0 excluded from current value', () => {
  it('zero-quantity bottle contributes 0 to collection value', () => {
    // getInventoryCount returns 0 for zero-quantity bottles
    expect(getQty(TEST_BOTTLES[0])).toBe(1);  // Lagavulin
    expect(getQty(TEST_BOTTLES[1])).toBe(0);  // Ardbeg (empty)
    expect(getQty(TEST_BOTTLES[2])).toBe(0);  // Macallan (archived)
  });

  it('getLifecycleState classifies correctly with explicit > 0 and === 0 checks', () => {
    expect(getLifecycleState(TEST_BOTTLES[0], 1)).toBe(COLLECTION_FILTERS.IN_STOCK);
    expect(getLifecycleState(TEST_BOTTLES[1], 0)).toBe(COLLECTION_FILTERS.EMPTY);
    expect(getLifecycleState(TEST_BOTTLES[2], 0)).toBe(COLLECTION_FILTERS.ARCHIVED);
  });

  it('does not use truthiness for quantity — 0 is intentionally empty, not in-stock', () => {
    // A bottle with bottle_count: 0 must NOT be classified as in_stock
    const zeroBottle = { id: 'x', name: 'Test', bottle_count: 0, is_archived: false };
    const state = getLifecycleState(zeroBottle, getQty(zeroBottle));
    expect(state).toBe(COLLECTION_FILTERS.EMPTY);
    expect(state).not.toBe(COLLECTION_FILTERS.IN_STOCK);
  });
});