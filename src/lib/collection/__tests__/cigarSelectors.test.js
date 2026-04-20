import { describe, expect, test } from 'vitest';
import {
  getCigarUnitValue,
  getCigarTotalValue,
  selectCigarCollectionValue,
  selectCigarMetrics,
} from '../cigarSelectors';

describe('cigarSelectors valuation', () => {
  test('uses estimated unit valuation for total rollup', () => {
    const cigar = { singles_equivalent: 10, estimated_unit_value: 12 };
    expect(getCigarUnitValue(cigar)).toBe(12);
    expect(getCigarTotalValue(cigar)).toBe(120);
    expect(selectCigarCollectionValue([cigar])).toBe(120);
  });

  test('manual override wins for collection value', () => {
    const cigar = {
      singles_equivalent: 5,
      purchase_price: 10,
      estimated_unit_value: 15,
      manual_valuation_enabled: true,
      manual_valuation_override: 20,
    };
    expect(getCigarUnitValue(cigar)).toBe(20);
    expect(getCigarTotalValue(cigar)).toBe(100);
  });

  test('tracks valued/unvalued counts for mixed collection states', () => {
    const cigars = [
      { id: 'valued-1', singles_equivalent: 4, estimated_unit_value: 10 },
      { id: 'valued-2', singles_equivalent: 8, purchase_price: 40, purchase_price_type: 'total_paid' },
      { id: 'missing', singles_equivalent: 6 },
    ];
    const metrics = selectCigarMetrics(cigars, []);
    expect(metrics.collection_value).toBeGreaterThan(0);
    expect(metrics.valued_cigar_count).toBe(2);
    expect(metrics.unvalued_cigar_count).toBe(1);
    expect(metrics.has_collection_valuation).toBe(true);
  });

  test('explicit zero valuation is not treated as missing valuation state', () => {
    const cigars = [
      { id: 'zero', singles_equivalent: 10, estimated_unit_value: 0 },
      { id: 'missing', singles_equivalent: 5 },
    ];
    const metrics = selectCigarMetrics(cigars, []);
    expect(metrics.collection_value).toBe(0);
    expect(metrics.valued_cigar_count).toBe(1);
    expect(metrics.unvalued_cigar_count).toBe(1);
    expect(metrics.has_collection_valuation).toBe(true);
  });
});

