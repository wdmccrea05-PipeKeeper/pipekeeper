/**
 * Tests for wineOptimization.js
 */

import { describe, it, expect, vi } from 'vitest';
import {
  analyzeWineOptimizationIssues,
  buildWineMetadataPatch,
  buildWineValuationPatch,
  buildWineDrinkingWindowPatch,
  buildWineRarityPatch,
  applyWineOptimizationPatch,
  applyWineOptimizationBatch,
  WINE_ISSUE_TYPE,
} from '../wineOptimization.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeWine = (overrides = {}) => ({
  id: 'w1',
  name: 'Test Cabernet',
  producer: 'Test Producer',
  vintage: 2015,
  style: 'Red',
  varietal: 'Cabernet Sauvignon',
  region: 'Napa Valley',
  country: 'USA',
  quantity: 3,
  ...overrides,
});

const makeIncompleteWine = (overrides = {}) => ({
  id: 'w_incomplete',
  name: 'Mystery Wine',
  // missing: producer, vintage, style, varietal, region, country
  ...overrides,
});

// ─── analyzeWineOptimizationIssues ───────────────────────────────────────────

describe('analyzeWineOptimizationIssues', () => {
  it('returns empty array for empty wine list', () => {
    const result = analyzeWineOptimizationIssues([], [], {});
    expect(result).toEqual([]);
  });

  it('detects missing core metadata', () => {
    const wines = [makeIncompleteWine()];
    const issues = analyzeWineOptimizationIssues(wines);
    const metaIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_METADATA);
    expect(metaIssue).toBeDefined();
    expect(metaIssue.autoFixable).toBe(true);
    expect(metaIssue.records.length).toBe(1);
  });

  it('does not flag wines with complete core metadata', () => {
    const wines = [makeWine()];
    const issues = analyzeWineOptimizationIssues(wines);
    const metaIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_METADATA);
    expect(metaIssue).toBeUndefined();
  });

  it('detects missing drinking window', () => {
    const wines = [makeWine({ vintage: 2015, style: 'Red', varietal: 'Cabernet Sauvignon' })];
    const issues = analyzeWineOptimizationIssues(wines);
    const windowIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_DRINKING_WINDOW);
    expect(windowIssue).toBeDefined();
    expect(windowIssue.actionType).toBe('auto_estimate_wine_drinking_window');
  });

  it('detects missing valuation', () => {
    const wines = [makeWine({ estimated_unit_value: null, market_estimated_unit_value: null, purchase_price: null })];
    const issues = analyzeWineOptimizationIssues(wines);
    const valIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_VALUATION);
    expect(valIssue).toBeDefined();
  });

  it('does not flag wines with manual valuation enabled', () => {
    const wines = [makeWine({ manual_valuation_enabled: true })];
    const issues = analyzeWineOptimizationIssues(wines);
    const valIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_VALUATION);
    expect(valIssue).toBeUndefined();
  });

  it('detects missing rarity when 3+ wines lack scores', () => {
    const wines = [
      makeWine({ id: 'w1' }),
      makeWine({ id: 'w2' }),
      makeWine({ id: 'w3' }),
    ];
    const issues = analyzeWineOptimizationIssues(wines);
    const rarityIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_RARITY);
    expect(rarityIssue).toBeDefined();
    expect(rarityIssue.autoFixable).toBe(true);
  });

  it('does NOT flag rarity when fewer than 3 wines lack scores', () => {
    const wines = [makeWine({ id: 'w1' }), makeWine({ id: 'w2' })];
    const issues = analyzeWineOptimizationIssues(wines);
    const rarityIssue = issues.find((i) => i.type === WINE_ISSUE_TYPE.MISSING_RARITY);
    expect(rarityIssue).toBeUndefined();
  });
});

// ─── buildWineMetadataPatch ───────────────────────────────────────────────────

describe('buildWineMetadataPatch', () => {
  it('returns empty object for null input', () => {
    expect(buildWineMetadataPatch(null)).toEqual({});
  });

  it('provides metadata_confidence and enriched_at', () => {
    const patch = buildWineMetadataPatch(makeWine());
    expect(patch).toHaveProperty('metadata_confidence');
    expect(patch).toHaveProperty('metadata_enriched_at');
  });

  it('sets bottle_size default when missing', () => {
    const patch = buildWineMetadataPatch(makeWine({ bottle_size: undefined }));
    expect(patch.bottle_size).toBe('750ml');
  });
});

// ─── buildWineDrinkingWindowPatch ─────────────────────────────────────────────

describe('buildWineDrinkingWindowPatch', () => {
  it('returns empty object for null input', () => {
    expect(buildWineDrinkingWindowPatch(null)).toEqual({});
  });

  it('returns low-confidence patch when vintage is missing', () => {
    const patch = buildWineDrinkingWindowPatch(makeWine({ vintage: undefined }));
    expect(patch.drinking_window_confidence).toBe('low');
  });

  it('does not overwrite existing drinking window', () => {
    const wine = makeWine({ drink_from: 2020, drink_by: 2030 });
    const patch = buildWineDrinkingWindowPatch(wine);
    expect(Object.keys(patch).length).toBe(0);
  });

  it('estimates drinking window from vintage + style', () => {
    const wine = makeWine({ vintage: 2015, style: 'Red', varietal: 'Cabernet Sauvignon' });
    const patch = buildWineDrinkingWindowPatch(wine);
    expect(patch.drinking_window_start).toBeDefined();
    expect(patch.drinking_window_end).toBeDefined();
    expect(patch.drink_window_status).toBeDefined();
    expect(patch.drinking_window_confidence).toBe('medium');
  });

  it('sets status to past_peak for old wine past max age', () => {
    // Sparkling wine from 1990 should be past peak (max 5 years)
    const wine = makeWine({ vintage: 1990, style: 'Sparkling', varietal: null });
    const patch = buildWineDrinkingWindowPatch(wine);
    expect(patch.drink_window_status).toBe('past_peak');
  });
});

