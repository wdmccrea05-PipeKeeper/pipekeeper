/**
 * Tests for growExpandEngine.js
 */

import { describe, it, expect } from 'vitest';
import { generateGrowExpandRecommendations } from '../growExpandEngine.js';
import { CATEGORY } from '../recommendationSchema.js';

const makePipe = (overrides = {}) => ({
  id: 'p1', name: 'Test Pipe', shape: 'Billiard',
  specialization: '', ...overrides,
});

const makeBlend = (overrides = {}) => ({
  id: 'b1', name: 'Test Blend', blend_type: 'Aromatic',
  tin_total_quantity_oz: 4, ...overrides,
});

const makeBottle = (overrides = {}) => ({
  id: 'bot1', name: 'Test Bourbon', type: 'Bourbon', ...overrides,
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('generateGrowExpandRecommendations — edge cases', () => {
  it('returns empty array for empty collection', () => {
    expect(generateGrowExpandRecommendations({})).toEqual([]);
  });

  it('returns empty array when total items < 3', () => {
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends: [makeBlend()],
      bottles: [],
    });
    expect(result).toEqual([]);
  });

  it('handles missing arrays gracefully', () => {
    const result = generateGrowExpandRecommendations({
      blends: [makeBlend(), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })],
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it('uses PipeKeeper gating for tobacco/blends', () => {
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe({ id: 'p1' }), makePipe({ id: 'p2' })],
      blends: [makeBlend({ id: 'b1' }), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })],
      bottles: [],
      activeModules: { pipekeeper: false },
    });
    const blendExpansion = result.find((rec) => rec.goal?.startsWith('blend_family_expansion'));
    expect(blendExpansion).toBeUndefined();
  });
});

// ─── Blend family expansion ───────────────────────────────────────────────────

describe('generateGrowExpandRecommendations — blend expansion', () => {
  it('suggests Virginia when collection is Aromatic-heavy', () => {
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b2', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b3', blend_type: 'Aromatic' }),
    ];
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles: [],
      smokingLogs: [],
      activeModules: { pipekeeper: true },
    });
    const expandRec = result.find((r) => r.goal?.startsWith('blend_family_expansion'));
    expect(expandRec).toBeDefined();
    expect(expandRec.category).toBe(CATEGORY.GROW_EXPAND);
    expect(expandRec.items[0].suggestedFamily).toBe('Virginia');
  });

  it('does NOT suggest a blend type already in the collection', () => {
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b2', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b3', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b4', blend_type: 'Virginia' }), // already owned
    ];
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles: [],
      smokingLogs: [],
    });
    const expandRec = result.find((r) => r.goal?.startsWith('blend_family_expansion'));
    // Should either suggest the next non-owned type or not produce a rec
    if (expandRec) {
      expect(expandRec.items[0].suggestedFamily).not.toBe('Virginia');
    }
  });

  it('respects disliked flavors from preferences', () => {
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Virginia' }),
      makeBlend({ id: 'b2', blend_type: 'Virginia' }),
      makeBlend({ id: 'b3', blend_type: 'Virginia' }),
    ];
    const preferences = { disliked_flavors: ['Virginia/Perique', 'Perique'] };
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles: [],
      preferences,
    });
    const expandRec = result.find((r) => r.goal?.startsWith('blend_family_expansion'));
    if (expandRec) {
      const family = expandRec.items[0].suggestedFamily;
      expect(family).not.toBe('Virginia/Perique');
    }
  });

  it('returns no blend expansion when collection has < 2 blends', () => {
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends: [makeBlend()],
      bottles: [makeBottle(), makeBottle({ id: 'bot2' })],
    });
    const expandRec = result.find((r) => r.goal?.startsWith('blend_family_expansion'));
    expect(expandRec).toBeUndefined();
  });
});

// ─── Whiskey expansion ────────────────────────────────────────────────────────

