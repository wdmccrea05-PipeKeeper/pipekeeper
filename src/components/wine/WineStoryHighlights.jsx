import React, { useMemo } from 'react';
import { getWinePrimaryImage, getWineTotalValue, selectWineReadyToDrinkCount } from '@/lib/collection/wineSelectors';

/**
 * WineStoryHighlights — visual hero cards for wine collection story.
 * Matches WhiskeyKeeper/PipeKeeper hero highlight card styling (aspect-[3/2], background images).
 */
export default function WineStoryHighlights({ wines = [], tastings = [], t = (k) => k }) {
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
        <div
          key={h.key}
          className="relative rounded-2xl overflow-hidden aspect-[3/2] group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          style={{
            border: `1px solid ${h.accent}44`,
            boxShadow: '0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
            backgroundImage: h.photo
              ? `url('${h.photo}')`
              : `linear-gradient(135deg, rgba(42,28,18,0.97) 0%, rgba(28,18,12,0.99) 100%)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Accent radial + vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 30% 10%, ${h.accent}28 0%, transparent 52%),
                          linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.82) 100%)`,
            }}
          />

          {/* Edge vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.38) 100%)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
            }}
          />

          {/* Bottom-anchored text content */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">
            <p
              className="text-[10px] sm:text-xs uppercase tracking-[0.1em] font-bold mb-1.5 drop-shadow-lg leading-tight"
              style={{ color: h.accent }}
            >
              {h.title}
            </p>
            <p
              className="text-lg sm:text-xl font-bold leading-tight line-clamp-2 drop-shadow-lg"
              style={{
                color: '#F5F1E7',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                fontFamily: "'Georgia', serif",
              }}
            >
              {h.value}
            </p>
            {h.subtitle && (
              <p
                className="text-xs mt-1.5 drop-shadow-md"
                style={{
                  color: 'rgba(224,216,200,0.78)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                {h.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}