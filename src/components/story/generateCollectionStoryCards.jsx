/**
 * Generate story cards from a CollectionStory (hub) for use in StoryViewer
 * Same format as generateStoryCards (PipeKeeper), using the StoryCard layout
 */

import { Star, Leaf, TrendingUp, Award, Sparkles, BarChart3, Heart, Flame, Droplets } from 'lucide-react';

function resolvePhoto(record, recordType) {
  if (!record) return null;
  if (recordType === 'pipe') return record.photos?.[0] || record.photo || null;
  if (recordType === 'blend') return record.logo || record.photo || record.photos?.[0] || null;
  if (recordType === 'bottle') return record.photo || record.photos?.[0] || record.image || null;
  return null;
}

/**
 * @param {Object} story - enriched story from CollectionStoryCard (has .highlights, .metrics, .narrative)
 * @param {Function} formatCurrency
 * @returns Array of card objects compatible with StoryCard / StoryViewer
 */
export function generateCollectionStoryCards(story, formatCurrency) {
  if (!story) return [];

  const cards = [];
  const h = story.highlights || {};
  const m = story.metrics || {};

  const fmt = formatCurrency || ((v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

  // 1. Opening — Collection Snapshot
  cards.push({
    title: 'Collection Snapshot',
    value: "Your Collector's Story",
    sub: story.narrative
      ? story.narrative.slice(0, 120) + (story.narrative.length > 120 ? '…' : '')
      : 'A curated collection across pipes, tobacco & whiskey.',
    accent: '#D4A574',
    icon: Sparkles,
    bgImage: null,
    silhouetteType: 'pipe',
  });

  // 2. Most Used Pipe
  if (h.mostUsedPipe) {
    const photo = resolvePhoto(h.mostUsedPipe._record, 'pipe');
    cards.push({
      title: h.mostUsedPipe.name,
      value: h.mostUsedPipe.name,
      sub: `Most used pipe · ${h.mostUsedPipe.bowls ? `${h.mostUsedPipe.bowls} bowls` : 'your go-to'}`,
      accent: '#C87941',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Most Used Pipe',
    });
  }

  // 3. Top Blend
  if (h.favoriteBlend) {
    const photo = resolvePhoto(h.favoriteBlend._record, 'blend');
    cards.push({
      title: h.favoriteBlend.name,
      value: h.favoriteBlend.name,
      sub: `Favourite blend · ${h.favoriteBlend.bowls ? `${h.favoriteBlend.bowls} bowls` : 'a collection staple'}`,
      accent: '#4A9C6A',
      icon: Leaf,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'leaf',
      label: 'Top Blend',
    });
  }

  // 4. Most Tasted Bottle
  if (h.mostTastedBottle) {
    const photo = resolvePhoto(h.mostTastedBottle._record, 'bottle');
    cards.push({
      title: h.mostTastedBottle.name,
      value: h.mostTastedBottle.name,
      sub: `Most tasted bottle · ${h.mostTastedBottle.tastings ? `${h.mostTastedBottle.tastings} tastings` : 'a favourite pour'}`,
      accent: '#C4963A',
      icon: Droplets,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Most Tasted',
    });
  }

  // 5. Crown Jewel (most valuable)
  if (h.mostValuableItem) {
    const photo = resolvePhoto(h.mostValuableItem._record, h.mostValuableItem.recordType || 'bottle');
    cards.push({
      title: h.mostValuableItem.name,
      value: h.mostValuableItem.name,
      sub: h.mostValuableItem.value
        ? `Valued at ${fmt(h.mostValuableItem.value)}`
        : 'The crown jewel of your collection',
      accent: '#D4AF37',
      icon: Award,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Crown Jewel',
    });
  }

  // 6. Collection by the numbers
  const hasCounts = (m.pipes || 0) + (m.blends || 0) + (m.totalBottles || 0) > 0;
  if (hasCounts) {
    const parts = [];
    if (m.pipes) parts.push(`${m.pipes} pipe${m.pipes !== 1 ? 's' : ''}`);
    if (m.blends) parts.push(`${m.blends} blend${m.blends !== 1 ? 's' : ''}`);
    if (m.totalBottles) parts.push(`${m.totalBottles} bottle${m.totalBottles !== 1 ? 's' : ''}`);

    cards.push({
      title: 'By the Numbers',
      value: parts.length > 0 ? parts[0] : 'Your Collection',
      sub: parts.slice(1).join(' · ') || 'A growing collection',
      accent: '#22D3EE',
      icon: BarChart3,
      bgImage: null,
      silhouetteType: 'pipe',
    });
  }

  // 7. Collection value
  const totalValue = Number(m.totalValue || 0);
  if (totalValue > 0) {
    cards.push({
      title: 'Collection Value',
      value: totalValue >= 1000
        ? `$${(totalValue / 1000).toFixed(1)}k`
        : fmt(totalValue),
      sub: 'Estimated total collection value',
      accent: '#10B981',
      icon: TrendingUp,
      bgImage: null,
      silhouetteType: 'leaf',
    });
  }

  // 8. Sessions / tastings
  const sessions = Number(m.sessions || 0);
  const tastings = Number(m.tastings || 0);
  if (sessions > 0 || tastings > 0) {
    const desc = [
      sessions > 0 ? `${sessions} session${sessions !== 1 ? 's' : ''}` : null,
      tastings > 0 ? `${tastings} tasting${tastings !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    cards.push({
      title: 'Experiences Logged',
      value: sessions + tastings,
      sub: desc,
      accent: '#8B5CF6',
      icon: Flame,
      bgImage: null,
      silhouetteType: 'pipe',
    });
  }

  // 9. Closing card
  cards.push({
    title: 'CollectionKeeper',
    value: 'CollectionKeeper',
    sub: 'Track. Organize. Enjoy.',
    accent: '#F59E0B',
    icon: Heart,
    bgImage: null,
    silhouetteType: 'pipe',
    isClosingCard: true,
  });

  // Attach index / total for StoryCard display
  return cards.map((c, i) => ({ ...c, index: i + 1, total: cards.length }));
}