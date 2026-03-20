/**
 * Whiskey Highlights Generator
 * Analyzes bottle collection and produces ranked highlight cards
 * 
 * Returns array of highlight objects:
 * { key, title, value, subtitle, accent, photo }
 */

import { formatCurrency } from '@/components/utils/localeFormatters';
import {
  getBottleUnitValue,
  getBottleTotalValue,
  getEffectiveBottleCount,
  buildInventoryCountByBottleId,
} from '@/components/utils/whiskeyValueHelpers';

/**
 * Get photo from bottle (check both photo and photos array)
 */
function getBottlePhoto(bottle) {
  return bottle?.photo || bottle?.photos?.[0] || null;
}

/**
 * Main highlight generator
 * @param {Array} bottles - Array of bottle records
 * @param {Array} inventoryUnits - Array of inventory units
 * @returns {Array} Array of highlight objects (max 4)
 */
export function getWhiskeyHighlights(bottles, inventoryUnits = []) {
  if (!Array.isArray(bottles) || bottles.length === 0) {
    return getEmptyCollectionFallbacks();
  }

  const inventoryCountByBottleId = buildInventoryCountByBottleId(inventoryUnits);
  const hasInventoryUnits = inventoryUnits.length > 0;

  // Build candidate pool
  const candidates = [];

  // 1. Most Valuable
  const mostValuable = findMostValuable(bottles, inventoryCountByBottleId, hasInventoryUnits);
  if (mostValuable) candidates.push(mostValuable);

  // 2. Highest Rated
  const highestRated = findHighestRated(bottles);
  if (highestRated && !isDuplicate(highestRated, candidates)) {
    candidates.push(highestRated);
  }

  // 3. Oldest/Longest Held (by age or purchase date)
  const oldest = findOldest(bottles);
  if (oldest && !isDuplicate(oldest, candidates)) {
    candidates.push(oldest);
  }

  // 4. Recent Acquisition
  const recent = findRecentAcquisition(bottles);
  if (recent && !isDuplicate(recent, candidates)) {
    candidates.push(recent);
  }

  // 5. Highest Proof
  const highestProof = findHighestProof(bottles);
  if (highestProof && !isDuplicate(highestProof, candidates)) {
    candidates.push(highestProof);
  }

  // 6. Favorite Bottle
  const favorite = findFavorite(bottles);
  if (favorite && !isDuplicate(favorite, candidates)) {
    candidates.push(favorite);
  }

  // If still too few, add fallback stats
  if (candidates.length < 3) {
    const stats = getCollectionStatsFallbacks(bottles, inventoryCountByBottleId, hasInventoryUnits);
    for (const stat of stats) {
      if (!isDuplicate(stat, candidates) && candidates.length < 4) {
        candidates.push(stat);
      }
    }
  }

  // Return top 4, or fewer if collection is small
  return candidates.slice(0, 4);
}

/**
 * Find most valuable bottle
 */
function findMostValuable(bottles, inventoryCountByBottleId, hasInventoryUnits) {
  const candidates = bottles
    .map((bottle) => ({
      ...bottle,
      __unitValue: getBottleUnitValue(bottle),
    }))
    .filter((bottle) => bottle.__unitValue > 0);

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.__unitValue - a.__unitValue);
  const bottle = candidates[0];

  return {
    key: 'most_valuable',
    title: 'Most Valuable',
    value: formatCurrency(bottle.__unitValue),
    subtitle: bottle.name,
    accent: '#B4824B',
    photo: getBottlePhoto(bottle),
    bottleId: bottle.id,
  };
}

/**
 * Find highest rated bottle (1-5 scale)
 */
function findHighestRated(bottles) {
  const candidates = bottles.filter((b) => typeof b.rating === 'number' && b.rating > 0);
  if (!candidates.length) return null;

  candidates.sort((a, b) => b.rating - a.rating);
  const bottle = candidates[0];

  return {
    key: 'highest_rated',
    title: 'Highest Rated',
    value: `${bottle.rating.toFixed(1)} / 5`,
    subtitle: bottle.name,
    accent: '#D4A574',
    photo: getBottlePhoto(bottle),
    bottleId: bottle.id,
  };
}

/**
 * Find oldest bottle (by age or purchase date)
 */
function findOldest(bottles) {
  const candidates = bottles.filter((b) => b.age && b.age > 0);
  if (!candidates.length) return null;

  candidates.sort((a, b) => (b.age || 0) - (a.age || 0));
  const bottle = candidates[0];

  return {
    key: 'oldest',
    title: 'Oldest Expression',
    value: `${bottle.age} Years`,
    subtitle: bottle.name,
    accent: '#9B7B5F',
    photo: getBottlePhoto(bottle),
    bottleId: bottle.id,
  };
}

