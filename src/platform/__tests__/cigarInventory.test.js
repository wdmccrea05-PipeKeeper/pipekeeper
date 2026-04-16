/**
 * Unit tests for cigarInventory.js
 * Covers depletion tracking, consumption rate, neglect detection, and decrement logic.
 */

import { describe, test, expect } from 'vitest';

import {
  getAvailableQuantity,
  buildSessionsByCigarId,
  getLinkedSessions,
  getLastSmokedDate,
  getTotalSmokedCount,
  getConsumptionRate,
  getEstimatedMonthsRemaining,
  getDepletionStatus,
  isNeglected,
  getCigarInventoryMetrics,
  computeSessionDecrement,
  getCollectionInventoryMetrics,
} from '../cigarInventory.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

const CIGAR_SINGLE = { id: 'c1', unit_type: 'single', quantity: 5 };
const CIGAR_BOX = { id: 'c2', unit_type: 'box', singles_equivalent: 25, quantity: 1 };
const CIGAR_NO_QTY = { id: 'c3' };

const SESSION_LINKED = (cigarId, daysBack, enjoyment = 4) => ({
  id: `s-${cigarId}-${daysBack}`,
  cigar_id: cigarId,
  is_out_of_collection: false,
  date: daysAgo(daysBack),
  overall_enjoyment: enjoyment,
  would_buy_again: 'yes',
});

const SESSION_EXTERNAL = {
  id: 's-ext',
  is_out_of_collection: true,
  external_cigar_brand: 'External Brand',
  date: daysAgo(1),
};

// ── getAvailableQuantity ──────────────────────────────────────────────────────

describe('getAvailableQuantity', () => {
  test('prefers singles_equivalent over quantity', () => {
    expect(getAvailableQuantity({ singles_equivalent: 20, quantity: 2 })).toBe(20);
  });

  test('falls back to quantity when singles_equivalent absent', () => {
    expect(getAvailableQuantity({ quantity: 5 })).toBe(5);
  });

  test('returns 0 for missing fields', () => {
    expect(getAvailableQuantity({})).toBe(0);
  });

  test('returns 0 for null input', () => {
    expect(getAvailableQuantity(null)).toBe(0);
  });

  test('never returns negative', () => {
    expect(getAvailableQuantity({ quantity: -3 })).toBe(0);
  });
});

// ── buildSessionsByCigarId ─────────────────────────────────────────────────────

