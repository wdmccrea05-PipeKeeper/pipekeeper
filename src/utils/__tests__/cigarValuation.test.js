import { describe, expect, test } from 'vitest';
import { calculateCigarValue } from '../cigarValuation';

describe('calculateCigarValue', () => {
  test('manual override wins when enabled', () => {
    const result = calculateCigarValue({
      singles_equivalent: 10,
      manual_valuation_enabled: true,
      manual_valuation_override: 20,
      estimated_unit_value: 5,
    });

    expect(result.estimatedUnitValue).toBe(20);
    expect(result.estimatedTotalValue).toBe(200);
    expect(result.source).toBe('manual_override');
  });

  test('uses user-entered estimated unit value with high confidence', () => {
    const result = calculateCigarValue({
      singles_equivalent: 8,
      estimated_unit_value: 12.5,
      valuation_confidence: 'high',
    });

    expect(result.estimatedUnitValue).toBe(12.5);
    expect(result.estimatedTotalValue).toBe(100);
    expect(result.confidenceScore).toBe('high');
    expect(result.source).toBe('manual_entry');
  });

  test('derives from purchase basis when no manual values exist', () => {
    const result = calculateCigarValue({
      purchase_price: 40,
      purchase_price_type: 'total_paid',
      unit_type: 'box',
      quantity: 1,
      cigars_per_package: 20,
      singles_equivalent: 20,
    });

    expect(result.perStickCostBasis).toBe(2);
    expect(result.estimatedUnitValue).toBeGreaterThanOrEqual(2);
    expect(result.source).toBe('guided_estimate');
    expect(result.confidenceScore).toBe('medium');
  });

  test('handles zero quantity safely', () => {
    const result = calculateCigarValue({
      quantity: 0,
      purchase_price: 20,
    });

    expect(result.remainingSticks).toBe(0);
    expect(result.estimatedTotalValue).toBeNull();
    expect(result.needsReview).toBe(true);
  });

  test('marks stale valuations when valuation_updated_at is old', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 220);
    const result = calculateCigarValue({
      singles_equivalent: 10,
      estimated_unit_value: 8,
      valuation_updated_at: oldDate.toISOString(),
    });

    expect(result.isStale).toBe(true);
  });
});
