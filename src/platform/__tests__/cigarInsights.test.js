/**
 * Unit tests for cigarInsights.js and the new agingReadiness additions.
 * Covers humidor health, enhanced readiness, per-cigar insights, and collection insights.
 */

import { describe, test, expect } from 'vitest';

import {
  getHumidorHealth,
  getHumidorConfidenceMultiplier,
  getEnhancedCigarReadiness,
} from '../agingReadiness.js';

import {
  getCigarInsight,
  getHumidorInsight,
  getCollectionInsights,
  CIGAR_INSIGHT_TYPES,
  HUMIDOR_INSIGHT_TYPES,
} from '../cigarInsights.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function monthsFromNow(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

// ── getHumidorHealth ──────────────────────────────────────────────────────────

describe('getHumidorHealth', () => {
  test('returns unmanaged when no data at all', () => {
    const result = getHumidorHealth({ id: 'h1', name: 'Test' });
    expect(result.state).toBe('unmanaged');
    expect(result.confidence).toBe('none');
  });

  test('returns no_readings when target set but no readings', () => {
    const result = getHumidorHealth({ id: 'h1', name: 'Test', target_humidity_rh: 65 });
    expect(result.state).toBe('no_readings');
    expect(result.confidence).toBe('low');
  });

  test('returns stable for on-target humidity', () => {
    const result = getHumidorHealth({
      id: 'h1',
      target_humidity_rh: 65,
      last_humidity_reading: 65,
      last_reading_date: daysAgo(3),
    });
    expect(result.state).toBe('stable');
    expect(result.confidence).toBe('high');
  });

  test('returns acceptable for within-range humidity', () => {
    const result = getHumidorHealth({
      id: 'h1',
      target_humidity_rh: 65,
      last_humidity_reading: 70,
      last_reading_date: daysAgo(3),
    });
    expect(result.state).toBe('acceptable');
  });

  test('returns dry_risk for humidity below 55%', () => {
    const result = getHumidorHealth({
      id: 'h1',
      last_humidity_reading: 50,
      last_reading_date: daysAgo(1),
    });
    expect(result.state).toBe('dry_risk');
    expect(result.confidence).toBe('high');
  });

  test('returns over_humid_risk for humidity above 80%', () => {
    const result = getHumidorHealth({
      id: 'h1',
      last_humidity_reading: 85,
      last_reading_date: daysAgo(1),
    });
    expect(result.state).toBe('over_humid_risk');
    expect(result.confidence).toBe('high');
  });

  test('returns monitor for stale readings', () => {
    const result = getHumidorHealth({
      id: 'h1',
      target_humidity_rh: 65,
      last_humidity_reading: 65,
      last_reading_date: daysAgo(30), // stale: > 21 days
    });
    expect(result.state).toBe('monitor');
  });

  test('returns monitor for significant deviation', () => {
    const result = getHumidorHealth({
      id: 'h1',
      target_humidity_rh: 65,
      last_humidity_reading: 75, // 10% deviation > 8% threshold
      last_reading_date: daysAgo(3),
    });
    expect(result.state).toBe('monitor');
  });

  test('returns neglected when maintenance overdue', () => {
    const result = getHumidorHealth({
      id: 'h1',
      target_humidity_rh: 65,
      last_humidity_reading: 65,
      last_reading_date: daysAgo(3),
      last_maintenance_date: daysAgo(60), // 60 days, default 30 * 1.5 = 45 threshold
      maintenance_interval_days: 30,
    });
    expect(result.state).toBe('neglected');
  });

  test('returns unmanaged for null input', () => {
    expect(getHumidorHealth(null).state).toBe('unmanaged');
  });
});

// ── getHumidorConfidenceMultiplier ────────────────────────────────────────────

describe('getHumidorConfidenceMultiplier', () => {
  test('returns 1.0 for stable', () => {
    expect(getHumidorConfidenceMultiplier({ state: 'stable' })).toBe(1.0);
  });

  test('returns lower value for dry_risk', () => {
    expect(getHumidorConfidenceMultiplier({ state: 'dry_risk' })).toBe(0.30);
  });

  test('returns lower value for neglected', () => {
    expect(getHumidorConfidenceMultiplier({ state: 'neglected' })).toBe(0.45);
  });

  test('returns 0.75 for null', () => {
    expect(getHumidorConfidenceMultiplier(null)).toBe(0.75);
  });
});