/**
 * Find most recent acquisition
 */
function findRecentAcquisition(bottles) {
  const candidates = bottles.filter((b) => b.purchase_date);
  if (!candidates.length) return null;

  candidates.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
  const bottle = candidates[0];

  const daysAgo = Math.floor((Date.now() - new Date(bottle.purchase_date).getTime()) / (1000 * 60 * 60 * 24));
  let timeLabel = `${daysAgo} days ago`;
  if (daysAgo === 0) timeLabel = 'Today';
  else if (daysAgo === 1) timeLabel = 'Yesterday';
  else if (daysAgo < 7) timeLabel = `${daysAgo} days ago`;
  else if (daysAgo < 30) timeLabel = `${Math.floor(daysAgo / 7)} weeks ago`;
  else timeLabel = `${Math.floor(daysAgo / 30)} months ago`;

  return {
    key: 'recent_acquisition',
    title: 'Recent Addition',
    value: timeLabel,
    subtitle: bottle.name,
    accent: '#C9A876',
    photo: getBottlePhoto(bottle),
    bottleId: bottle.id,
  };
}

/**
 * Find highest proof bottle
 */
function findHighestProof(bottles) {
  const candidates = bottles.filter((b) => b.abv && b.abv > 0);
  if (!candidates.length) return null;

  candidates.sort((a, b) => (b.abv || 0) - (a.abv || 0));
  const bottle = candidates[0];

  return {
    key: 'highest_proof',
    title: 'Highest Proof',
    value: `${bottle.abv}% ABV`,
    subtitle: bottle.name,
    accent: '#A67C52',
    photo: getBottlePhoto(bottle),
    bottleId: bottle.id,
  };
}

/**
 * Find a marked favorite
 */
function findFavorite(bottles) {
  const favorite = bottles.find((b) => b.favorite === true);
  if (!favorite) return null;

  return {
    key: 'favorite',
    title: 'Your Favorite',
    value: '★',
    subtitle: favorite.name,
    accent: '#D4AF37',
    photo: getBottlePhoto(favorite),
    bottleId: favorite.id,
  };
}

/**
 * Fallback stats for empty/sparse collections
 */
function getCollectionStatsFallbacks(bottles, inventoryCountByBottleId, hasInventoryUnits) {
  const fallbacks = [];

  // Total collection value
  const totalValue = bottles.reduce(
    (sum, b) => sum + getBottleTotalValue(b, inventoryCountByBottleId, hasInventoryUnits),
    0
  );
  if (totalValue > 0) {
    fallbacks.push({
      key: 'total_value',
      title: 'Total Collection Value',
      value: formatCurrency(Math.round(totalValue)),
      subtitle: `${bottles.length} unique bottle${bottles.length !== 1 ? 's' : ''}`,
      accent: '#B4824B',
      photo: null,
    });
  }

  // Total bottles
  const totalBottles = bottles.reduce(
    (sum, b) => sum + getEffectiveBottleCount(b, inventoryCountByBottleId, hasInventoryUnits),
    0
  );
  if (totalBottles > 1) {
    fallbacks.push({
      key: 'total_bottles',
      title: 'Total Inventory',
      value: `${totalBottles} Bottles`,
      subtitle: 'Across all types',
      accent: '#A8866B',
      photo: null,
    });
  }

  // Average rating
  const ratedBottles = bottles.filter((b) => typeof b.rating === 'number' && b.rating > 0);
  if (ratedBottles.length > 0) {
    const avgRating =
      ratedBottles.reduce((sum, b) => sum + b.rating, 0) / ratedBottles.length;
    fallbacks.push({
      key: 'average_rating',
      title: 'Average Rating',
      value: `${avgRating.toFixed(1)} / 5`,
      subtitle: `${ratedBottles.length} bottle${ratedBottles.length !== 1 ? 's' : ''} rated`,
      accent: '#D4A574',
      photo: null,
    });
  }

  return fallbacks;
}

/**
 * Fallback for empty collections
 */
function getEmptyCollectionFallbacks() {
  return [
    {
      key: 'get_started',
      title: 'Get Started',
      value: 'Add Your First Bottle',
      subtitle: 'Click "Add Bottle" to begin tracking your collection',
      accent: '#B4824B',
      photo: null,
    },
  ];
}

/**
 * Check if bottle already in highlight list (prevent duplicates)
 */
function isDuplicate(candidate, existingCandidates) {
  if (!candidate.bottleId) return false;

  return existingCandidates.some((c) => c.bottleId === candidate.bottleId);
}