describe('buildSessionsByCigarId', () => {
  test('indexes linked sessions by cigar_id', () => {
    const sessions = [
      SESSION_LINKED('c1', 10),
      SESSION_LINKED('c1', 20),
      SESSION_LINKED('c2', 5),
    ];
    const map = buildSessionsByCigarId(sessions);
    expect(map['c1']).toHaveLength(2);
    expect(map['c2']).toHaveLength(1);
  });

  test('excludes out-of-collection sessions', () => {
    const map = buildSessionsByCigarId([SESSION_EXTERNAL]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  test('returns empty object for non-array input', () => {
    expect(buildSessionsByCigarId(null)).toEqual({});
  });
});

// ── getLinkedSessions ─────────────────────────────────────────────────────────

describe('getLinkedSessions', () => {
  const sessions = [
    SESSION_LINKED('c1', 5),
    SESSION_LINKED('c1', 10),
    SESSION_LINKED('c2', 3),
    SESSION_EXTERNAL,
  ];

  test('returns only sessions for the given cigar', () => {
    const result = getLinkedSessions({ id: 'c1' }, sessions);
    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.cigar_id).toBe('c1'));
  });

  test('excludes out-of-collection sessions', () => {
    const result = getLinkedSessions({ id: 'c1' }, [...sessions, SESSION_EXTERNAL]);
    expect(result.every((s) => !s.is_out_of_collection)).toBe(true);
  });

  test('returns empty array when no cigar id', () => {
    expect(getLinkedSessions({}, sessions)).toHaveLength(0);
  });
});

// ── getLastSmokedDate ─────────────────────────────────────────────────────────

describe('getLastSmokedDate', () => {
  test('returns the most recent session date', () => {
    const sessions = [SESSION_LINKED('c1', 10), SESSION_LINKED('c1', 5)];
    const result = getLastSmokedDate({ id: 'c1' }, sessions);
    expect(result).toBe(daysAgo(5));
  });

  test('returns null when no sessions', () => {
    expect(getLastSmokedDate({ id: 'c1' }, [])).toBeNull();
  });
});

// ── getTotalSmokedCount ───────────────────────────────────────────────────────

describe('getTotalSmokedCount', () => {
  test('counts linked sessions', () => {
    const sessions = [SESSION_LINKED('c1', 5), SESSION_LINKED('c1', 10)];
    expect(getTotalSmokedCount({ id: 'c1' }, sessions)).toBe(2);
  });

  test('returns 0 with no sessions', () => {
    expect(getTotalSmokedCount({ id: 'c1' }, [])).toBe(0);
  });
});

// ── getConsumptionRate ────────────────────────────────────────────────────────

describe('getConsumptionRate', () => {
  test('returns 0 with no sessions', () => {
    expect(getConsumptionRate({ id: 'c1' }, [])).toBe(0);
  });

  test('calculates rate from recent sessions within window', () => {
    // 6 sessions in a 6-month window = rate of 1/month
    const sessions = [
      SESSION_LINKED('c1', 10),
      SESSION_LINKED('c1', 40),
      SESSION_LINKED('c1', 70),
      SESSION_LINKED('c1', 100),
      SESSION_LINKED('c1', 130),
      SESSION_LINKED('c1', 160),
    ];
    const rate = getConsumptionRate({ id: 'c1' }, sessions, 6);
    expect(rate).toBeGreaterThan(0);
  });

  test('falls back to lifetime average when no recent sessions', () => {
    const purchaseDate = monthsAgo(12);
    // 2 sessions more than 6 months ago
    const sessions = [SESSION_LINKED('c1', 200), SESSION_LINKED('c1', 250)];
    const cigar = { id: 'c1', purchase_date: purchaseDate };
    const rate = getConsumptionRate(cigar, sessions, 6);
    // 2 sessions / 12 months ≈ 0.17
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1);
  });
});

// ── getDepletionStatus ────────────────────────────────────────────────────────

describe('getDepletionStatus', () => {
  test('returns no_inventory for cigar with no quantity data', () => {
    expect(getDepletionStatus({ id: 'x' }, [])).toBe('no_inventory');
  });

  test('returns depleted for zero singles_equivalent with unit_type', () => {
    expect(getDepletionStatus({ id: 'x', singles_equivalent: 0, unit_type: 'box' }, [])).toBe('depleted');
  });

  test('returns critical for quantity of 1', () => {
    expect(getDepletionStatus({ id: 'x', quantity: 1 }, [])).toBe('critical');
  });

  test('returns running_low for quantity of 3', () => {
    expect(getDepletionStatus({ id: 'x', quantity: 3 }, [])).toBe('running_low');
  });

  test('returns stocked for quantity of 25', () => {
    expect(getDepletionStatus({ id: 'x', quantity: 25 }, [])).toBe('stocked');
  });
});

// ── isNeglected ───────────────────────────────────────────────────────────────

describe('isNeglected', () => {
  test('returns false with no inventory', () => {
    expect(isNeglected({ id: 'c1', quantity: 0 }, [])).toBe(false);
  });

  test('returns false with no sessions', () => {
    expect(isNeglected({ id: 'c1', quantity: 5 }, [])).toBe(false);
  });

  test('returns false when recently smoked', () => {
    const sessions = [SESSION_LINKED('c1', 30)]; // 30 days ago < 90 threshold
    expect(isNeglected({ id: 'c1', quantity: 5 }, sessions)).toBe(false);
  });

  test('returns true when enjoyed cigar not smoked in over 90 days', () => {
    const sessions = [SESSION_LINKED('c1', 100, 4)]; // 100 days ago, enjoyed
    expect(isNeglected({ id: 'c1', quantity: 5 }, sessions)).toBe(true);
  });

  test('returns false when not enjoyed (not_for_me / low rating)', () => {
    // would_buy_again = 'no' and enjoyment = 1 → not enjoyed
    const sessions = [
      {
        id: 's1',
        cigar_id: 'c1',
        is_out_of_collection: false,
        date: daysAgo(100),
        overall_enjoyment: 1,
        would_buy_again: 'no',
      },
    ];
    expect(isNeglected({ id: 'c1', quantity: 5 }, sessions)).toBe(false);
  });
});

