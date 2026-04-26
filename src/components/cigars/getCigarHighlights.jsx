/**
 * Cigar Highlights Generator
 * Analyzes cigar collection and produces ranked highlight cards
 * similar to getWhiskeyHighlights.
 *
 * Returns array of highlight objects:
 * { key, title, value, subtitle, accent, photo }
 */

function getCigarPhoto(cigar) {
  if (Array.isArray(cigar?.photos) && cigar.photos.length > 0) return cigar.photos[0];
  return cigar?.photo || null;
}

function isDuplicate(candidate, existing) {
  if (!candidate.cigarId) return false;
  return existing.some((c) => c.cigarId === candidate.cigarId);
}

/**
 * Most valuable cigar (by estimated_value or purchase_price)
 */
function findMostValuable(cigars, fmt) {
  const candidates = cigars
    .map((c) => ({ ...c, __val: c.estimated_value || c.purchase_price || 0 }))
    .filter((c) => c.__val > 0);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.__val - a.__val);
  const c = candidates[0];
  return {
    key: 'most_valuable',
    title: 'Most Valuable',
    value: fmt(c.__val),
    subtitle: [c.brand, c.name].filter(Boolean).join(' '),
    accent: '#B4824B',
    photo: getCigarPhoto(c),
    cigarId: c.id,
  };
}

/**
 * Highest rated cigar
 */
function findHighestRated(cigars) {
  const candidates = cigars.filter((c) => typeof c.rating === 'number' && c.rating > 0);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.rating - a.rating);
  const c = candidates[0];
  return {
    key: 'highest_rated',
    title: 'Highest Rated',
    value: `${c.rating.toFixed(1)} / 5`,
    subtitle: [c.brand, c.name].filter(Boolean).join(' '),
    accent: '#D4A574',
    photo: getCigarPhoto(c),
    cigarId: c.id,
  };
}

/**
 * Favorite cigar
 */
function findFavorite(cigars) {
  const c = cigars.find((c) => c.is_favorite === true);
  if (!c) return null;
  return {
    key: 'favorite',
    title: 'Your Favorite',
    value: '★',
    subtitle: [c.brand, c.name].filter(Boolean).join(' '),
    accent: '#D4AF37',
    photo: getCigarPhoto(c),
    cigarId: c.id,
  };
}

/**
 * Most recently added cigar
 */
function findRecentAddition(cigars) {
  const candidates = cigars.filter((c) => c.created_date || c.purchase_date);
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const da = new Date(a.created_date || a.purchase_date).getTime();
    const db = new Date(b.created_date || b.purchase_date).getTime();
    return db - da;
  });
  const c = candidates[0];
  const dateVal = c.created_date || c.purchase_date;
  const daysAgo = Math.floor((Date.now() - new Date(dateVal).getTime()) / (1000 * 60 * 60 * 24));
  let timeLabel = `${daysAgo} days ago`;
  if (daysAgo === 0) timeLabel = 'Today';
  else if (daysAgo === 1) timeLabel = 'Yesterday';
  else if (daysAgo < 7) timeLabel = `${daysAgo} days ago`;
  else if (daysAgo < 30) timeLabel = `${Math.floor(daysAgo / 7)} weeks ago`;
  else timeLabel = `${Math.floor(daysAgo / 30)} months ago`;

  return {
    key: 'recent_addition',
    title: 'Recent Addition',
    value: timeLabel,
    subtitle: [c.brand, c.name].filter(Boolean).join(' '),
    accent: '#C9A876',
    photo: getCigarPhoto(c),
    cigarId: c.id,
  };
}

/**
 * Largest inventory (most sticks)
 */
function findLargestInventory(cigars) {
  const candidates = cigars.filter((c) => (c.quantity || 0) > 0);
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
  const c = candidates[0];
  return {
    key: 'largest_inventory',
    title: 'Largest Stock',
    value: `${c.quantity} Sticks`,
    subtitle: [c.brand, c.name].filter(Boolean).join(' '),
    accent: '#9B7B5F',
    photo: getCigarPhoto(c),
    cigarId: c.id,
  };
}

/**
 * Fallback for empty collections
 */
function getEmptyFallbacks() {
  return [
    {
      key: 'get_started',
      title: 'Get Started',
      value: 'Add Your First Cigar',
      subtitle: 'Click "Add Cigar" to begin tracking your collection',
      accent: '#B4824B',
      photo: null,
    },
  ];
}

/**
 * Main highlight generator
 * @param {Array} cigars
 * @param {Function} [formatFromBase] - optional currency formatter
 * @returns {Array} up to 4 highlight objects
 */
export function getCigarHighlights(cigars, formatFromBase) {
  const fmt = typeof formatFromBase === 'function' ? formatFromBase : (v) => `$${Math.round(Number(v) || 0)}`;
  if (!Array.isArray(cigars) || cigars.length === 0) {
    return getEmptyFallbacks();
  }

  const candidates = [];

  const mostValuable = findMostValuable(cigars, fmt);
  if (mostValuable) candidates.push(mostValuable);

  const highestRated = findHighestRated(cigars);
  if (highestRated && !isDuplicate(highestRated, candidates)) candidates.push(highestRated);

  const favorite = findFavorite(cigars);
  if (favorite && !isDuplicate(favorite, candidates)) candidates.push(favorite);

  const recent = findRecentAddition(cigars);
  if (recent && !isDuplicate(recent, candidates)) candidates.push(recent);

  const largestStock = findLargestInventory(cigars);
  if (largestStock && !isDuplicate(largestStock, candidates)) candidates.push(largestStock);

  return candidates.slice(0, 4);
}