describe('generateGrowExpandRecommendations — whiskey expansion', () => {
  it('suggests Rye when collection is Bourbon-only', () => {
    const bottles = [
      makeBottle({ id: 'bot1', type: 'Bourbon' }),
      makeBottle({ id: 'bot2', type: 'Bourbon' }),
    ];
    const blends = [
      makeBlend({ id: 'b1' }),
      makeBlend({ id: 'b2' }),
      makeBlend({ id: 'b3' }),
    ];
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles,
    });
    const whiskeyRec = result.find((r) => r.goal === 'whiskey_type_expansion');
    expect(whiskeyRec).toBeDefined();
    expect(whiskeyRec.category).toBe(CATEGORY.GROW_EXPAND);
    expect(whiskeyRec.items[0].suggestedType).toContain('Rye');
  });

  it('does not produce whiskey expansion with no bottles', () => {
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends: [makeBlend(), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })],
      bottles: [],
    });
    const whiskeyRec = result.find((r) => r.goal === 'whiskey_type_expansion');
    expect(whiskeyRec).toBeUndefined();
  });

  it('skips peated suggestions when user dislikes peat', () => {
    const bottles = [
      makeBottle({ id: 'bot1', type: 'Single Malt Scotch' }),
    ];
    const blends = [makeBlend(), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })];
    const preferences = { disliked_flavors: ['peat', 'smoke'] };
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles,
      preferences,
    });
    const whiskeyRec = result.find((r) => r.goal === 'whiskey_type_expansion');
    if (whiskeyRec) {
      expect(whiskeyRec.items[0].suggestedType).not.toContain('Islay');
    }
  });
});

// ─── Pipe shape expansion ─────────────────────────────────────────────────────

describe('generateGrowExpandRecommendations — pipe shape expansion', () => {
  it('suggests Dublin when collection is billiard-heavy', () => {
    const pipes = [
      makePipe({ id: 'p1', shape: 'Billiard' }),
      makePipe({ id: 'p2', shape: 'Billiard' }),
      makePipe({ id: 'p3', shape: 'Billiard' }),
    ];
    const blends = [makeBlend(), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })];
    const result = generateGrowExpandRecommendations({
      pipes,
      blends,
      bottles: [],
      activeModules: { pipekeeper: true },
    });
    const pipeRec = result.find((r) => r.goal === 'pipe_shape_expansion');
    expect(pipeRec).toBeDefined();
    expect(pipeRec.category).toBe(CATEGORY.GROW_EXPAND);
    expect(pipeRec.items[0].suggestedShape).toContain('Dublin');
  });

  it('does not suggest pipe expansion when collection has < 2 pipes', () => {
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends: [makeBlend(), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })],
      bottles: [],
    });
    const pipeRec = result.find((r) => r.goal === 'pipe_shape_expansion');
    expect(pipeRec).toBeUndefined();
  });
});

// ─── Output structure ─────────────────────────────────────────────────────────

describe('generateGrowExpandRecommendations — output structure', () => {
  it('all recommendations have required fields', () => {
    const pipes = [makePipe(), makePipe({ id: 'p2' })];
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b2', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b3', blend_type: 'Aromatic' }),
    ];
    const bottles = [makeBottle(), makeBottle({ id: 'bot2' })];
    const result = generateGrowExpandRecommendations({ pipes, blends, bottles });
    for (const rec of result) {
      expect(rec).toHaveProperty('id');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('summary');
      expect(rec).toHaveProperty('whyItMatters');
      expect(rec).toHaveProperty('confidence');
      expect(rec).toHaveProperty('items');
      expect(rec.category).toBe(CATEGORY.GROW_EXPAND);
    }
  });

  it('produces no duplicate goals', () => {
    const pipes = [makePipe(), makePipe({ id: 'p2', shape: 'Billiard' })];
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b2', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b3', blend_type: 'Aromatic' }),
    ];
    const bottles = [makeBottle(), makeBottle({ id: 'bot2' })];
    const result = generateGrowExpandRecommendations({ pipes, blends, bottles });
    const goals = result.map((r) => r.goal);
    const uniqueGoals = [...new Set(goals)];
    expect(goals.length).toBe(uniqueGoals.length);
  });

  it('all items have ownershipStatus external or wishlist', () => {
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b2', blend_type: 'Aromatic' }),
      makeBlend({ id: 'b3', blend_type: 'Aromatic' }),
    ];
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles: [makeBottle()],
      smokingLogs: [],
    });
    for (const rec of result) {
      for (const item of rec.items) {
        expect(['wishlist', 'external']).toContain(item.ownershipStatus);
      }
    }
  });
});

// ─── Scoring engine ───────────────────────────────────────────────────────────

