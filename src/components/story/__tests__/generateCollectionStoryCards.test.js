import { describe, it, expect } from 'vitest';
import { generateCollectionStoryCards } from '../generateCollectionStoryCards.jsx';

describe('generateCollectionStoryCards', () => {
  it('counts cigar sessions in the experiences card value', () => {
    const story = {
      metrics: { sessions: 2, tastings: 1, cigarSessions: 3 },
      highlights: {},
    };

    const cards = generateCollectionStoryCards(story);
    const experiences = cards.find((c) => c.title === 'Experiences Logged');
    expect(experiences).toBeTruthy();
    expect(experiences.value).toBe(6);
  });

  it('includes top-rated and highest-value cigar cards when cigar highlights exist', () => {
    const story = {
      metrics: { cigars: 4, cigarSticks: 20 },
      highlights: {
        topRatedCigar: { id: 'c1', name: 'Fuente Opus X', rating: 5, _record: { photos: ['x.jpg'] } },
        highestValueCigar: { id: 'c2', name: 'Behike 56', value: 1200, _record: { photos: ['y.jpg'] } },
      },
    };

    const cards = generateCollectionStoryCards(story, undefined, ['cigarkeeper']);
    expect(cards.some((c) => c.label === 'Top Rated Cigar')).toBe(true);
    expect(cards.some((c) => c.label === 'Cigar Crown Jewel')).toBe(true);
  });

  it('does not force cigar cards when cigar data is sparse', () => {
    const story = {
      metrics: { pipes: 2, blends: 3, sessions: 4 },
      highlights: { mostUsedPipe: { id: 'p1', name: 'Dublin' } },
    };

    const cards = generateCollectionStoryCards(story, undefined, ['pipekeeper']);
    expect(cards.some((c) => String(c.label || '').toLowerCase().includes('cigar'))).toBe(false);
  });
});

