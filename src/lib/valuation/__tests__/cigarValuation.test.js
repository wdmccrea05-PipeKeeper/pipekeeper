import { describe, expect, test } from 'vitest';
import {
  deriveCigarValuationPatch,
  shouldRefreshCigarValuation,
  normalizeCigarValuationConfidence,
} from '../cigarValuation';

describe('normalizeCigarValuationConfidence', () => {
  test('returns "high" for "high"', () => {
    expect(normalizeCigarValuationConfidence('high')).toBe('high');
  });
  test('returns "medium" for "MEDIUM"', () => {
    expect(normalizeCigarValuationConfidence('MEDIUM')).toBe('medium');
  });
  test('returns "low" for unknown values', () => {
    expect(normalizeCigarValuationConfidence(null)).toBe('low');
    expect(normalizeCigarValuationConfidence('uncertain')).toBe('low');
  });
});

describe('shouldRefreshCigarValuation', () => {
  test('returns true when no market value exists', () => {
    expect(shouldRefreshCigarValuation({ name: 'Test Cigar', singles_equivalent: 10 })).toBe(true);
  });

  test('returns false when manual override is active', () => {
    expect(shouldRefreshCigarValuation({
      market_estimated_unit_value: 12,
      manual_valuation_enabled: true,
      valuation_confidence: 'high',
      valuation_updated_at: new Date().toISOString(),
    })).toBe(false);
  });

  test('returns true when confidence is low', () => {
    expect(shouldRefreshCigarValuation({
      market_estimated_unit_value: 10,
      valuation_confidence: 'low',
      valuation_updated_at: new Date().toISOString(),
    })).toBe(true);
  });

  test('returns true when valuation is older than 30 days', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);
    expect(shouldRefreshCigarValuation({
      market_estimated_unit_value: 10,
      valuation_confidence: 'medium',
      valuation_updated_at: oldDate.toISOString(),
    })).toBe(true);
  });

  test('returns false for recent medium-confidence market value', () => {
    expect(shouldRefreshCigarValuation({
      market_estimated_unit_value: 10,
      valuation_confidence: 'medium',
      valuation_updated_at: new Date().toISOString(),
    })).toBe(false);
  });
});

describe('deriveCigarValuationPatch', () => {
  test('returns per-stick and total valuation from estimated_unit_value', () => {
    const cigar = { singles_equivalent: 20 };
    const result = { estimated_unit_value: 8.5, valuation_confidence: 'medium', valuation_source: 'Retail reference', comparable_count: 3 };
    const patch = deriveCigarValuationPatch(cigar, result);

    expect(patch.market_estimated_unit_value).toBe(8.5);
    expect(patch.market_estimated_total_value).toBe(170);
    expect(patch.market_replacement_cost_estimate).toBe(170);
    expect(patch.market_valuation_confidence).toBe('medium');
    expect(patch.market_valuation_source).toBe('Retail reference');
    expect(patch.market_comparable_count).toBe(3);
    expect(patch.valuation_confidence).toBe('medium');
    expect(patch.valuation_updated_at).toBeTruthy();
    expect(patch.market_valuation_updated_at).toBeTruthy();
  });

  test('falls back to msrp_per_stick when estimated_unit_value is null', () => {
    const cigar = { quantity: 5, cigars_per_package: 20 };
    const result = { msrp_per_stick: 10, estimated_unit_value: null, valuation_confidence: 'low' };
    const patch = deriveCigarValuationPatch(cigar, result);

    expect(patch.market_estimated_unit_value).toBe(10);
    expect(patch.market_estimated_total_value).toBe(1000);
  });

  test('calculates total = per-stick × remaining sticks', () => {
    const cigar = { singles_equivalent: 10 };
    const result = { estimated_unit_value: 12, valuation_confidence: 'high' };
    const patch = deriveCigarValuationPatch(cigar, result);

    expect(patch.market_estimated_total_value).toBe(120);
  });

  test('returns empty patch when manual_valuation_enabled is true', () => {
    const cigar = { singles_equivalent: 5, manual_valuation_enabled: true };
    const result = { estimated_unit_value: 15 };
    const patch = deriveCigarValuationPatch(cigar, result);
    expect(Object.keys(patch).length).toBe(0);
  });

  test('returns empty patch when no unit value can be derived', () => {
    const cigar = { singles_equivalent: 5 };
    const result = { estimated_unit_value: null, msrp_per_stick: null };
    const patch = deriveCigarValuationPatch(cigar, result);
    expect(Object.keys(patch).length).toBe(0);
  });

  test('sets comparable_count to 1 when result provides none', () => {
    const cigar = { singles_equivalent: 5 };
    const result = { estimated_unit_value: 9 };
    const patch = deriveCigarValuationPatch(cigar, result);
    expect(patch.market_comparable_count).toBe(1);
  });
});
