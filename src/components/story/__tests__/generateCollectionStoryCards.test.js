import { describe, it, expect } from 'vitest';
import { generateCollectionStoryCards } from '../generateCollectionStoryCards.jsx';
import { translate } from '@/components/i18n/safeTranslation';

describe('generateCollectionStoryCards', () => {
  it('counts cigar sessions in the experiences card value', () => {
    const story = {
      metrics: { sessions: 2, tastings: 1, cigarSessions: 3 },
      highlights: {},
    };

    const cards = generateCollectionStoryCards(story);
    const experiences = cards.find((c) => c.title === translate('hub.storyExperiencesLogged', {}, 'en'));
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
    expect(cards.some((c) => c.label === translate('hub.topRatedCigar', {}, 'en'))).toBe(true);
    expect(cards.some((c) => c.label === translate('hub.highestValueCigar', {}, 'en'))).toBe(true);
  });

  it('does not force cigar cards when cigar data is sparse', () => {
    const story = {
      metrics: { pipes: 2, blends: 3, sessions: 4 },
      highlights: { mostUsedPipe: { id: 'p1', name: 'Dublin' } },
    };

    const cards = generateCollectionStoryCards(story, undefined, ['pipekeeper']);
    expect(cards.some((c) => String(c.label || '').toLowerCase().includes('cigar'))).toBe(false);
  });

  it('uses localized collection story labels in japanese and german', () => {
    const story = {
      metrics: { wines: 4, wineBottles: 8, wineTastings: 3 },
      highlights: {
        mostValuableWine: { id: 'w1', name: 'Riesling GG', value: 180 },
        topRatedWine: { id: 'w2', name: 'Pinot Noir', rating: 5 },
      },
    };

    const jaCards = generateCollectionStoryCards(story, undefined, ['winekeeper'], (key, vars) => translate(key, vars, 'ja'));
    const deCards = generateCollectionStoryCards(story, undefined, ['winekeeper'], (key, vars) => translate(key, vars, 'de'));

    expect(jaCards.some((c) => c.label === translate('hub.topWine', {}, 'ja'))).toBe(true);
    expect(deCards.some((c) => c.label === translate('hub.topRatedWine', {}, 'de'))).toBe(true);
    expect(jaCards[0].title).toBe(translate('hub.storySnapshotWine', {}, 'ja'));
    expect(deCards[0].title).toBe(translate('hub.storySnapshotWine', {}, 'de'));
  });
});
