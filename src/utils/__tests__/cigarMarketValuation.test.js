import { describe, expect, test } from 'vitest';
import { buildCigarMarketValuationPatch, deriveCigarMarketValuation } from '../cigarMarketValuation';

describe('cigarMarketValuation', () => {
  test('derives market valuation from comparable observations', () => {
    const cigar = { singles_equivalent: 20, cigars_per_package: 20 };
    const derivation = deriveCigarMarketValuation(cigar, {
      observations: [
        { observed_price: 180, price_type: 'retail', condition_note: 'box of 20', observed_date: '2026-04-10' },
        { observed_price: 9.8, price_type: 'aftermarket', condition_note: 'per stick listing', observed_date: '2026-04-15' },
      ],
      snapshots: [],
    });

    expect(derivation).toBeTruthy();
    expect(derivation.estimatedMarketUnitValue).toBeGreaterThan(8);
    expect(derivation.estimatedMarketTotalValue).toBeGreaterThan(160);
    expect(derivation.comparableCount).toBe(2);
  });

  test('returns null when no usable market evidence exists', () => {
    const cigar = { singles_equivalent: 10 };
    const derivation = deriveCigarMarketValuation(cigar, { observations: [], snapshots: [] });
    expect(derivation).toBeNull();
  });

  test('builds persistence patch for derived market valuation', () => {
    const patch = buildCigarMarketValuationPatch(
      { id: 'c1' },
      {
        estimatedMarketUnitValue: 9.2,
        estimatedMarketTotalValue: 92,
        replacementCostEstimate: 110.4,
        source: 'Market comparables',
        confidence: 'medium',
        updatedAt: '2026-04-20T00:00:00.000Z',
        comparableCount: 4,
      }
    );

    expect(patch.market_estimated_unit_value).toBe(9.2);
    expect(patch.market_estimated_total_value).toBe(92);
    expect(patch.market_valuation_confidence).toBe('medium');
    expect(patch.market_comparable_count).toBe(4);
  });
});

