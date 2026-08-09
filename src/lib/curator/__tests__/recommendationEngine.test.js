import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '../recommendationEngine.js';

describe('generateRecommendations — whiskey trust-flow hardening', () => {
  it('does not flag depleted bottles already tracked for restock by name/category state', () => {
    const recs = generateRecommendations({
      activeModules: { whiskeykeeper: true, pipekeeper: false, cigarkeeper: false, winekeeper: false },
      bottles: [
        {
          id: 'b1',
          name: 'Lagavulin 16',
          type: 'Islay Single Malt',
          region: 'Islay',
          age: 16,
          abv: 43,
          remaining_pours: 0,
        },
      ],
      acquisitionItems: [
        { id: 'a1', name: 'Lagavulin 16', status: 'active', category: 'restock' },
      ],
    });

    expect(recs.some((r) => r.goal === 'whiskey_depleted_bottles')).toBe(false);
  });

  it('still flags depleted bottles when no tracked restock match exists', () => {
    const recs = generateRecommendations({
      activeModules: { whiskeykeeper: true, pipekeeper: false, cigarkeeper: false, winekeeper: false },
      bottles: [
        {
          id: 'b1',
          name: 'Lagavulin 16',
          type: 'Islay Single Malt',
          region: 'Islay',
          age: 16,
          abv: 43,
          remaining_pours: 0,
        },
      ],
      acquisitionItems: [],
    });

    expect(recs.some((r) => r.goal === 'whiskey_depleted_bottles')).toBe(true);
  });
});

