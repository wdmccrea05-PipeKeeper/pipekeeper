const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const cigarQuantity = (cigar) => Math.max(0, toNumber(cigar?.singles_equivalent ?? cigar?.quantity ?? 0));
const DEFAULT_TEXT = {
  'hub.mostSmokedCigar': 'Most Smoked Cigar',
  'hub.topRatedCigar': 'Top Rated Cigar',
  'hub.favoriteCigar': 'Favorite Cigar',
  'hub.collectionFavorite': 'Collection favorite',
  'hub.highestValueCigar': 'Highest Value Cigar',
  'hub.humidorFavorite': 'Humidor Favorite',
  'hub.readyInHumidor': 'Ready in your humidor',
  'hub.restockPriority': 'Restock Priority',
  'hub.sticksLeft': 'sticks left',
  'hub.cigarCrownJewel': 'Cigar Crown Jewel',
};
const defaultTranslate = (key) => DEFAULT_TEXT[key] ?? key;

export function selectTopHubHighlights(candidates = [], maxCards = 6) {
  const sorted = (Array.isArray(candidates) ? candidates : [])
    .filter((card) => card && card.id && card.recordType && card.recordId && toNumber(card.score) > 0)
    .sort((a, b) => toNumber(b.score) - toNumber(a.score));

  const usedRecords = new Set();
  const picked = [];

  for (const card of sorted) {
    const recordKey = `${card.recordType}:${card.recordId}`;
    if (usedRecords.has(recordKey)) continue;
    usedRecords.add(recordKey);
    picked.push(card);
    if (picked.length >= maxCards) break;
  }

  return picked;
}

