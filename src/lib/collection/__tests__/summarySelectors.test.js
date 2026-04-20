import { describe, expect, test } from 'vitest';
import { selectTotalCollectionValue } from '../summarySelectors';

describe('summarySelectors', () => {
  test('includes cigar value in total collection value rollup', () => {
    const total = selectTotalCollectionValue({
      pipes: [{ estimated_value: 100 }],
      blends: [{ manual_market_value: 50 }],
      bottles: [{ purchase_price: 20 }],
      inventoryUnits: [],
      cigars: [{ singles_equivalent: 2, estimated_unit_value: 10 }],
    });

    expect(total).toBe(190);
  });

  test('does not inflate total when cigars have no valuation data', () => {
    const total = selectTotalCollectionValue({
      pipes: [{ estimated_value: 25 }],
      blends: [],
      bottles: [],
      inventoryUnits: [],
      cigars: [{ singles_equivalent: 5 }],
    });

    expect(total).toBe(25);
  });
});

