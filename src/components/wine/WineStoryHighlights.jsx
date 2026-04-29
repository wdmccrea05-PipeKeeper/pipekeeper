import React, { useMemo } from 'react';
import { getWinePrimaryImage, getWineTotalValue } from '@/lib/collection/wineSelectors';
import HeroHighlightCard from '@/components/shared/HeroHighlightCard';

/**
 * WineStoryHighlights — visual hero cards for wine collection story.
 * Uses HeroHighlightCard with objectMode="cover" for premium full-card image presentation.
 */
export default function WineStoryHighlights({ wines = [], tastings = [], t = (k) => k, onNavigate }) {
  const highlights = useMemo(() => {
    const cards = [];

    // Most valuable wine
    const mostValuable = wines.length > 0
      ? [...wines]
          .map((w) => ({ ...w, value: getWineTotalValue(w) }))
          .sort((a, b) => b.value - a.value)
          .find((w) => w.value > 0)
      : null;
    if (mostValuable) {
      cards.push({
        key: 'most-valuable',
        title: 'Most Valuable',
        value: mostValuable.name,
        subtitle: mostValuable.producer ? `${mostValuable.producer}${mostValuable.vintage ? ` · ${mostValuable.vintage}` : ''}` : mostValuable.vintage || '',
        photo: getWinePrimaryImage(mostValuable),
        accent: '#8B4B6B',
      });
    }

    // Highest rated wine
    const highestRated = wines.length > 0
      ? [...wines]
          .filter((w) => Number(w.rating || 0) > 0)
          .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0]
      : null;
    if (highestRated) {
      cards.push({
        key: 'highest-rated',
        title: 'Top Rated',
        value: highestRated.name,
        subtitle: `${Number(highestRated.rating || 0).toFixed(1)}/5 ${highestRated.vintage ? `· ${highestRated.vintage}` : ''}`.trim(),
        photo: getWinePrimaryImage(highestRated),
        accent: '#A0567A',
      });
    }

    // Ready to drink
    const readyToDrink = wines.find((w) => {
      const start = w.drink_window_start || w.drinking_window_start;
      const end = w.drink_window_end || w.drinking_window_end;
      if (!start || !end) return false;
      const now = new Date();
      return now >= new Date(start) && now <= new Date(end);
    });
    if (readyToDrink) {
      cards.push({
        key: 'ready-to-drink',
        title: 'Drink Now',
        value: readyToDrink.name,
        subtitle: `${readyToDrink.producer || ''}${readyToDrink.vintage ? ` · ${readyToDrink.vintage}` : ''}`.trim(),
        photo: getWinePrimaryImage(readyToDrink),
        accent: '#2E7D5C',
      });
    }

    // Recent tasting
    const recentTasting = tastings.length > 0
      ? tastings.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0]
      : null;
    if (recentTasting) {
      const linkedWine = wines.find((w) => w.id === recentTasting.wine_id);
      cards.push({
        key: 'recent-tasting',
        title: 'Recent Tasting',
        value: recentTasting.wine_name || 'Wine Tasting',
        subtitle: recentTasting.rating ? `${Number(recentTasting.rating).toFixed(1)}/5 · ${new Date(recentTasting.date).toLocaleDateString()}` : new Date(recentTasting.date).toLocaleDateString(),
        photo: linkedWine ? getWinePrimaryImage(linkedWine) : null,
        accent: '#D47C7C',
      });
    }

    return cards;
  }, [wines, tastings]);

  if (highlights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {highlights.map((h) => (
        <HeroHighlightCard
          key={h.key}
          title={h.title}
          value={h.value}
          subtitle={h.subtitle}
          photo={h.photo}
          accent={h.accent}
          objectMode="cover"
          onClick={() => onNavigate && onNavigate(h.key)}
        />
      ))}
    </div>
  );
}