export function buildHubHighlightCandidates({
  pipekeeperOpenable = false,
  whiskeyOpenable = false,
  cigarOpenable = false,
  winekeeperOpenable = false,
  metrics = {},
  t = defaultTranslate,
  formatFromBase = (value) => `$${toNumber(value).toFixed(0)}`,
  getPipeValue = () => 0,
  getBottleValue = () => 0,
  getWineTotalValue = () => 0,
} = {}) {
  const pipeValue = toNumber(getPipeValue(metrics.mostValuablePipe));
  const bottleValue = toNumber(getBottleValue(metrics.mostValuableBottle));
  const cigarValue = toNumber(metrics.highestValueCigar?.__totalValue || 0);
  const cigarCrownJewelValue = toNumber(metrics.cigarCrownJewel?.__totalValue || 0);
  const restockQty = cigarQuantity(metrics.restockPriorityCigar);
  const wineValue = metrics.mostValuableWine ? toNumber(getWineTotalValue(metrics.mostValuableWine)) : 0;

  const cards = [
    pipekeeperOpenable && metrics.mostSmokedPipe ? {
      id: 'most-smoked-pipe',
      recordType: 'pipe',
      recordId: metrics.mostSmokedPipe.id,
      title: t('hub.mostSmokedPipe'),
      value: metrics.mostSmokedPipe.name,
      subtitle: `${metrics.mostSmokedPipe.__count || 0} ${t('hub.sessions')}`,
      heroImage: metrics.mostSmokedPipe.photos?.[0],
      bgImage: metrics.mostSmokedPipe.photos?.[0],
      accent: '#C87941',
      route: `/PipeDetail?id=${encodeURIComponent(metrics.mostSmokedPipe.id)}`,
      score: 78 + toNumber(metrics.mostSmokedPipe.__count) * 2,
    } : null,
    pipekeeperOpenable && metrics.favoriteBlend ? {
      id: 'favorite-blend',
      recordType: 'blend',
      recordId: metrics.favoriteBlend.id,
      title: t('hub.favoriteBlend'),
      value: metrics.favoriteBlend.name,
      subtitle: `${metrics.favoriteBlend.__count || 0} ${t('hub.sessions')}`,
      heroImage: metrics.favoriteBlend.logo || metrics.favoriteBlend.photo,
      bgImage: metrics.favoriteBlend.logo || metrics.favoriteBlend.photo,
      accent: '#5A7C5A',
      route: `/TobaccoDetail?id=${encodeURIComponent(metrics.favoriteBlend.id)}`,
      score: 76 + toNumber(metrics.favoriteBlend.__count) * 2,
    } : null,
    pipekeeperOpenable && metrics.mostValuablePipe && pipeValue > 0 ? {
      id: 'most-valuable-pipe',
      recordType: 'pipe',
      recordId: metrics.mostValuablePipe.id,
      title: t('hub.mostValuablePipe'),
      value: metrics.mostValuablePipe.name,
      subtitle: formatFromBase(pipeValue),
      heroImage: metrics.mostValuablePipe.photos?.[0],
      bgImage: metrics.mostValuablePipe.photos?.[0],
      accent: '#B4824B',
      route: `/PipeDetail?id=${encodeURIComponent(metrics.mostValuablePipe.id)}`,
      score: 70 + Math.min(30, pipeValue / 40),
    } : null,
    whiskeyOpenable && metrics.mostValuableBottle && bottleValue > 0 ? {
      id: 'top-whiskey',
      recordType: 'bottle',
      recordId: metrics.mostValuableBottle.id,
      title: t('hub.topWhiskey'),
      value: metrics.mostValuableBottle.name,
      subtitle: formatFromBase(bottleValue),
      heroImage: metrics.mostValuableBottle.photo || metrics.mostValuableBottle.photos?.[0],
      bgImage: metrics.mostValuableBottle.photo || metrics.mostValuableBottle.photos?.[0],
      accent: '#B66565',
      route: `/BottleDetail?id=${encodeURIComponent(metrics.mostValuableBottle.id)}`,
      score: 72 + Math.min(28, bottleValue / 40),
    } : null,
    cigarOpenable && metrics.mostSmokedCigar && toNumber(metrics.mostSmokedCigar.__count) > 0 ? {
      id: 'most-smoked-cigar',
      recordType: 'cigar',
      recordId: metrics.mostSmokedCigar.id,
      title: t('hub.mostSmokedCigar'),
      value: metrics.mostSmokedCigar.name,
      subtitle: `${metrics.mostSmokedCigar.__count || 0} ${t('hub.sessions')}`,
      heroImage: metrics.mostSmokedCigar.photos?.[0],
      bgImage: metrics.mostSmokedCigar.photos?.[0],
      accent: '#8C6B3F',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.mostSmokedCigar.id)}`,
      score: 84 + toNumber(metrics.mostSmokedCigar.__count) * 3,
    } : null,
    cigarOpenable && metrics.topRatedCigar && cigarQuantity(metrics.topRatedCigar) > 0 && toNumber(metrics.topRatedCigar.rating) >= 4 ? {
      id: 'top-rated-cigar',
      recordType: 'cigar',
      recordId: metrics.topRatedCigar.id,
      title: t('hub.topRatedCigar'),
      value: metrics.topRatedCigar.name,
      subtitle: `${toNumber(metrics.topRatedCigar.rating).toFixed(1)}/5`,
      heroImage: metrics.topRatedCigar.photos?.[0],
      bgImage: metrics.topRatedCigar.photos?.[0],
      accent: '#9C7444',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.topRatedCigar.id)}`,
      score: 80 + toNumber(metrics.topRatedCigar.rating) * 4,
    } : null,
    cigarOpenable && metrics.favoriteCigar && cigarQuantity(metrics.favoriteCigar) > 0 ? {
      id: 'favorite-cigar',
      recordType: 'cigar',
      recordId: metrics.favoriteCigar.id,
      title: t('hub.favoriteCigar'),
      value: metrics.favoriteCigar.name,
      subtitle: toNumber(metrics.favoriteCigar.rating) > 0 ? `${toNumber(metrics.favoriteCigar.rating).toFixed(1)}/5` : t('hub.collectionFavorite'),
      heroImage: metrics.favoriteCigar.photos?.[0],
      bgImage: metrics.favoriteCigar.photos?.[0],
      accent: '#A67A46',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.favoriteCigar.id)}`,
      score: 79 + toNumber(metrics.favoriteCigar.rating) * 3,
    } : null,
    cigarOpenable && metrics.highestValueCigar && cigarValue > 0 ? {
      id: 'highest-value-cigar',
      recordType: 'cigar',
      recordId: metrics.highestValueCigar.id,
      title: t('hub.highestValueCigar'),
      value: metrics.highestValueCigar.name,
      subtitle: formatFromBase(cigarValue),
      heroImage: metrics.highestValueCigar.photos?.[0],
      bgImage: metrics.highestValueCigar.photos?.[0],
      accent: '#8A663B',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.highestValueCigar.id)}`,
      score: 74 + Math.min(30, cigarValue / 25),
    } : null,
    cigarOpenable && metrics.humidorFavoriteCigar && cigarQuantity(metrics.humidorFavoriteCigar) > 0 ? {
      id: 'humidor-favorite',
      recordType: 'cigar',
      recordId: metrics.humidorFavoriteCigar.id,
      title: t('hub.humidorFavorite'),
      value: metrics.humidorFavoriteCigar.name,
      subtitle: t('hub.readyInHumidor'),
      heroImage: metrics.humidorFavoriteCigar.photos?.[0],
      bgImage: metrics.humidorFavoriteCigar.photos?.[0],
      accent: '#B5844B',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.humidorFavoriteCigar.id)}`,
      score: 73 + (metrics.humidorFavoriteCigar.is_favorite ? 12 : 0) + toNumber(metrics.humidorFavoriteCigar.rating) * 2,
    } : null,
    cigarOpenable && metrics.restockPriorityCigar && restockQty > 0 && restockQty <= 2 ? {
      id: 'restock-priority-cigar',
      recordType: 'cigar',
      recordId: metrics.restockPriorityCigar.id,
      title: t('hub.restockPriority'),
      value: metrics.restockPriorityCigar.name,
      subtitle: `${restockQty} ${t('hub.sticksLeft')}`,
      heroImage: metrics.restockPriorityCigar.photos?.[0],
      bgImage: metrics.restockPriorityCigar.photos?.[0],
      accent: '#B35E54',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.restockPriorityCigar.id)}`,
      score: 72 + Math.max(0, 6 - restockQty) * 4,
    } : null,
    cigarOpenable && metrics.cigarCrownJewel && cigarCrownJewelValue > 0 ? {
      id: 'cigar-crown-jewel',
      recordType: 'cigar',
      recordId: metrics.cigarCrownJewel.id,
      title: t('hub.cigarCrownJewel'),
      value: metrics.cigarCrownJewel.name,
      subtitle: formatFromBase(cigarCrownJewelValue),
      heroImage: metrics.cigarCrownJewel.photos?.[0],
      bgImage: metrics.cigarCrownJewel.photos?.[0],
      accent: '#D4A574',
      route: `/CigarDetail?id=${encodeURIComponent(metrics.cigarCrownJewel.id)}`,
      score: 78 + Math.min(25, cigarCrownJewelValue / 30) + toNumber(metrics.cigarCrownJewel.rating) * 2,
    } : null,
    // WineKeeper highlights
    winekeeperOpenable && metrics.mostValuableWine && wineValue > 0 ? {
      id: 'top-wine',
      recordType: 'wine',
      recordId: metrics.mostValuableWine.id,
      title: t('hub.topWine'),
      value: metrics.mostValuableWine.name,
      subtitle: formatFromBase(wineValue),
      heroImage: metrics.mostValuableWine.__primaryImage || metrics.mostValuableWine.photos?.[0],
      bgImage: metrics.mostValuableWine.__primaryImage || metrics.mostValuableWine.photos?.[0],
      accent: '#8B4B6B',
      objectMode: 'bottle',
      route: `/WineDetail?id=${encodeURIComponent(metrics.mostValuableWine.id)}`,
      score: 71 + Math.min(29, wineValue / 40),
    } : null,
    winekeeperOpenable && metrics.topRatedWine && toNumber(metrics.topRatedWine.rating) >= 4 ? {
      id: 'top-rated-wine',
      recordType: 'wine',
      recordId: metrics.topRatedWine.id,
      title: t('hub.topRatedWine'),
      value: metrics.topRatedWine.name,
      subtitle: `${toNumber(metrics.topRatedWine.rating).toFixed(1)}/5`,
      heroImage: metrics.topRatedWine.__primaryImage || metrics.topRatedWine.photos?.[0],
      bgImage: metrics.topRatedWine.__primaryImage || metrics.topRatedWine.photos?.[0],
      accent: '#A0567A',
      objectMode: 'bottle',
      route: `/WineDetail?id=${encodeURIComponent(metrics.topRatedWine.id)}`,
      score: 75 + toNumber(metrics.topRatedWine.rating) * 3,
    } : null,
    winekeeperOpenable && metrics.readyToDrinkWine ? {
      id: 'ready-to-drink-wine',
      recordType: 'wine',
      recordId: metrics.readyToDrinkWine.id,
      title: t('hub.readyToDrink'),
      value: metrics.readyToDrinkWine.name,
      subtitle: `Drink Now${metrics.readyToDrinkWine.vintage ? ` · ${metrics.readyToDrinkWine.vintage}` : ''}`,
      heroImage: metrics.readyToDrinkWine.__primaryImage || metrics.readyToDrinkWine.photos?.[0],
      bgImage: metrics.readyToDrinkWine.__primaryImage || metrics.readyToDrinkWine.photos?.[0],
      accent: '#2E7D5C',
      objectMode: 'bottle',
      route: `/WineDetail?id=${encodeURIComponent(metrics.readyToDrinkWine.id)}`,
      score: 68 + (metrics.readyToDrinkWine.is_favorite ? 10 : 0),
    } : null,
  ];

  return selectTopHubHighlights(cards, 6);
}
