import { describe, it, expect } from 'vitest';
import { generatePurchaseRestockRecommendations } from '../purchaseRestockEngine.js';
import { MODULE_KEY } from '../recommendationSchema.js';

describe('generatePurchaseRestockRecommendations — cigar parity', () => {
  it('creates cigar low-stock restock recommendations for favorite cigars', () => {
    const recs = generatePurchaseRestockRecommendations({
      cigars: [
        { id: 'c1', name: 'Liga Privada', singles_equivalent: 2, rating: 5 },
      ],
      cigarSessions: [{ cigar_id: 'c1' }, { cigar_id: 'c1' }],
      activeModules: { cigarkeeper: true },
    });

    const cigarRec = recs.find((r) => r.goal === 'low_stock_cigars');
    expect(cigarRec).toBeTruthy();
    expect(cigarRec.moduleKey).toBe(MODULE_KEY.CIGAR);
  });

  it('excludes ai_excluded and not_for_me cigars from restock recommendations', () => {
    const recs = generatePurchaseRestockRecommendations({
      cigars: [
        { id: 'c1', name: 'Excluded Stick', singles_equivalent: 1, rating: 5, ai_excluded: true },
        { id: 'c2', name: 'Not For Me Stick', singles_equivalent: 1, rating: 5, not_for_me: true },
      ],
      activeModules: { cigarkeeper: true },
    });

    expect(recs.some((r) => r.goal === 'low_stock_cigars' || r.goal === 'depleted_cigars')).toBe(false);
  });

  it('does not create cigar restock recommendations when cigar module is disabled', () => {
    const recs = generatePurchaseRestockRecommendations({
      cigars: [{ id: 'c1', name: 'Cigar', singles_equivalent: 1, rating: 5 }],
      activeModules: { cigarkeeper: false },
    });

    expect(recs.some((r) => r.moduleKey === MODULE_KEY.CIGAR)).toBe(false);
  });
});