// ── getEnhancedCigarReadiness ─────────────────────────────────────────────────

describe('getEnhancedCigarReadiness', () => {
  test('returns high confidence when both dates set and stable humidor', () => {
    const cigar = {
      aging_start_date: monthsAgo(6),
      ready_to_smoke_date: monthsAgo(1),
    };
    const humidor = {
      target_humidity_rh: 65,
      last_humidity_reading: 65,
      last_reading_date: daysAgo(3),
    };
    const result = getEnhancedCigarReadiness(cigar, humidor);
    expect(result.state).toBe('ready_now');
    expect(result.confidence).toBe('high');
    expect(result.humidorRisk).toBe(false);
  });

  test('returns at_risk when ready but humidor is dry', () => {
    const cigar = {
      aging_start_date: monthsAgo(6),
      ready_to_smoke_date: monthsAgo(1),
    };
    const humidor = {
      last_humidity_reading: 50,
      last_reading_date: daysAgo(1),
    };
    const result = getEnhancedCigarReadiness(cigar, humidor);
    expect(result.state).toBe('at_risk');
    expect(result.humidorRisk).toBe(true);
  });

  test('downgrades confidence when humidor is neglected', () => {
    const cigar = {
      aging_start_date: monthsAgo(12),
      ready_to_smoke_date: monthsAgo(3),
    };
    const humidor = {
      last_maintenance_date: daysAgo(90),
      maintenance_interval_days: 30,
      last_humidity_reading: 68,
      last_reading_date: daysAgo(1),
    };
    const result = getEnhancedCigarReadiness(cigar, humidor);
    // neglected humidor multiplier (0.45) should downgrade confidence from high → medium or lower
    expect(['medium', 'low']).toContain(result.confidence);
  });

  test('returns low confidence when no aging data', () => {
    const cigar = { id: 'c1', brand: 'Test' };
    const result = getEnhancedCigarReadiness(cigar, null);
    expect(result.state).toBe('no_data');
    expect(result.confidence).toBe('low');
  });

  test('includes humidorLabel for non-stable humidors', () => {
    const cigar = { aging_start_date: monthsAgo(6) };
    const humidor = { last_humidity_reading: 50, last_reading_date: daysAgo(1) };
    const result = getEnhancedCigarReadiness(cigar, humidor);
    expect(result.humidorLabel).not.toBeNull();
  });

  test('humidorLabel is null for stable humidors', () => {
    const cigar = { aging_start_date: monthsAgo(6) };
    const humidor = {
      target_humidity_rh: 65,
      last_humidity_reading: 65,
      last_reading_date: daysAgo(2),
    };
    const result = getEnhancedCigarReadiness(cigar, humidor);
    expect(result.humidorLabel).toBeNull();
  });
});

// ── getCigarInsight ───────────────────────────────────────────────────────────

describe('getCigarInsight', () => {
  test('returns expected shape', () => {
    const result = getCigarInsight({ id: 'c1', quantity: 5 }, null, []);
    expect(result).toHaveProperty('readiness');
    expect(result).toHaveProperty('inventory');
    expect(result).toHaveProperty('primaryInsight');
    expect(result).toHaveProperty('allInsights');
  });

  test('emits running_low insight for low inventory cigar', () => {
    const cigar = { id: 'c1', quantity: 2 };
    const result = getCigarInsight(cigar, null, []);
    const types = result.allInsights.map((i) => i.type);
    expect(types).toContain(CIGAR_INSIGHT_TYPES.RUNNING_LOW);
  });

  test('emits at_risk when humidor is dry', () => {
    const cigar = {
      id: 'c1',
      quantity: 10,
      aging_start_date: monthsAgo(6),
      ready_to_smoke_date: monthsAgo(1),
    };
    const humidor = { last_humidity_reading: 50, last_reading_date: daysAgo(1) };
    const result = getCigarInsight(cigar, humidor, []);
    const types = result.allInsights.map((i) => i.type);
    expect(types).toContain(CIGAR_INSIGHT_TYPES.AT_RISK);
  });

  test('primaryInsight is the first insight', () => {
    const cigar = { id: 'c1', quantity: 2 };
    const result = getCigarInsight(cigar, null, []);
    if (result.allInsights.length > 0) {
      expect(result.primaryInsight).toBe(result.allInsights[0]);
    }
  });
});

