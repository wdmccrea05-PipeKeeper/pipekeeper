import { describe, expect, test } from 'vitest';
import {
  deriveWineValuationPatch,
  shouldRefreshWineValuation,
  normalizeWineValuationConfidence,
  buildWineValuationPrompt,
  getWineValuationStatus,
} from '../wineValuation';

describe('normalizeWineValuationConfidence', () => {
  test('returns "high" for "high"', () => {
    expect(normalizeWineValuationConfidence('high')).toBe('high');
  });
  test('returns "medium" for "Medium"', () => {
    expect(normalizeWineValuationConfidence('Medium')).toBe('medium');
  });
  test('returns "low" for unrecognised value', () => {
    expect(normalizeWineValuationConfidence('unknown')).toBe('low');
    expect(normalizeWineValuationConfidence(null)).toBe('low');
    expect(normalizeWineValuationConfidence(undefined)).toBe('low');
  });
});

describe('shouldRefreshWineValuation', () => {
  test('returns true when no market value exists', () => {
    expect(shouldRefreshWineValuation({ name: 'Test Wine' })).toBe(true);
  });

  test('returns false when manual override is enabled', () => {
    expect(shouldRefreshWineValuation({
      market_estimated_unit_value: 100,
      manual_valuation_enabled: true,
      valuation_confidence: 'high',
      valuation_updated_at: new Date().toISOString(),
    })).toBe(false);
  });

  test('returns true when confidence is low', () => {
    expect(shouldRefreshWineValuation({
      market_estimated_unit_value: 80,
      valuation_confidence: 'low',
      valuation_updated_at: new Date().toISOString(),
    })).toBe(true);
  });

  test('returns true when valuation_updated_at is older than 30 days', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);
    expect(shouldRefreshWineValuation({
      market_estimated_unit_value: 80,
      valuation_confidence: 'high',
      valuation_updated_at: oldDate.toISOString(),
    })).toBe(true);
  });

  test('returns false for recent high-confidence market value', () => {
    expect(shouldRefreshWineValuation({
      market_estimated_unit_value: 120,
      valuation_confidence: 'high',
      valuation_updated_at: new Date().toISOString(),
    })).toBe(false);
  });
});

describe('deriveWineValuationPatch', () => {
  test('returns valuation patch when enrichment provides estimated_unit_value', () => {
    const wine = { quantity: 3 };
    const result = { estimated_unit_value: 75, valuation_confidence: 'medium', valuation_source: 'Wine-Searcher' };
    const patch = deriveWineValuationPatch(wine, result);

    expect(patch.estimated_unit_value).toBe(75);
    expect(patch.estimated_total_value).toBe(225);
    expect(patch.market_estimated_unit_value).toBe(75);
    expect(patch.market_estimated_total_value).toBe(225);
    expect(patch.market_replacement_cost_estimate).toBe(225);
    expect(patch.valuation_confidence).toBe('medium');
    expect(patch.market_valuation_confidence).toBe('medium');
    expect(patch.valuation_source).toBe('Wine-Searcher');
    expect(patch.market_valuation_source).toBe('Wine-Searcher');
    expect(patch.market_comparable_count).toBe(1);
    expect(patch.valuation_updated_at).toBeTruthy();
    expect(patch.market_valuation_updated_at).toBeTruthy();
  });

  test('falls back to purchase_price when enrichment provides no value', () => {
    const wine = { quantity: 2, purchase_price: 50 };
    const result = { estimated_unit_value: null };
    const patch = deriveWineValuationPatch(wine, result);

    expect(patch.estimated_unit_value).toBe(50);
    expect(patch.estimated_total_value).toBe(100);
    expect(patch.market_estimated_unit_value).toBe(50);
    expect(patch.valuation_confidence).toBe('low');
    expect(patch.valuation_source).toBe('Purchase price (fallback)');
  });

  test('saves market and canonical fields together', () => {
    const wine = { quantity: 1 };
    const result = { estimated_unit_value: 200, valuation_confidence: 'high', comparable_count: 5 };
    const patch = deriveWineValuationPatch(wine, result);

    // Canonical
    expect(patch.estimated_unit_value).toBe(200);
    expect(patch.estimated_total_value).toBe(200);
    expect(patch.replacement_cost_estimate).toBe(200);
    // Market
    expect(patch.market_estimated_unit_value).toBe(200);
    expect(patch.market_estimated_total_value).toBe(200);
    expect(patch.market_replacement_cost_estimate).toBe(200);
    expect(patch.market_comparable_count).toBe(5);
  });

  test('returns empty patch when manual_valuation_enabled is true', () => {
    const wine = { quantity: 2, manual_valuation_enabled: true, manual_estimated_value: 100 };
    const result = { estimated_unit_value: 300 };
    const patch = deriveWineValuationPatch(wine, result);
    expect(Object.keys(patch).length).toBe(0);
  });

  test('returns empty patch when no value can be derived', () => {
    const wine = { quantity: 1 };
    const result = { estimated_unit_value: null };
    const patch = deriveWineValuationPatch(wine, result);
    expect(Object.keys(patch).length).toBe(0);
  });

  test('calculates total correctly for multi-bottle quantity', () => {
    const wine = { quantity: 6 };
    const result = { estimated_unit_value: 50, valuation_confidence: 'high' };
    const patch = deriveWineValuationPatch(wine, result);
    expect(patch.estimated_total_value).toBe(300);
    expect(patch.market_estimated_total_value).toBe(300);
  });
});

