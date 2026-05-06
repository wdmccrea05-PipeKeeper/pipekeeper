/**
 * Wine aggregation selector tests
 *
 * Verifies that the canonical wine selectors from wineSelectors.js
 * produce correct values and match the behaviour expected in
 * collectionAggregation.jsx after the fix.
 */

import { describe, it, expect } from 'vitest';
import {
  getWineTotalValue,
  selectWineCollectionValue,
  selectTotalWineBottles,
  selectWineCount,
} from '@/lib/collection/wineSelectors';

// ─── getWineTotalValue — full priority chain ──────────────────────────────────

describe('getWineTotalValue respects canonical priority chain', () => {
  it('returns 0 for null wine', () => {
    expect(getWineTotalValue(null)).toBe(0);
  });

  it('uses manual_estimated_value × quantity when manual_valuation_enabled', () => {
    const wine = { manual_valuation_enabled: true, manual_estimated_value: 100, quantity: 3 };
    expect(getWineTotalValue(wine)).toBe(300);
  });

  it('uses estimated_total_value when available and manual override absent', () => {
    const wine = { estimated_total_value: 450, quantity: 3 };
    expect(getWineTotalValue(wine)).toBe(450);
  });

  it('uses estimated_unit_value × quantity when total not available', () => {
    const wine = { estimated_unit_value: 80, quantity: 4 };
    expect(getWineTotalValue(wine)).toBe(320);
  });

  it('uses legacy estimated_value × quantity as fallback', () => {
    const wine = { estimated_value: 50, quantity: 2 };
    expect(getWineTotalValue(wine)).toBe(100);
  });

  it('uses purchase_price × quantity as last resort', () => {
    const wine = { purchase_price: 30, quantity: 5 };
    expect(getWineTotalValue(wine)).toBe(150);
  });

  it('returns 0 when wine has no value fields', () => {
    const wine = { name: 'No-value wine' };
    expect(getWineTotalValue(wine)).toBe(0);
  });

  it('treats quantity=0 or missing as 1', () => {
    const wine = { purchase_price: 40 };
    // quantity defaults to 1 via getWineQuantity
    expect(getWineTotalValue(wine)).toBe(40);
  });
});

// ─── selectWineCollectionValue ────────────────────────────────────────────────

describe('selectWineCollectionValue sums getWineTotalValue across collection', () => {
  it('returns 0 for empty list', () => {
    expect(selectWineCollectionValue([])).toBe(0);
  });

  it('returns 0 for non-array input', () => {
    expect(selectWineCollectionValue(null)).toBe(0);
  });

  it('correctly sums multiple wines', () => {
    const wines = [
      { purchase_price: 30, quantity: 2 },  // 60
      { estimated_total_value: 200 },        // 200
      { manual_valuation_enabled: true, manual_estimated_value: 50, quantity: 3 }, // 150
    ];
    expect(selectWineCollectionValue(wines)).toBe(410);
  });

  it('old inline logic (estimated_value || purchase_price) undervalues multi-bottle wine', () => {
    // Regression: old logic used estimated_value||purchase_price without multiplying by quantity
    const wine = { purchase_price: 40, quantity: 5 };
    const oldLogicValue = (wine.estimated_value || wine.purchase_price) || 0; // 40
    const newLogicValue = getWineTotalValue(wine); // 200
    expect(newLogicValue).toBeGreaterThan(oldLogicValue);
    expect(newLogicValue).toBe(200);
  });
});

// ─── selectTotalWineBottles ───────────────────────────────────────────────────

describe('selectTotalWineBottles sums quantities', () => {
  it('returns 0 for empty list', () => {
    expect(selectTotalWineBottles([])).toBe(0);
  });

  it('treats missing quantity as 1', () => {
    const wines = [{ name: 'A' }, { name: 'B' }];
    expect(selectTotalWineBottles(wines)).toBe(2);
  });

  it('sums quantity across wines correctly', () => {
    const wines = [{ quantity: 3 }, { quantity: 5 }, { quantity: 2 }];
    expect(selectTotalWineBottles(wines)).toBe(10);
  });
});

// ─── selectWineCount ──────────────────────────────────────────────────────────

describe('selectWineCount returns distinct wine entry count', () => {
  it('returns 0 for empty list', () => {
    expect(selectWineCount([])).toBe(0);
  });

  it('returns the number of wine entries regardless of quantity', () => {
    const wines = [{ quantity: 12 }, { quantity: 6 }, { quantity: 1 }];
    expect(selectWineCount(wines)).toBe(3);
  });
});
