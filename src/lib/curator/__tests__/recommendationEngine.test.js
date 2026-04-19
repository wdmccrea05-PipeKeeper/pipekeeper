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