// ── getHumidorInsight ─────────────────────────────────────────────────────────

describe('getHumidorInsight', () => {
  test('returns healthy for stable humidor', () => {
    const humidor = {
      target_humidity_rh: 65,
      last_humidity_reading: 65,
      last_reading_date: daysAgo(3),
    };
    const result = getHumidorInsight(humidor, []);
    expect(result.type).toBe(HUMIDOR_INSIGHT_TYPES.HEALTHY);
    expect(result.severity).toBe('positive');
  });

  test('returns dry_risk for dangerous humidity', () => {
    const humidor = { last_humidity_reading: 50, last_reading_date: daysAgo(1) };
    const result = getHumidorInsight(humidor, [{ id: 'c1' }, { id: 'c2' }]);
    expect(result.type).toBe(HUMIDOR_INSIGHT_TYPES.DRY_RISK);
    expect(result.affectedCount).toBe(2);
    expect(result.severity).toBe('danger');
  });

  test('includes affected count in detail when cigars at risk', () => {
    const humidor = { last_humidity_reading: 50, last_reading_date: daysAgo(1) };
    const result = getHumidorInsight(humidor, [{ id: 'c1' }]);
    expect(result.detail).toMatch(/1 cigar/);
  });
});

// ── getCollectionInsights ─────────────────────────────────────────────────────

describe('getCollectionInsights', () => {
  test('returns empty structure for empty collection', () => {
    const result = getCollectionInsights([], [], []);
    expect(result.readyNow).toBe(0);
    expect(result.runningLow).toHaveLength(0);
    expect(result.humidorsNeedingAttention).toHaveLength(0);
  });

  test('counts ready-now cigars from readiness engine', () => {
    const cigars = [
      { id: 'c1', aging_start_date: monthsAgo(12), ready_to_smoke_date: monthsAgo(3) },
      { id: 'c2', aging_start_date: monthsAgo(6), ready_to_smoke_date: monthsFromNow(3) }, // aging
    ];
    const result = getCollectionInsights(cigars, [], []);
    expect(result.readyNow).toBe(1);
    expect(result.aging).toBe(1);
  });

  test('identifies running-low cigars', () => {
    const cigars = [
      { id: 'c1', quantity: 2 },
      { id: 'c2', quantity: 20 },
    ];
    const result = getCollectionInsights(cigars, [], []);
    expect(result.runningLow.some((c) => c.id === 'c1')).toBe(true);
    expect(result.runningLow.some((c) => c.id === 'c2')).toBe(false);
  });

  test('identifies humidors needing attention', () => {
    const humidors = [
      {
        id: 'h1',
        last_humidity_reading: 50,
        last_reading_date: daysAgo(1),
      },
      {
        id: 'h2',
        target_humidity_rh: 65,
        last_humidity_reading: 65,
        last_reading_date: daysAgo(3),
      },
    ];
    const result = getCollectionInsights([], humidors, []);
    expect(result.humidorsNeedingAttention).toHaveLength(1);
    expect(result.humidorsNeedingAttention[0].id).toBe('h1');
  });

  test('marks cigars in risky humidors as atRiskCigars', () => {
    const humidors = [
      { id: 'h1', last_humidity_reading: 50, last_reading_date: daysAgo(1) },
    ];
    const cigars = [
      { id: 'c1', humidor_id: 'h1', quantity: 5 },
      { id: 'c2', humidor_id: null, quantity: 5 },
    ];
    const result = getCollectionInsights(cigars, humidors, []);
    expect(result.atRiskCigars).toHaveLength(1);
    expect(result.atRiskCigars[0].id).toBe('c1');
  });

  test('includes humidorHealthMap with all humidor health states', () => {
    const humidors = [
      {
        id: 'h1',
        target_humidity_rh: 65,
        last_humidity_reading: 65,
        last_reading_date: daysAgo(2),
      },
    ];
    const result = getCollectionInsights([], humidors, []);
    expect(result.humidorHealthMap['h1']).toBeDefined();
    expect(result.humidorHealthMap['h1'].state).toBe('stable');
  });
});