describe('buildWineValuationPrompt', () => {
  test('returns empty string for null input', () => {
    expect(buildWineValuationPrompt(null)).toBe('');
  });

  test('includes wine name and producer', () => {
    const wine = { name: 'Opus One', producer: 'Opus One Winery', vintage: 2015, style: 'Red Blend' };
    const prompt = buildWineValuationPrompt(wine);
    expect(prompt).toContain('Opus One');
    expect(prompt).toContain('Opus One Winery');
    expect(prompt).toContain('2015');
    expect(prompt).toContain('Red Blend');
  });

  test('includes instructions to estimate value and confidence', () => {
    const wine = { name: 'Test Wine' };
    const prompt = buildWineValuationPrompt(wine);
    expect(prompt).toContain('estimated_unit_value');
    expect(prompt).toContain('valuation_confidence');
  });

  test('omits fields that are not set', () => {
    const wine = { name: 'Minimal Wine' };
    const prompt = buildWineValuationPrompt(wine);
    expect(prompt).not.toContain('Producer:');
    expect(prompt).not.toContain('Vintage:');
  });
});

describe('getWineValuationStatus', () => {
  test('returns missing for null', () => {
    const { status } = getWineValuationStatus(null);
    expect(status).toBe('missing');
  });

  test('returns manual when manual_valuation_enabled is true', () => {
    const { status } = getWineValuationStatus({ manual_valuation_enabled: true, market_estimated_unit_value: 100 });
    expect(status).toBe('manual');
  });

  test('returns missing when no market value present', () => {
    const { status } = getWineValuationStatus({ name: 'Test' });
    expect(status).toBe('missing');
  });

  test('returns low when confidence is low', () => {
    const { status } = getWineValuationStatus({
      market_estimated_unit_value: 80,
      valuation_confidence: 'low',
      valuation_updated_at: new Date().toISOString(),
    });
    expect(status).toBe('low');
  });

  test('returns stale when updated_at is older than 30 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 45);
    const { status } = getWineValuationStatus({
      market_estimated_unit_value: 80,
      valuation_confidence: 'high',
      valuation_updated_at: old.toISOString(),
    });
    expect(status).toBe('stale');
  });

  test('returns valued for recent high-confidence entry', () => {
    const { status } = getWineValuationStatus({
      market_estimated_unit_value: 120,
      valuation_confidence: 'high',
      valuation_updated_at: new Date().toISOString(),
    });
    expect(status).toBe('valued');
  });
});
