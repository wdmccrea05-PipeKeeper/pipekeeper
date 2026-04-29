import { describe, expect, it } from 'vitest';
import { buildHubHighlightCandidates } from '@/components/hub/highlightSelection';

const t = (key) => ({
  'hub.mostSmokedCigar': 'Most Smoked Cigar',
  'hub.topRatedCigar': 'Top Rated Cigar',
  'hub.favoriteCigar': 'Favorite Cigar',
  'hub.highestValueCigar': 'Highest Value Cigar',
  'hub.humidorFavorite': 'Humidor Favorite',
  'hub.readyInHumidor': 'Ready in your humidor',
  'hub.restockPriority': 'Restock Priority',
  'hub.sticksLeft': 'sticks left',
  'hub.cigarCrownJewel': 'Cigar Crown Jewel',
  'hub.collectionFavorite': 'Collection favorite',
  'hub.sessions': 'sessions',
})[key] ?? key;
const formatFromBase = (value) => `$${Number(value || 0).toFixed(0)}`;
const getPipeValue = (pipe) => Number(pipe?.value || 0);
const getBottleValue = (bottle) => Number(bottle?.value || 0);
const getWineTotalValue = (wine) => Number(wine?.__totalValue || wine?.estimated_total_value || 0);

describe('buildHubHighlightCandidates', () => {
  it('includes cigar highlight cards when cigar data is meaningful', () => {
    const cards = buildHubHighlightCandidates({
      pipekeeperOpenable: true,
      whiskeyOpenable: true,
      cigarOpenable: true,
      t,
      formatFromBase,
      getPipeValue,
      getBottleValue,
      metrics: {
        mostSmokedPipe: { id: 'p1', name: 'Pipe One', __count: 3, photos: [] },
        mostValuableBottle: { id: 'b1', name: 'Bottle One', value: 120, photos: [] },
        mostSmokedCigar: { id: 'c1', name: 'Cigar One', __count: 6, photos: ['x'] },
        topRatedCigar: { id: 'c2', name: 'Cigar Two', rating: 4.7, singles_equivalent: 4, photos: ['x'] },
        highestValueCigar: { id: 'c3', name: 'Cigar Three', __totalValue: 240, rating: 4.3, singles_equivalent: 5, photos: ['x'] },
        cigarCrownJewel: { id: 'c3', name: 'Cigar Three', __totalValue: 240, rating: 4.3, singles_equivalent: 5, photos: ['x'] },
      },
    });

    const cigarCards = cards.filter((card) => card.recordType === 'cigar');
    expect(cigarCards.length).toBeGreaterThan(0);
    expect(cigarCards.some((card) => card.title === 'Most Smoked Cigar')).toBe(true);
  });

  it('does not force sparse cigar cards into highlights', () => {
    const cards = buildHubHighlightCandidates({
      pipekeeperOpenable: true,
      whiskeyOpenable: true,
      cigarOpenable: true,
      t,
      formatFromBase,
      getPipeValue,
      getBottleValue,
      metrics: {
        mostSmokedPipe: { id: 'p1', name: 'Pipe One', __count: 4, photos: [] },
        favoriteBlend: { id: 'tb1', name: 'Blend One', __count: 3, logo: null, photo: null },
        mostValuableBottle: { id: 'b1', name: 'Bottle One', value: 90, photos: [] },
        topRatedCigar: { id: 'c2', name: 'Cigar Two', rating: 3.1, singles_equivalent: 0, photos: [] },
        restockPriorityCigar: { id: 'c4', name: 'Cigar Four', restock_flag: true, singles_equivalent: 0, photos: [] },
      },
    });

    expect(cards.some((card) => card.recordType === 'cigar')).toBe(false);
    expect(cards.some((card) => card.recordType === 'pipe')).toBe(true);
    expect(cards.some((card) => card.recordType === 'bottle')).toBe(true);
  });

  it('includes wine highlight cards with objectMode="cover" when wine data is present', () => {
    const wine = {
      id: 'wine1',
      name: 'Château Margaux',
      vintage: '2015',
      rating: 4.8,
      __totalValue: 1500,
      __primaryImage: 'https://example.com/margaux.jpg',
    };
    const ratedWine = {
      id: 'wine2',
      name: 'Opus One',
      vintage: '2018',
      rating: 4.6,
      __primaryImage: null,
    };
    const cards = buildHubHighlightCandidates({
      winekeeperOpenable: true,
      t,
      formatFromBase,
      getPipeValue,
      getBottleValue,
      getWineTotalValue,
      metrics: {
        mostValuableWine: wine,
        topRatedWine: ratedWine,
      },
    });

    const wineCards = cards.filter((card) => card.recordType === 'wine');
    expect(wineCards.length).toBeGreaterThan(0);
    wineCards.forEach((card) => {
      expect(card.objectMode).toBe('cover');
    });
  });

  it('wine highlight cards include the correct route and score', () => {
    const wine = { id: 'wine1', name: 'Penfolds Grange', __totalValue: 800, __primaryImage: null };
    const cards = buildHubHighlightCandidates({
      winekeeperOpenable: true,
      t,
      formatFromBase,
      getPipeValue,
      getBottleValue,
      getWineTotalValue,
      metrics: { mostValuableWine: wine },
    });

    const wineCard = cards.find((c) => c.recordType === 'wine');
    expect(wineCard).toBeTruthy();
    expect(wineCard.route).toContain('/WineDetail');
    expect(wineCard.score).toBeGreaterThan(0);
  });
});

