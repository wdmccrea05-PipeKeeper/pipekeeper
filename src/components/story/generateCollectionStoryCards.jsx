/**
 * generateCollectionStoryCards
 *
 * Converts an enriched CollectionStory object (from the generateCollectionStory
 * backend function, after enrichHighlights()) into an array of slide cards
 * for use with CollectionStoryViewer.
 *
 * API: generateCollectionStoryCards(story) -> card[]
 *
 * This is separate from generateStoryCards (PipeKeeper insights page) which
 * takes raw collection arrays. Do not merge them — different data shapes.
 */

import { Star, Leaf, TrendingUp, Award, Sparkles, BarChart3, Heart, Flame, Droplets } from 'lucide-react';

/**
 * @param {Object} story - enriched story object with .highlights, .metrics, .narrative
 * @param {Function} [formatCurrency] - optional formatter, defaults to $x,xxx
 * @param {Array} [enabledModules] - optional list of enabled module keys (e.g. ['pipekeeper', 'whiskeykeeper'])
 * @returns {Array} card objects compatible with CollectionStoryViewer / StoryCard
 */
export function generateCollectionStoryCards(story, formatCurrency, enabledModules = []) {
  if (!story) return [];

  const h = story.highlights || {};
  const m = story.metrics || {};
  const fmt = formatCurrency || ((v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

  // If no modules specified, include all by default
  const hasWhiskey = enabledModules.length === 0 || enabledModules.includes('whiskeykeeper');
  const hasPipe = enabledModules.length === 0 || enabledModules.includes('pipekeeper');
  const hasCigar = enabledModules.length === 0 || enabledModules.includes('cigarkeeper');
  const isCombined = (hasWhiskey ? 1 : 0) + (hasPipe ? 1 : 0) + (hasCigar ? 1 : 0) >= 2;

  const cards = [];

  // 1. Opening snapshot — module-aware
  const moduleNames = [hasPipe && 'pipes', hasWhiskey && 'whiskey', hasCigar && 'cigars'].filter(Boolean);
  const openingLabel = isCombined ? 'Collection Snapshot' : hasPipe ? 'Pipe & Tobacco Snapshot' : hasCigar ? 'Cigar Snapshot' : 'Whiskey Snapshot';
  const openingSubtitle = isCombined
    ? `A curated collection across ${moduleNames.join(', ')}.`
    : hasPipe
      ? 'A curated pipe and tobacco collection.'
      : hasCigar
        ? 'A curated cigar collection.'
        : 'A curated whiskey collection.';

  cards.push({
    title: openingLabel,
    value: "Your Collector's Story",
    sub: story.narrative
      ? story.narrative.slice(0, 120) + (story.narrative.length > 120 ? '…' : '')
      : openingSubtitle,
    accent: '#D4A574',
    icon: Sparkles,
    bgImage: null,
    silhouetteType: 'pipe',
  });

  // 2. Most used pipe
  if (hasPipe && h.mostUsedPipe) {
    const record = h.mostUsedPipe._record || null;
    const photo = record?.photos?.[0] || record?.photo || record?.image || null;
    cards.push({
      title: h.mostUsedPipe.name,
      value: h.mostUsedPipe.name,
      sub: `Most used pipe${h.mostUsedPipe.bowls ? ` · ${h.mostUsedPipe.bowls} bowls` : ''}`,
      accent: '#C87941',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Most Used Pipe',
    });
  }

  // 3. Favourite blend
  if (hasPipe && h.favoriteBlend) {
    const record = h.favoriteBlend._record || null;
    const photo = record?.logo || record?.photo || record?.photos?.[0] || null;
    cards.push({
      title: h.favoriteBlend.name,
      value: h.favoriteBlend.name,
      sub: `Favourite blend${h.favoriteBlend.bowls ? ` · ${h.favoriteBlend.bowls} bowls` : ''}`,
      accent: '#4A9C6A',
      icon: Leaf,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'leaf',
      label: 'Top Blend',
    });
  }

  // 4. Most tasted bottle
  if (hasWhiskey && h.mostTastedBottle) {
    const record = h.mostTastedBottle._record || null;
    const photo = record?.photo || record?.image || record?.photos?.[0] || null;
    cards.push({
      title: h.mostTastedBottle.name,
      value: h.mostTastedBottle.name,
      sub: `Most tasted bottle${h.mostTastedBottle.tastings ? ` · ${h.mostTastedBottle.tastings} tastings` : ''}`,
      accent: '#C4963A',
      icon: Droplets,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Most Tasted',
    });
  }

  // 4b. Most smoked cigar
  if (hasCigar && h.mostSmokedCigar) {
    const record = h.mostSmokedCigar._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.mostSmokedCigar.name,
      value: h.mostSmokedCigar.name,
      sub: `Most smoked cigar${h.mostSmokedCigar.sessions ? ` · ${h.mostSmokedCigar.sessions} sessions` : ''}`,
      accent: '#C89752',
      icon: Flame,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Most Smoked Cigar',
    });
  }

  // 4c. Favorite cigar
  if (hasCigar && h.favoriteCigar) {
    const record = h.favoriteCigar._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.favoriteCigar.name,
      value: h.favoriteCigar.name,
      sub: `Favourite cigar${h.favoriteCigar.rating ? ` · ${h.favoriteCigar.rating}★` : ''}`,
      accent: '#A0784A',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Favorite Cigar',
    });
  }

  // 5. Crown jewel (most valuable item)
  if (h.mostValuableItem) {
    const record = h.mostValuableItem._record || null;
    const rt = h.mostValuableItem.recordType || 'bottle';
    const isWhiskeyItem = rt === 'bottle';
    const isPipeItem = rt === 'pipe' || rt === 'blend';
    const isCigarItem = rt === 'cigar';
    if ((isWhiskeyItem && !hasWhiskey) || (isPipeItem && !hasPipe) || (isCigarItem && !hasCigar)) {
      // Skip this item if its module is disabled
    } else {
    const photo =
      rt === 'pipe'
        ? record?.photos?.[0] || record?.photo || null
        : rt === 'blend'
          ? record?.logo || record?.photo || null
          : rt === 'cigar'
            ? record?.photos?.[0] || record?.photo || null
            : record?.photo || record?.image || null;
    cards.push({
      title: h.mostValuableItem.name,
      value: h.mostValuableItem.name,
      sub: h.mostValuableItem.value ? `Valued at ${fmt(h.mostValuableItem.value)}` : 'Crown jewel of your collection',
      accent: '#D4AF37',
      icon: Award,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: 'Crown Jewel',
    });
    }
    }

  // 6. Collection by the numbers
  const pipeCount = hasPipe ? (m.pipes || 0) + (m.blends || 0) : 0;
  const bottleCount = hasWhiskey ? (m.totalBottles || 0) : 0;
  const cigarCount = hasCigar ? (m.cigarTypes || m.cigars || 0) : 0;
  const hasCounts = pipeCount + bottleCount + cigarCount > 0;
  if (hasCounts) {
    const parts = [];
    if (hasPipe && m.pipes) parts.push(`${m.pipes} pipe${m.pipes !== 1 ? 's' : ''}`);
    if (hasPipe && m.blends) parts.push(`${m.blends} blend${m.blends !== 1 ? 's' : ''}`);
    if (hasWhiskey && m.totalBottles) parts.push(`${m.totalBottles} bottle${m.totalBottles !== 1 ? 's' : ''}`);
    if (hasCigar && (m.cigarTypes || m.cigars)) {
      const ct = m.cigarTypes || m.cigars;
      parts.push(`${ct} cigar type${ct !== 1 ? 's' : ''}`);
    }
    if (hasCigar && (m.totalCigarSticks || m.cigarSticks)) {
      const cs = m.totalCigarSticks || m.cigarSticks;
      parts.push(`${cs} stick${cs !== 1 ? 's' : ''}`);
    }
    const countLabel = isCombined ? 'By the Numbers' : hasPipe ? 'Collection Count' : hasCigar ? 'Cigar Count' : 'Bottle Count';
    cards.push({
      title: countLabel,
      value: parts[0] || 'Your Collection',
      sub: parts.slice(1).join(' · ') || 'A growing collection',
      accent: '#22D3EE',
      icon: BarChart3,
      bgImage: null,
      silhouetteType: 'pipe',
    });
  }

  // 7. Total value
  const totalValue = Number(m.totalValue || 0);
  if (totalValue > 0) {
    cards.push({
      title: 'Collection Value',
      value: fmt(totalValue),
      sub: 'Estimated total collection value',
      accent: '#10B981',
      icon: TrendingUp,
      bgImage: null,
      silhouetteType: 'leaf',
    });
  }

  // 8. Sessions / tastings / cigar sessions
  const sessions = hasPipe ? Number(m.sessions || 0) : 0;
  const tastings = hasWhiskey ? Number(m.tastings || 0) : 0;
  const cigarSessions = hasCigar ? Number(m.cigarSessions || 0) : 0;
  if (sessions + tastings + cigarSessions > 0) {
    const desc = [
      sessions > 0 ? `${sessions} smoke${sessions !== 1 ? 's' : ''}` : null,
      tastings > 0 ? `${tastings} tasting${tastings !== 1 ? 's' : ''}` : null,
      cigarSessions > 0 ? `${cigarSessions} cigar session${cigarSessions !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');
    const expLabel = isCombined ? 'Experiences Logged' : hasPipe ? 'Smoking Sessions' : hasCigar ? 'Cigar Sessions' : 'Tastings Logged';
    cards.push({
      title: expLabel,
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

  return cards.map((c, i) => ({ ...c, index: i + 1, total: cards.length }));
}