describe('generateGrowExpandRecommendations — scoring', () => {
  it('produces higher confidence for well-established collections', () => {
    const blends = Array.from({ length: 6 }, (_, i) =>
      makeBlend({ id: `b${i}`, blend_type: 'English' })
    );
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles: [],
    });
    const expandRec = result.find((r) => r.goal?.startsWith('blend_family_expansion'));
    if (expandRec) {
      // Well-established collection should get medium or high confidence
      expect(['medium', 'high']).toContain(expandRec.confidence);
    }
  });

  it('produces low or medium confidence for minimal collections', () => {
    const blends = [
      makeBlend({ id: 'b1', blend_type: 'Burley' }),
      makeBlend({ id: 'b2', blend_type: 'Burley' }),
    ];
    const result = generateGrowExpandRecommendations({
      pipes: [makePipe()],
      blends,
      bottles: [makeBottle()],
    });
    // Just ensure we get a result without crashing and confidence is valid
    for (const rec of result) {
      expect(['low', 'medium', 'high']).toContain(rec.confidence);
    }
  });
});

// ─── Wine expansion ───────────────────────────────────────────────────────────

const makeWine = (overrides = {}) => ({
  id: 'w1',
  name: 'Test Cabernet',
  varietal: 'Cabernet Sauvignon',
  style: 'Red',
  vintage: 2018,
  region: 'Napa Valley',
  country: 'USA',
  quantity: 3,
  ...overrides,
});

describe('generateGrowExpandRecommendations — wine expansion', () => {
  it('returns wine suggestions when winekeeper is active', () => {
    const wines = [makeWine()];
    const result = generateGrowExpandRecommendations({
      wines,
      activeModules: { winekeeper: true },
    });
    expect(result.length).toBeGreaterThan(0);
    const wineRec = result.find((r) => r.moduleKey === 'wine');
    expect(wineRec).toBeDefined();
    expect(wineRec.category).toBe(CATEGORY.GROW_EXPAND);
  });

  it('does NOT return wine suggestions when winekeeper is disabled', () => {
    const wines = [makeWine()];
    const result = generateGrowExpandRecommendations({
      wines,
      pipes: [makePipe()],
      blends: [makeBlend(), makeBlend({ id: 'b2' }), makeBlend({ id: 'b3' })],
      activeModules: { winekeeper: false, pipekeeper: true },
    });
    const wineRec = result.find((r) => r.moduleKey === 'wine');
    expect(wineRec).toBeUndefined();
  });

  it('suggests varietal gap from progression for Cabernet collection', () => {
    const wines = [makeWine({ varietal: 'Cabernet Sauvignon' })];
    const result = generateGrowExpandRecommendations({
      wines,
      activeModules: { winekeeper: true },
    });
    const wineRec = result.find((r) => r.moduleKey === 'wine');
    expect(wineRec).toBeDefined();
    expect(wineRec.items[0].suggestedVarietal).toBeDefined();
    // Merlot, Malbec, or Nebbiolo expected next
    expect(['Merlot', 'Malbec', 'Nebbiolo']).toContain(wineRec.items[0].suggestedVarietal);
  });

  it('does NOT suggest a varietal already owned', () => {
    const wines = [
      makeWine({ varietal: 'Cabernet Sauvignon' }),
      makeWine({ id: 'w2', varietal: 'Merlot' }),
      makeWine({ id: 'w3', varietal: 'Malbec' }),
    ];
    const result = generateGrowExpandRecommendations({
      wines,
      activeModules: { winekeeper: true },
    });
    for (const rec of result.filter((r) => r.moduleKey === 'wine')) {
      const suggested = rec.items[0].suggestedVarietal;
      expect(['Cabernet Sauvignon', 'Merlot', 'Malbec']).not.toContain(suggested);
    }
  });

  it('wine suggestions have required structure fields', () => {
    const wines = [makeWine()];
    const result = generateGrowExpandRecommendations({
      wines,
      activeModules: { winekeeper: true },
    });
    for (const rec of result.filter((r) => r.moduleKey === 'wine')) {
      expect(rec).toHaveProperty('id');
      expect(rec).toHaveProperty('goal');
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('summary');
      expect(rec).toHaveProperty('items');
      expect(rec.category).toBe(CATEGORY.GROW_EXPAND);
      expect(rec.items[0]).toHaveProperty('ownershipStatus', 'wishlist');
      expect(rec.items[0]).toHaveProperty('itemType', 'wine');
    }
  });

  it('wineonly mode allows single wine collection to generate suggestions', () => {
    const wines = [makeWine()];
    const result = generateGrowExpandRecommendations({
      wines,
      activeModules: { winekeeper: true, pipekeeper: false, whiskeykeeper: false, cigarkeeper: false },
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].moduleKey).toBe('wine');
  });
});
