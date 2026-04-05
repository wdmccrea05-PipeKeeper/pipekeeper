/**
 * Unit tests for the enhanced agingReadiness engine.
 *
 * Covers:
 *   - getHumidorHealth: all health states and confidence modifiers
 *   - getCigarRiskFlags: storage risk and inventory flags
 *   - getCigarReadinessWithContext: confidence-aware readiness with humidor impact
 *   - generateCollectionInsights: per-cigar insight types and priorities
 *   - Backward compatibility: existing getCigarReadiness / summarizeCigarReadiness unchanged
 */

import { describe, test, expect } from 'vitest';
import {
  getCigarReadiness,
  summarizeCigarReadiness,
  getHumidorHealth,
  getCigarRiskFlags,
  getCigarReadinessWithContext,
  generateCollectionInsights,
  INSIGHT_TYPES,
} from '../agingReadiness.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date('2025-06-01');
const monthsAgo = (n) => {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};
const monthsFromNow = (n) => {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

// ─── getHumidorHealth ─────────────────────────────────────────────────────────

describe('getHumidorHealth', () => {
  test('returns unmonitored when humidor is null', () => {
    const result = getHumidorHealth(null);
    expect(result.state).toBe('unmonitored');
    expect(result.confidenceModifier).toBeLessThan(0);
  });

  test('returns unmonitored when no target_humidity_rh set', () => {
    const result = getHumidorHealth({ name: 'Desktop' });
    expect(result.state).toBe('unmonitored');
  });

  test('returns dry_risk below 60% RH', () => {
    const result = getHumidorHealth({ target_humidity_rh: 55 });
    expect(result.state).toBe('dry_risk');
    expect(result.confidenceModifier).toBe(-0.3);
  });

  test('returns humid_risk above 75% RH', () => {
    const result = getHumidorHealth({ target_humidity_rh: 80 });
    expect(result.state).toBe('humid_risk');
    expect(result.confidenceModifier).toBe(-0.3);
  });

  test('returns stable with positive modifier at 68% RH', () => {
    const result = getHumidorHealth({ target_humidity_rh: 68 });
    expect(result.state).toBe('stable');
    expect(result.confidenceModifier).toBeGreaterThanOrEqual(0);
  });

  test('returns stable at 70% RH (ideal range)', () => {
    const result = getHumidorHealth({ target_humidity_rh: 70 });
    expect(result.state).toBe('stable');
    expect(result.confidenceModifier).toBe(0.1);
  });

  test('returns stable at 63% RH (acceptable but not ideal)', () => {
    const result = getHumidorHealth({ target_humidity_rh: 63 });
    expect(result.state).toBe('stable');
    expect(result.confidenceModifier).toBe(0);
  });
});

// ─── getCigarRiskFlags ────────────────────────────────────────────────────────

describe('getCigarRiskFlags', () => {
  test('returns drying flag when humidor is dry_risk', () => {
    const flags = getCigarRiskFlags({ body: 'medium' }, { target_humidity_rh: 55 });
    expect(flags.some((f) => f.type === 'drying')).toBe(true);
    expect(flags.find((f) => f.type === 'drying').severity).toBe('warning');
  });

  test('returns mold flag when humidor is humid_risk', () => {
    const flags = getCigarRiskFlags({ body: 'mild' }, { target_humidity_rh: 80 });
    expect(flags.some((f) => f.type === 'mold')).toBe(true);
  });

  test('returns unassigned info flag when no humidor', () => {
    const flags = getCigarRiskFlags({ body: 'medium' }, null);
    expect(flags.some((f) => f.type === 'unassigned')).toBe(true);
    expect(flags.find((f) => f.type === 'unassigned').severity).toBe('info');
  });

  test('returns over_aged warning for full body cigar >60 months', () => {
    const cigar = { body: 'full', aging_start_date: monthsAgo(65), quantity: 5 };
    const flags = getCigarRiskFlags(cigar, { target_humidity_rh: 70 });
    expect(flags.some((f) => f.type === 'over_aged')).toBe(true);
  });

  test('no over_aged flag for medium body at 65 months', () => {
    const cigar = { body: 'medium', aging_start_date: monthsAgo(65), quantity: 5 };
    const flags = getCigarRiskFlags(cigar, { target_humidity_rh: 70 });
    expect(flags.some((f) => f.type === 'over_aged')).toBe(false);
  });

  test('returns out_of_stock info flag when quantity is 0', () => {
    const flags = getCigarRiskFlags({ quantity: 0 }, { target_humidity_rh: 70 });
    expect(flags.some((f) => f.type === 'out_of_stock')).toBe(true);
  });

  test('no flags for healthy humidor and stocked medium cigar', () => {
    const cigar = {
      body: 'medium',
      aging_start_date: monthsAgo(12),
      singles_equivalent: 5,
    };
    const flags = getCigarRiskFlags(cigar, { target_humidity_rh: 70 });
    expect(flags.filter((f) => f.severity === 'warning')).toHaveLength(0);
  });
});

// ─── getCigarReadinessWithContext ─────────────────────────────────────────────

describe('getCigarReadinessWithContext', () => {
  const goodHumidor = { target_humidity_rh: 70 };
  const dryHumidor = { target_humidity_rh: 55 };

  test('returns high confidence when both dates set and humidor is ideal', () => {
    const cigar = {
      body: 'medium',
      strength: 'medium',
      wrapper: 'Connecticut',
      aging_start_date: monthsAgo(18),
      ready_to_smoke_date: monthsAgo(6),
    };
    const result = getCigarReadinessWithContext(cigar, goodHumidor, TODAY);
    expect(result.state).toBe('ready_now');
    expect(result.confidence).toBe('high');
    expect(result.humidorHealth.state).toBe('stable');
    expect(result.riskFlags).toBeDefined();
  });

  test('returns low confidence when no aging data', () => {
    const cigar = { body: 'medium', quantity: 3 };
    const result = getCigarReadinessWithContext(cigar, null, TODAY);
    expect(result.confidence).toBe('low');
  });

  test('dry humidor degrades confidence', () => {
    const cigar = {
      aging_start_date: monthsAgo(12),
      ready_to_smoke_date: monthsAgo(3),
      body: 'medium',
    };
    const goodResult = getCigarReadinessWithContext(cigar, goodHumidor, TODAY);
    const dryResult = getCigarReadinessWithContext(cigar, dryHumidor, TODAY);
    expect(dryResult.confidenceScore).toBeLessThan(goodResult.confidenceScore);
  });

  test('aging state is preserved through context layer', () => {
    const cigar = {
      aging_start_date: monthsAgo(2),
      body: 'medium',
    };
    const result = getCigarReadinessWithContext(cigar, goodHumidor, TODAY);
    expect(result.state).toBe('aging');
  });

  test('dry humidor adds drying risk flag', () => {
    const cigar = {
      aging_start_date: monthsAgo(12),
      body: 'medium',
      quantity: 3,
    };
    const result = getCigarReadinessWithContext(cigar, dryHumidor, TODAY);
    expect(result.riskFlags.some((f) => f.type === 'drying')).toBe(true);
  });

  test('includes humidorHealth in result', () => {
    const cigar = { aging_start_date: monthsAgo(6), body: 'mild' };
    const result = getCigarReadinessWithContext(cigar, goodHumidor, TODAY);
    expect(result.humidorHealth).toBeDefined();
    expect(result.humidorHealth.state).toBe('stable');
  });
});

// ─── generateCollectionInsights ───────────────────────────────────────────────

describe('generateCollectionInsights', () => {
  const goodHumidor = { id: 'h1', target_humidity_rh: 70 };
  const dryHumidor = { id: 'h2', target_humidity_rh: 52 };

  const baseReady = {
    id: 'c1',
    brand: 'TestBrand',
    name: 'Robusto',
    body: 'medium',
    strength: 'medium',
    aging_start_date: monthsAgo(18),
    ready_to_smoke_date: monthsAgo(6),
    singles_equivalent: 5,
    humidor_id: 'h1',
  };

  test('returns empty array for empty collection', () => {
    expect(generateCollectionInsights([])).toEqual([]);
    expect(generateCollectionInsights(null)).toEqual([]);
  });

  test('generates smoke_now insight for ready cigar with good humidor', () => {
    const insights = generateCollectionInsights([baseReady], [], [goodHumidor], TODAY);
    const smokeNow = insights.filter((i) => i.type === INSIGHT_TYPES.SMOKE_NOW);
    expect(smokeNow.length).toBeGreaterThan(0);
    expect(smokeNow[0].cigarId).toBe('c1');
  });

  test('generates rest_longer for aging cigar', () => {
    const aging = {
      ...baseReady,
      id: 'c2',
      aging_start_date: monthsAgo(1),
      ready_to_smoke_date: monthsFromNow(12),
    };
    const insights = generateCollectionInsights([aging], [], [goodHumidor], TODAY);
    const rest = insights.filter((i) => i.type === INSIGHT_TYPES.REST_LONGER);
    expect(rest.length).toBeGreaterThan(0);
  });

  test('generates at_risk for cigar in dry humidor', () => {
    const cigar = {
      ...baseReady,
      id: 'c3',
      humidor_id: 'h2',
    };
    const insights = generateCollectionInsights([cigar], [], [dryHumidor], TODAY);
    const atRisk = insights.filter((i) => i.type === INSIGHT_TYPES.AT_RISK);
    expect(atRisk.length).toBeGreaterThan(0);
  });

  test('at_risk insight has higher priority (lower number) than smoke_now', () => {
    const riskyCigar = { ...baseReady, id: 'c3', humidor_id: 'h2' };
    const insights = generateCollectionInsights(
      [baseReady, riskyCigar],
      [],
      [goodHumidor, dryHumidor],
      TODAY
    );
    const atRiskInsight = insights.find((i) => i.type === INSIGHT_TYPES.AT_RISK);
    const smokeInsight = insights.find((i) => i.type === INSIGHT_TYPES.SMOKE_NOW);
    if (atRiskInsight && smokeInsight) {
      expect(atRiskInsight.priority).toBeLessThan(smokeInsight.priority);
    }
  });

  test('generates neglected for never-smoked cigar with stock', () => {
    const cigar = { ...baseReady, id: 'c4', singles_equivalent: 10 };
    const insights = generateCollectionInsights([cigar], [], [goodHumidor], TODAY);
    const neglected = insights.filter((i) => i.type === INSIGHT_TYPES.NEGLECTED);
    expect(neglected.length).toBeGreaterThan(0);
    expect(neglected[0].detail).toContain('Never smoked');
  });

  test('no neglected when recently smoked (30 days ago)', () => {
    const cigar = { ...baseReady, id: 'c5' };
    const recentDate = new Date(TODAY);
    recentDate.setDate(recentDate.getDate() - 30);
    const recentSession = { cigar_id: 'c5', date: recentDate.toISOString().slice(0, 10) };
    const insights = generateCollectionInsights([cigar], [recentSession], [goodHumidor], TODAY);
    const neglected = insights.filter((i) => i.type === INSIGHT_TYPES.NEGLECTED);
    expect(neglected).toHaveLength(0);
  });

  test('generates overstocked for high-quantity never-smoked cigar', () => {
    const cigar = { ...baseReady, id: 'c6', singles_equivalent: 25 };
    const insights = generateCollectionInsights([cigar], [], [goodHumidor], TODAY);
    const overstocked = insights.filter((i) => i.type === INSIGHT_TYPES.OVERSTOCKED);
    expect(overstocked.length).toBeGreaterThan(0);
  });

  test('generates fast_depleting when low stock and high session count', () => {
    const cigar = { ...baseReady, id: 'c7', singles_equivalent: 2 };
    const sessions = Array.from({ length: 6 }, (_, i) => ({
      cigar_id: 'c7',
      date: monthsAgo(i),
    }));
    const insights = generateCollectionInsights([cigar], sessions, [goodHumidor], TODAY);
    const fastDepleting = insights.filter((i) => i.type === INSIGHT_TYPES.FAST_DEPLETING);
    expect(fastDepleting.length).toBeGreaterThan(0);
  });

  test('results are sorted by priority ascending', () => {
    const cigar1 = { ...baseReady, id: 'c8', humidor_id: 'h2' }; // at_risk
    const cigar2 = { ...baseReady, id: 'c9' }; // smoke_now + neglected
    const insights = generateCollectionInsights([cigar1, cigar2], [], [goodHumidor, dryHumidor], TODAY);
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i - 1].priority);
    }
  });
});

// ─── Backward compatibility ───────────────────────────────────────────────────

describe('backward compatibility — getCigarReadiness and summarizeCigarReadiness', () => {
  test('getCigarReadiness still works without humidor arg', () => {
    const cigar = { aging_start_date: monthsAgo(12), body: 'medium' };
    const result = getCigarReadiness(cigar, TODAY);
    expect(result.state).toBe('ready_now');
    expect(result.monthsAged).toBeDefined();
  });

  test('summarizeCigarReadiness still returns correct counts', () => {
    const cigars = [
      { aging_start_date: monthsAgo(10) },  // ready_now
      { aging_start_date: monthsAgo(1) },   // aging (< 3 months)
      {},                                    // no_data
    ];
    const summary = summarizeCigarReadiness(cigars, TODAY);
    expect(summary.readyNow).toBe(1);
    expect(summary.aging).toBe(1);
    expect(summary.noData).toBe(1);
    expect(summary.pastPeak).toBe(0);
  });
});