// ── getCigarInventoryMetrics ──────────────────────────────────────────────────

describe('getCigarInventoryMetrics', () => {
  test('returns all expected fields', () => {
    const cigar = { id: 'c1', singles_equivalent: 10 };
    const sessions = [SESSION_LINKED('c1', 30)];
    const metrics = getCigarInventoryMetrics(cigar, sessions);

    expect(metrics).toHaveProperty('quantity');
    expect(metrics).toHaveProperty('lastSmokedDate');
    expect(metrics).toHaveProperty('totalSmoked');
    expect(metrics).toHaveProperty('consumptionRatePerMonth');
    expect(metrics).toHaveProperty('estimatedMonthsRemaining');
    expect(metrics).toHaveProperty('depletionStatus');
    expect(metrics).toHaveProperty('neglected');
  });

  test('quantity reflects singles_equivalent', () => {
    const metrics = getCigarInventoryMetrics({ id: 'c1', singles_equivalent: 15 }, []);
    expect(metrics.quantity).toBe(15);
  });
});

// ── computeSessionDecrement ───────────────────────────────────────────────────

describe('computeSessionDecrement', () => {
  test('decrements singles_equivalent by 1', () => {
    const updates = computeSessionDecrement({ singles_equivalent: 5 });
    expect(updates.singles_equivalent).toBe(4);
  });

  test('also decrements quantity for singles', () => {
    const updates = computeSessionDecrement({ unit_type: 'single', quantity: 3, singles_equivalent: 3 });
    expect(updates.quantity).toBe(2);
    expect(updates.singles_equivalent).toBe(2);
  });

  test('does not decrement quantity for non-single unit types', () => {
    const updates = computeSessionDecrement({ unit_type: 'box', quantity: 2, singles_equivalent: 25 });
    expect(updates.singles_equivalent).toBe(24);
    expect(updates.quantity).toBeUndefined();
    expect(updates.package_open).toBe(true);
  });

  test('derives singles_equivalent decrement from quantity + cpp when singles_equivalent missing', () => {
    const updates = computeSessionDecrement({ unit_type: 'box', quantity: 1, cigars_per_package: 20 });
    expect(updates.singles_equivalent).toBe(19);
    expect(updates.package_open).toBe(true);
  });

  test('does not go below 0', () => {
    const updates = computeSessionDecrement({ singles_equivalent: 0 });
    expect(updates).toBeNull(); // nothing to decrement
  });

  test('returns null when no inventory fields', () => {
    expect(computeSessionDecrement({ id: 'c1' })).toBeNull();
  });

  test('returns null for null input', () => {
    expect(computeSessionDecrement(null)).toBeNull();
  });
});

// ── getCollectionInventoryMetrics ─────────────────────────────────────────────

describe('getCollectionInventoryMetrics', () => {
  test('returns expected shape for empty collection', () => {
    const result = getCollectionInventoryMetrics([], []);
    expect(result).toHaveProperty('runningLow');
    expect(result).toHaveProperty('depleted');
    expect(result).toHaveProperty('neglected');
    expect(result).toHaveProperty('fastDepleting');
    expect(result.runningLow).toHaveLength(0);
  });

  test('classifies running-low cigars', () => {
    const cigars = [
      { id: 'c1', quantity: 2 },  // running low
      { id: 'c2', quantity: 20 }, // stocked
    ];
    const result = getCollectionInventoryMetrics(cigars, []);
    expect(result.runningLow).toHaveLength(1);
    expect(result.runningLow[0].id).toBe('c1');
    expect(result.stocked).toHaveLength(1);
  });

  test('classifies neglected cigars', () => {
    const cigars = [
      { id: 'c1', quantity: 5 },
    ];
    const sessions = [SESSION_LINKED('c1', 100, 4)]; // neglected
    const result = getCollectionInventoryMetrics(cigars, sessions);
    expect(result.neglected).toHaveLength(1);
  });

  test('handles non-array input gracefully', () => {
    const result = getCollectionInventoryMetrics(null, []);
    expect(result.runningLow).toHaveLength(0);
  });
});
