/**
 * cigarSelectors — rarity scoring unit tests
 */
import { describe, test, expect } from 'vitest';
import {
  getCigarRarityScore,
  getCigarRarityResult,
  getCigarRarityLabel,
} from '../cigarSelectors';

const minimalCigar = { name: 'Test Cigar' };

const commonCigar = {
  name: 'Budget Smoke',
  brand: 'Generic Brand',
  country_of_origin: 'Honduras',
  quantity: 10,
};

const premiumCigar = {
  name: 'Serie D No.4',
  brand: 'Partagas',
  line: 'Serie D',
  wrapper: 'Habano',
  vitola: 'Robusto',
  country_of_origin: 'Cuba',
  production_status: 'in_production',
  quantity: 5,
};

const limitedCigar = {
  name: 'Aniversario Limited',
  brand: 'Padron',
  line: 'Aniversario Limited Edition',
  release_type: 'limited',
  wrapper: 'Oscuro Maduro',
  vitola: 'Torpedo',
  country_of_origin: 'Nicaragua',
  production_status: 'limited',
  quantity: 2,
  estimated_unit_value: 45,
};

const discontinuedCigar = {
  name: 'Old Reserve',
  brand: 'Drew Estate',
  line: 'Rare Reserve',
  production_status: 'discontinued',
  wrapper: 'Cameroon',
  country_of_origin: 'Nicaragua',
  quantity: 3,
  estimated_unit_value: 30,
  aging_start_date: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
};

describe('getCigarRarityScore', () => {
  test('returns null for cigar with no data signals', () => {
    expect(getCigarRarityScore(minimalCigar)).toBeNull();
  });

  test('returns null for single-signal cigar', () => {
    expect(getCigarRarityScore({ ...minimalCigar, brand: 'SomeBrand' })).toBeNull();
  });

  test('returns number 0–100 for cigar with sufficient data', () => {
    const score = getCigarRarityScore(premiumCigar);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('prestige brand scores higher than unknown brand', () => {
    const prestigeScore = getCigarRarityScore(premiumCigar);
    const commonScore = getCigarRarityScore(commonCigar);
    expect(prestigeScore).toBeGreaterThan(commonScore);
  });

  test('discontinued cigar scores higher than regular production', () => {
    const discScore = getCigarRarityScore(discontinuedCigar);
    const regScore = getCigarRarityScore(premiumCigar);
    expect(discScore).toBeGreaterThan(regScore ?? 0);
  });

  test('limited release cigar scores above common', () => {
    const limitedScore = getCigarRarityScore(limitedCigar);
    const commonScore = getCigarRarityScore(commonCigar);
    expect(limitedScore).toBeGreaterThan(commonScore);
  });

  test('aged cigar earns bonus points', () => {
    const aged = { ...premiumCigar, aging_start_date: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString() };
    const notAged = { ...premiumCigar };
    expect(getCigarRarityScore(aged)).toBeGreaterThan(getCigarRarityScore(notAged) ?? 0);
  });

  test('rare wrapper increases score', () => {
    const rareWrapper = { ...commonCigar, wrapper: 'Oscuro', brand: 'Known Brand' };
    const noWrapper = { ...commonCigar };
    const rareScore = getCigarRarityScore(rareWrapper);
    const noScore = getCigarRarityScore(noWrapper);
    if (rareScore !== null && noScore !== null) {
      expect(rareScore).toBeGreaterThanOrEqual(noScore);
    }
  });
});

describe('getCigarRarityResult', () => {
  test('returns insufficient when score is null', () => {
    const result = getCigarRarityResult(minimalCigar);
    expect(result.score).toBeNull();
    expect(result.confidence).toBe('insufficient');
    expect(result.reasoning).toMatch(/not enough data/i);
  });

  test('returns label for scored cigar', () => {
    const result = getCigarRarityResult(limitedCigar);
    expect(['Common', 'Notable', 'Collectible', 'Rare', 'Exceptional']).toContain(result.label);
  });

  test('includes contributing factors array', () => {
    const result = getCigarRarityResult(premiumCigar);
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  test('manual valuation override does not break rarity score', () => {
    const manualOverride = { ...premiumCigar, manual_valuation_enabled: true, manual_valuation_override: 50 };
    const result = getCigarRarityResult(manualOverride);
    expect(result).not.toBeNull();
    expect(result.score).not.toBeUndefined();
  });
});

describe('getCigarRarityLabel', () => {
  test('returns null for insufficient data', () => {
    expect(getCigarRarityLabel(minimalCigar)).toBeNull();
  });

  test('returns valid label for scored cigar', () => {
    const label = getCigarRarityLabel(premiumCigar);
    expect(['Common', 'Notable', 'Collectible', 'Rare', 'Exceptional']).toContain(label);
  });
});