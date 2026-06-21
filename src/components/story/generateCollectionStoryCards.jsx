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

import { Star, Leaf, TrendingUp, Award, Sparkles, BarChart3, Heart, Flame, Droplets, Wine } from 'lucide-react';
import { formatCurrencyAmount } from '@/utils/currency';
import { translate } from '@/components/i18n/safeTranslation';

/**
 * @param {Object} story - enriched story object with .highlights, .metrics, .narrative
 * @param {Function} [formatCurrency] - optional formatter, defaults to $x,xxx
 * @param {Array} [enabledModules] - optional list of enabled module keys (e.g. ['pipekeeper', 'whiskeykeeper'])
 * @param {Function} [t] - optional translation helper
 * @returns {Array} card objects compatible with CollectionStoryViewer / StoryCard
 */
export function generateCollectionStoryCards(story, formatCurrency, enabledModules = [], t = null) {
  if (!story) return [];
  const tr = (key, vars = {}) => (typeof t === 'function' ? t(key, vars) : translate(key, vars, 'en'));

  const h = story.highlights || {};
  const m = story.metrics || {};
  const fmt = formatCurrency || ((v) => formatCurrencyAmount(Number(v || 0)));

  // If no modules specified, include all by default
  const hasWhiskey = enabledModules.length === 0 || enabledModules.includes('whiskeykeeper');
  const hasPipe = enabledModules.length === 0 || enabledModules.includes('pipekeeper');
  const hasCigar = enabledModules.length === 0 || enabledModules.includes('cigarkeeper');
  const hasWine = enabledModules.length === 0 || enabledModules.includes('winekeeper');
  const isCombined = (hasWhiskey ? 1 : 0) + (hasPipe ? 1 : 0) + (hasCigar ? 1 : 0) + (hasWine ? 1 : 0) >= 2;

  const cards = [];

  // 1. Opening snapshot — module-aware
  const moduleNames = [hasPipe && 'pipes', hasWhiskey && 'whiskey', hasCigar && 'cigars', hasWine && 'wine'].filter(Boolean);
  const openingLabel = isCombined
    ? tr('hub.storySnapshotCombined')
    : hasPipe
      ? tr('hub.storySnapshotPipe')
      : hasCigar
        ? tr('hub.storySnapshotCigar')
        : hasWine
          ? tr('hub.storySnapshotWine')
          : tr('hub.storySnapshotWhiskey');
  const openingSubtitle = isCombined
    ? tr('hub.storySubtitleCombined', { modules: moduleNames.join(', ') })
    : hasPipe
      ? tr('hub.storySubtitlePipe')
      : hasCigar
        ? tr('hub.storySubtitleCigar')
        : hasWine
          ? tr('hub.storySubtitleWine')
          : tr('hub.storySubtitleWhiskey');

  cards.push({
    title: openingLabel,
    value: tr('hub.storyOpeningValue'),
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
      sub: h.mostUsedPipe.bowls
        ? tr('hub.storyMostUsedPipeSub', { count: h.mostUsedPipe.bowls })
        : tr('hub.storyMostUsedPipeSubFallback'),
      accent: '#C87941',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: tr('hub.mostUsedPipe'),
    });
  }

  // 3. Favourite blend
  if (hasPipe && h.favoriteBlend) {
    const record = h.favoriteBlend._record || null;
    const photo = record?.logo || record?.photo || record?.photos?.[0] || null;
    cards.push({
      title: h.favoriteBlend.name,
      value: h.favoriteBlend.name,
      sub: h.favoriteBlend.bowls
        ? tr('hub.storyTopBlendSub', { count: h.favoriteBlend.bowls })
        : tr('hub.storyTopBlendSubFallback'),
      accent: '#4A9C6A',
      icon: Leaf,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'leaf',
      label: tr('hub.topBlend'),
    });
  }

  // 4. Most tasted bottle
  if (hasWhiskey && h.mostTastedBottle) {
    const record = h.mostTastedBottle._record || null;
    const photo = record?.photo || record?.image || record?.photos?.[0] || null;
    cards.push({
      title: h.mostTastedBottle.name,
      value: h.mostTastedBottle.name,
      sub: h.mostTastedBottle.tastings
        ? tr('hub.storyMostTastedBottleSub', { count: h.mostTastedBottle.tastings })
        : tr('hub.storyMostTastedBottleSubFallback'),
      accent: '#C4963A',
      icon: Droplets,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'pipe',
      label: tr('hub.mostTasted'),
    });
  }

  // 4b. Most smoked cigar
  if (hasCigar && h.mostSmokedCigar) {
    const record = h.mostSmokedCigar._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.mostSmokedCigar.name,
      value: h.mostSmokedCigar.name,
      sub: h.mostSmokedCigar.sessions
        ? tr('hub.storyMostSmokedCigarSub', { count: h.mostSmokedCigar.sessions })
        : tr('hub.storyMostSmokedCigarSubFallback'),
      accent: '#C89752',
      icon: Flame,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'cigar',
      label: tr('hub.mostSmokedCigar'),
    });
  }

  // 4c. Favorite cigar
  if (hasCigar && h.favoriteCigar) {
    const record = h.favoriteCigar._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.favoriteCigar.name,
      value: h.favoriteCigar.name,
      sub: h.favoriteCigar.rating
        ? tr('hub.storyFavoriteCigarSub', { rating: h.favoriteCigar.rating })
        : tr('hub.storyFavoriteCigarSubFallback'),
      accent: '#A0784A',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'cigar',
      label: tr('hub.favoriteCigar'),
    });
  }

  // 4d. Top rated cigar
  if (hasCigar && h.topRatedCigar) {
    const record = h.topRatedCigar._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.topRatedCigar.name,
      value: h.topRatedCigar.name,
      sub: h.topRatedCigar.rating
        ? tr('hub.storyTopRatedCigarSub', { rating: h.topRatedCigar.rating })
        : tr('hub.storyTopRatedCigarSubFallback'),
      accent: '#8C6B3F',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'cigar',
      label: tr('hub.topRatedCigar'),
    });
  }

  // 4e. Highest value cigar
  if (hasCigar && h.highestValueCigar) {
    const record = h.highestValueCigar._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.highestValueCigar.name,
      value: h.highestValueCigar.name,
      sub: h.highestValueCigar.value
        ? tr('hub.storyHighestValueCigarSub', { value: fmt(h.highestValueCigar.value) })
        : tr('hub.storyHighestValueCigarSubFallback'),
      accent: '#A0784A',
      icon: Award,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'cigar',
      label: tr('hub.highestValueCigar'),
    });
  }

  // 4f. Most valuable wine
  if (hasWine && h.mostValuableWine) {
    const record = h.mostValuableWine._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.mostValuableWine.name,
      value: h.mostValuableWine.name,
      sub: h.mostValuableWine.value
        ? tr('hub.storyTopWineSub', { value: fmt(h.mostValuableWine.value) })
        : tr('hub.storyTopWineSubFallback'),
      accent: '#8B4B6B',
      icon: Wine,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'wine',
      label: tr('hub.topWine'),
    });
  }

  // 4g. Top rated wine
  if (hasWine && h.topRatedWine) {
    const record = h.topRatedWine._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.topRatedWine.name,
      value: h.topRatedWine.name,
      sub: h.topRatedWine.rating
        ? tr('hub.storyTopRatedWineSub', { rating: h.topRatedWine.rating })
        : tr('hub.storyTopRatedWineSubFallback'),
      accent: '#A0567A',
      icon: Star,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'wine',
      label: tr('hub.topRatedWine'),
    });
  }

  // 4h. Wine ready to drink
  if (hasWine && h.readyToDrinkWine) {
    const record = h.readyToDrinkWine._record || null;
    const photo = record?.photos?.[0] || record?.photo || null;
    cards.push({
      title: h.readyToDrinkWine.name,
      value: h.readyToDrinkWine.name,
      sub: h.readyToDrinkWine.vintage
        ? tr('hub.storyReadyToDrinkSub', { vintage: h.readyToDrinkWine.vintage })
        : tr('hub.storyReadyToDrinkSubFallback'),
      accent: '#2E7D5C',
      icon: Droplets,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: 'wine',
      label: tr('hub.readyToDrink'),
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
      sub: h.mostValuableItem.value
        ? tr('hub.storyCrownJewelSub', { value: fmt(h.mostValuableItem.value) })
        : tr('hub.storyCrownJewelSubFallback'),
      accent: '#D4AF37',
      icon: Award,
      heroImage: photo,
      bgImage: photo,
      silhouetteType: rt === 'cigar' ? 'cigar' : 'pipe',
      label: tr('hub.crownJewel'),
    });
    }
    }

  // 6. Collection by the numbers
  const pipeCount = hasPipe ? (m.pipes || 0) + (m.blends || 0) : 0;
  const bottleCount = hasWhiskey ? (m.totalBottles || 0) : 0;
  const cigarCount = hasCigar ? (m.cigarTypes || m.cigars || 0) : 0;
  const wineCount = hasWine ? (m.wineBottles || m.wines || 0) : 0;
  const hasCounts = pipeCount + bottleCount + cigarCount + wineCount > 0;
  if (hasCounts) {
    const parts = [];
    if (hasPipe && m.pipes) parts.push(tr('hub.storyPipesCount', { count: m.pipes }));
    if (hasPipe && m.blends) parts.push(tr('hub.storyBlendsCount', { count: m.blends }));
    if (hasWhiskey && m.totalBottles) parts.push(tr('hub.storyBottlesCount', { count: m.totalBottles }));
    if (hasCigar && (m.cigarTypes || m.cigars)) {
      const ct = m.cigarTypes || m.cigars;
      parts.push(tr('hub.storyCigarTypesCount', { count: ct }));
    }
    if (hasCigar && (m.totalCigarSticks || m.cigarSticks)) {
      const cs = m.totalCigarSticks || m.cigarSticks;
      parts.push(tr('hub.storyCigarSticksCount', { count: cs }));
    }
    if (hasWine && (m.wineBottles || m.wines)) {
      const wb = m.wineBottles || m.wines;
      parts.push(tr('hub.storyWineBottlesCount', { count: wb }));
    }
    if (hasWine && m.wineTastings) {
      parts.push(tr('hub.storyWineTastingsCount', { count: m.wineTastings }));
    }
    const countLabel = isCombined
      ? tr('hub.storyByTheNumbers')
      : hasPipe
        ? tr('hub.storyCollectionCount')
        : hasCigar
          ? tr('hub.storyCigarCount')
          : hasWine
            ? tr('hub.storyWineCollection')
            : tr('hub.storyBottleCount');
    cards.push({
      title: countLabel,
      value: parts[0] || tr('hub.storyYourCollection'),
      sub: parts.slice(1).join(' · ') || tr('hub.storyGrowingCollection'),
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
      title: tr('hub.storyCollectionValueTitle'),
      value: fmt(totalValue),
      sub: tr('hub.storyCollectionValueSub'),
      accent: '#10B981',
      icon: TrendingUp,
      bgImage: null,
      silhouetteType: 'leaf',
    });
  }

  // 8. Sessions / tastings / cigar sessions / wine tastings
  const sessions = hasPipe ? Number(m.sessions || 0) : 0;
  const tastings = hasWhiskey ? Number(m.tastings || 0) : 0;
  const cigarSessions = hasCigar ? Number(m.cigarSessions || 0) : 0;
  const wineTastings = hasWine ? Number(m.wineTastings || 0) : 0;
  if (sessions + tastings + cigarSessions + wineTastings > 0) {
    const desc = [
      sessions > 0 ? tr('hub.storySmokesCount', { count: sessions }) : null,
      tastings > 0 ? tr('hub.storyTastingsCount', { count: tastings }) : null,
      cigarSessions > 0 ? tr('hub.storyCigarSessionsCount', { count: cigarSessions }) : null,
      wineTastings > 0 ? tr('hub.storyWineTastingsCount', { count: wineTastings }) : null,
    ].filter(Boolean).join(' · ');
    const expLabel = isCombined
      ? tr('hub.storyExperiencesLogged')
      : hasPipe
        ? tr('hub.storySmokingSessions')
        : hasCigar
          ? tr('hub.storyCigarSessions')
          : hasWine
            ? tr('hub.storyWineTastingsTitle')
            : tr('hub.storyTastingsLogged');
    cards.push({
      title: expLabel,
      value: sessions + tastings + cigarSessions + wineTastings,
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
    sub: tr('hub.storyClosingSub'),
    accent: '#F59E0B',
    icon: Heart,
    bgImage: null,
    silhouetteType: 'pipe',
    isClosingCard: true,
  });

  return cards.map((c, i) => ({ ...c, index: i + 1, total: cards.length }));
}