describe('generateRecommendations — wine record optimization', () => {
  const baseWineContext = (overrides = {}) => ({
    activeModules: { winekeeper: true, pipekeeper: false, whiskeykeeper: false, cigarkeeper: false },
    wines: [],
    bottles: [],
    pipes: [],
    blends: [],
    smokingLogs: [],
    tastingLogs: [],
    ...overrides,
  });

  it('generates wine_missing_core_metadata when wines lack producer/vintage/style', () => {
    const recs = generateRecommendations(baseWineContext({
      wines: [
        { id: 'w1', name: 'Test Wine' },
        { id: 'w2', name: 'Another Wine', producer: 'Chateau X' },
      ],
    }));

    expect(recs.some((r) => r.goal === 'wine_missing_core_metadata')).toBe(true);
    const rec = recs.find((r) => r.goal === 'wine_missing_core_metadata');
    expect(rec.moduleKey).toBe('wine');
  });

  it('generates wine_missing_drinking_window when wines have no drink_from/drink_by', () => {
    const recs = generateRecommendations(baseWineContext({
      wines: [
        { id: 'w1', name: 'Ready Wine', producer: 'P', vintage: 2018, style: 'Red', varietal: 'Cab', region: 'Napa', country: 'USA', quantity: 6 },
      ],
    }));

    expect(recs.some((r) => r.goal === 'wine_missing_drinking_window')).toBe(true);
  });

  it('generates wine_missing_valuation when wines have no pricing data', () => {
    const recs = generateRecommendations(baseWineContext({
      wines: [
        { id: 'w1', name: 'Unvalued Wine', producer: 'P', vintage: 2019, style: 'Red', varietal: 'Merlot', region: 'Bordeaux', country: 'France', quantity: 3 },
      ],
    }));

    expect(recs.some((r) => r.goal === 'wine_missing_valuation')).toBe(true);
  });

  it('generates wine_stale_valuation when wines have outdated valuation', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);

    const recs = generateRecommendations(baseWineContext({
      wines: [
        {
          id: 'w1',
          name: 'Stale Wine',
          market_estimated_unit_value: 80,
          valuation_confidence: 'high',
          valuation_updated_at: oldDate.toISOString(),
        },
      ],
    }));

    expect(recs.some((r) => r.goal === 'wine_stale_valuation')).toBe(true);
  });

  it('does not generate wine_stale_valuation when valuation override is manual', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);

    const recs = generateRecommendations(baseWineContext({
      wines: [
        {
          id: 'w1',
          name: 'Manual Wine',
          market_estimated_unit_value: 100,
          manual_valuation_enabled: true,
          valuation_updated_at: oldDate.toISOString(),
        },
      ],
    }));

    // manual override should not generate stale/missing issues
    expect(recs.some((r) => r.goal === 'wine_stale_valuation')).toBe(false);
    expect(recs.some((r) => r.goal === 'wine_missing_valuation')).toBe(false);
  });

  it('does not generate wine issues when winekeeper module is disabled', () => {
    const recs = generateRecommendations({
      activeModules: { winekeeper: false, pipekeeper: false, whiskeykeeper: false, cigarkeeper: false },
      wines: [{ id: 'w1', name: 'Hidden Wine' }],
      bottles: [], pipes: [], blends: [], smokingLogs: [], tastingLogs: [],
    });

    const wineGoals = ['wine_missing_core_metadata', 'wine_missing_drinking_window', 'wine_missing_valuation', 'wine_stale_valuation', 'wine_missing_rarity', 'wine_missing_tasting_notes'];
    expect(recs.some((r) => wineGoals.includes(r.goal))).toBe(false);
  });

  it('all wine recommendations have moduleKey = wine', () => {
    const recs = generateRecommendations(baseWineContext({
      wines: [
        { id: 'w1', name: 'Wine A' },
        { id: 'w2', name: 'Wine B' },
        { id: 'w3', name: 'Wine C' },
      ],
    }));

    const wineGoals = ['wine_missing_core_metadata', 'wine_missing_drinking_window', 'wine_missing_valuation', 'wine_stale_valuation', 'wine_missing_rarity', 'wine_missing_tasting_notes'];
    recs
      .filter((r) => wineGoals.includes(r.goal))
      .forEach((r) => {
        expect(r.moduleKey).toBe('wine');
      });
  });

  describe('generateRecommendations — canonical tobacco classification guardrails', () => {
      it('does not infer Virginia/Perique from Navy Flake name alone', () => {
        const recs = generateRecommendations({
          activeModules: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
          blends: [
            { id: 'b1', name: 'Navy Flake', blend_type: '', tobacco_components: ['Virginia', 'Burley'] },
          ],
          pipes: [],
          bottles: [],
          cigars: [],
          smokingLogs: [],
          tastingLogs: [],
        });

        const rec = recs.find((r) => r.goal === 'blend_missing_type');
        const item = rec?.items?.find((i) => i.id === 'b1');
        // Catalog now maps Navy Flake to Virginia (not VaPer); whatever it
        // suggests, Virginia/Perique must never be the outcome.
        expect(item?.proposedChange?.payload?.blend_type).not.toBe('Virginia/Perique');
      });

      it('does not override explicit non-aromatic evidence with aromatic catalog labels', () => {
        const recs = generateRecommendations({
          activeModules: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
          blends: [
            { id: 'b2', name: 'Autumn Evening', blend_type: '', is_aromatic: false },
          ],
          pipes: [],
          bottles: [],
          cigars: [],
          smokingLogs: [],
          tastingLogs: [],
        });

        const rec = recs.find((r) => r.goal === 'blend_missing_type');
        const item = rec?.items?.find((i) => i.id === 'b2');
        expect(item?.proposedChange?.payload?.blend_type).toBeUndefined();
      });

      it('Autumn Evening catalog entry is Aromatic, not Virginia/Perique', () => {
        // The catalog must not classify Autumn Evening (Virginia + Black Cavendish
        // aromatic blend) as Virginia/Perique.
        const recs = generateRecommendations({
          activeModules: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
          blends: [
            // blend_type is blank — tests the catalog lookup path
            { id: 'ae1', name: 'Autumn Evening', blend_type: '', is_aromatic: true },
          ],
          pipes: [],
          bottles: [],
          cigars: [],
          smokingLogs: [],
          tastingLogs: [],
        });

        const rec = recs.find((r) => r.goal === 'blend_missing_type');
        const item = rec?.items?.find((i) => i.id === 'ae1');
        // Should NOT suggest Virginia/Perique
        expect(item?.proposedChange?.payload?.blend_type).not.toBe('Virginia/Perique');
      });

      it('Navy Flake catalog entry is Virginia, not Virginia/Perique', () => {
        // Navy Flake has no confirmed Perique component; the catalog must not
        // classify it as VaPer.
        const recs = generateRecommendations({
          activeModules: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
          blends: [
            { id: 'nf1', name: 'Navy Flake', blend_type: '', tobacco_components: ['Virginia', 'Burley'] },
          ],
          pipes: [],
          bottles: [],
          cigars: [],
          smokingLogs: [],
          tastingLogs: [],
        });

        const rec = recs.find((r) => r.goal === 'blend_missing_type');
        const item = rec?.items?.find((i) => i.id === 'nf1');
        expect(item?.proposedChange?.payload?.blend_type).not.toBe('Virginia/Perique');
      });

      it('reclassification path cannot suggest VaPer without confirmed Virginia + Perique', () => {
        // A blend currently classified as 'English' named 'Autumn Evening' should
        // not be reclassified to 'Virginia/Perique' via the catalog. Autumn Evening
        // is now catalogued as Aromatic, but because is_aromatic is false on this
        // record the canonical guard must block even that — so no blend_type change
        // should be proposed at all.
        const recs = generateRecommendations({
          activeModules: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
          blends: [
            // has a blend_type already set — exercises the reclassification path
            { id: 're1', name: 'Autumn Evening', blend_type: 'English', is_aromatic: false },
          ],
          pipes: [],
          bottles: [],
          cigars: [],
          smokingLogs: [],
          tastingLogs: [],
        });

        const rec = recs.find((r) => r.goal === 'blend_reclassification');
        const item = rec?.items?.find((i) => i.id === 're1');
        // The canonical guard blocks Aromatic (is_aromatic: false) and the catalog
        // no longer carries VaPer for this blend — so no blend_type should be proposed.
        expect(item?.proposedChange?.payload?.blend_type).toBeUndefined();
      });

      it('Perique alone in tobacco_components does not imply VaPer', () => {
        const recs = generateRecommendations({
          activeModules: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
          blends: [
            { id: 'per1', name: 'Some Blend', blend_type: '', tobacco_components: ['Perique'] },
          ],
          pipes: [],
          bottles: [],
          cigars: [],
          smokingLogs: [],
          tastingLogs: [],
        });

        const rec = recs.find((r) => r.goal === 'blend_missing_type');
        const item = rec?.items?.find((i) => i.id === 'per1');
        expect(item?.proposedChange?.payload?.blend_type).not.toBe('Virginia/Perique');
      });
  });
});
