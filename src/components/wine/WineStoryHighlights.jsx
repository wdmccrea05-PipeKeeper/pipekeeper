import React, { useMemo } from 'react';
import { Star, Award, Droplets } from 'lucide-react';
import { getWinePrimaryImage, getWineTotalValue, selectWineReadyToDrinkCount } from '@/lib/collection/wineSelectors';

/**
 * WineStoryHighlights — visual cards for wine collection story.
 * Matches WhiskeyKeeper/CigarKeeper highlight card styling.
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
        icon: Award,
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
        icon: Star,
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
        icon: Droplets,
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
        icon: Star,
      });
    }

    return cards;
  }, [wines, tastings]);

  if (highlights.length === 0) return null;

  return (
    <div className="space-y-3">
      {highlights.map((h) => {
        const Icon = h.icon;
        return (
          <div
            key={h.key}
            className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(39,27,18,0.85), rgba(25,17,11,0.95))',
              border: `1px solid ${h.accent}40`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
            }}
          >
            <div className="flex gap-3 p-3">
              {/* Image or gradient */}
              <div
                className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{
                  background: h.photo
                    ? `url(${h.photo})`
                    : `linear-gradient(135deg, ${h.accent}33, ${h.accent}11)`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {!h.photo && (
                  <Icon className="w-7 h-7" style={{ color: h.accent }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-0.5" style={{ color: h.accent }}>
                  {h.title}
                </p>
                <p className="text-sm font-semibold text-[#F5F1E7] truncate">
                  {h.value}
                </p>
                {h.subtitle && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(224,216,200,0.6)' }}>
                    {h.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}