// ─── buildWineValuationPatch ──────────────────────────────────────────────────

describe('buildWineValuationPatch', () => {
  it('returns empty object for null input', () => {
    expect(buildWineValuationPatch(null)).toEqual({});
  });

  it('returns empty object when manual_valuation_enabled is set', () => {
    const patch = buildWineValuationPatch(makeWine({ manual_valuation_enabled: true }));
    expect(patch).toEqual({});
  });

  it('bootstraps from purchase_price when no market estimate exists', () => {
    const wine = makeWine({
      purchase_price: 50,
      estimated_unit_value: null,
      market_estimated_unit_value: null,
      quantity: 3,
    });
    const patch = buildWineValuationPatch(wine);
    expect(patch.estimated_unit_value).toBe(50);
    expect(patch.estimated_total_value).toBe(150);
    expect(patch.valuation_source).toBe('purchase_price');
    expect(patch.valuation_confidence).toBe('low');
  });

  it('does NOT overwrite purchase_price', () => {
    const wine = makeWine({ purchase_price: 50 });
    const patch = buildWineValuationPatch(wine);
    expect('purchase_price' in patch).toBe(false);
  });
});

// ─── buildWineRarityPatch ─────────────────────────────────────────────────────

describe('buildWineRarityPatch', () => {
  it('returns empty object for null input', () => {
    expect(buildWineRarityPatch(null)).toEqual({});
  });

  it('returns empty object when rarity_score already exists', () => {
    const patch = buildWineRarityPatch(makeWine({ rarity_score: 50 }));
    expect(patch).toEqual({});
  });

  it('produces rarity_score, collectibility_score, and rarity_label', () => {
    const wine = makeWine({ vintage: 2000, varietal: 'Nebbiolo', region: 'Barolo' });
    const patch = buildWineRarityPatch(wine);
    expect(patch.rarity_score).toBeTypeOf('number');
    expect(patch.collectibility_score).toBeTypeOf('number');
    expect(patch.rarity_label).toBeDefined();
    expect(patch.rarity_confidence).toBeDefined();
  });

  it('assigns higher rarity to aged Nebbiolo', () => {
    const youngWine  = makeWine({ vintage: new Date().getFullYear() - 1, varietal: 'Chardonnay' });
    const agedNebbiolo = makeWine({ vintage: new Date().getFullYear() - 22, varietal: 'Nebbiolo', region: 'Barolo' });
    const patchYoung   = buildWineRarityPatch(youngWine);
    const patchAged    = buildWineRarityPatch(agedNebbiolo);
    expect(patchAged.rarity_score).toBeGreaterThan(patchYoung.rarity_score);
  });
});

// ─── applyWineOptimizationPatch ───────────────────────────────────────────────

describe('applyWineOptimizationPatch', () => {
  it('returns error result for invalid arguments', () => {
    const result = applyWineOptimizationPatch(null, null);
    expect(result.merged).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('never overwrites manual valuation fields', () => {
    const patch = { manual_estimated_value: 500, estimated_unit_value: 50 };
    const result = applyWineOptimizationPatch('w1', { ...patch });
    expect(result.skipped).toContain('manual_estimated_value');
    expect(result.patch.manual_estimated_value).toBeUndefined();
    // Non-manual fields pass through
    expect(result.patch.estimated_unit_value).toBe(50);
  });

  it('dry run does not mark as merged', () => {
    const result = applyWineOptimizationPatch('w1', { estimated_unit_value: 50 }, { dryRun: true });
    expect(result.merged).toBe(false);
    expect(result.appliedAt).toBeNull();
  });

  it('returns merged:true and appliedAt timestamp on normal apply', () => {
    const result = applyWineOptimizationPatch('w1', { estimated_unit_value: 50 });
    expect(result.merged).toBe(true);
    expect(result.appliedAt).toBeDefined();
  });
});

// ─── applyWineOptimizationBatch ───────────────────────────────────────────────

describe('applyWineOptimizationBatch', () => {
  it('returns empty array for empty records', () => {
    const result = applyWineOptimizationBatch(WINE_ISSUE_TYPE.MISSING_METADATA, []);
    expect(result).toEqual([]);
  });

  it('applies metadata patches to all records in batch', () => {
    const wines = [makeIncompleteWine({ id: 'w1' }), makeIncompleteWine({ id: 'w2' })];
    const results = applyWineOptimizationBatch(WINE_ISSUE_TYPE.MISSING_METADATA, wines);
    expect(results.length).toBe(2);
    for (const r of results) {
      expect(r.merged).toBe(true);
    }
  });

  it('applies drinking window patches to batch', () => {
    const wines = [
      makeWine({ id: 'w1', vintage: 2015 }),
      makeWine({ id: 'w2', vintage: 2012, style: 'Full-Bodied Red' }),
    ];
    const results = applyWineOptimizationBatch(WINE_ISSUE_TYPE.MISSING_DRINKING_WINDOW, wines);
    expect(results.length).toBe(2);
  });

  it('applies valuation patches and does not overwrite manual valuation', () => {
    const wines = [
      makeWine({ id: 'w1', purchase_price: 80, manual_valuation_enabled: false }),
      makeWine({ id: 'w2', manual_valuation_enabled: true }),
    ];
    const results = applyWineOptimizationBatch(WINE_ISSUE_TYPE.MISSING_VALUATION, wines);
    expect(results.length).toBe(2);
    // w2 patch should be empty (manual override)
    expect(Object.keys(results[1].patch).length).toBe(0);
  });
});
