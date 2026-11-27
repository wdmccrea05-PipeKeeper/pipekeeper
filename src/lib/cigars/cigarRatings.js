/**
 * src/lib/cigars/cigarRatings.js
 *
 * Structured, dated cigar ratings.
 *
 * A rating records only the categories the collector actually observed; every
 * category is optional. Ratings accumulate over time, so the same cigar can
 * carry several dated observations and the history is never overwritten.
 *
 * Pure functions only — no SDK access, no writes.
 */

export const RATING_CATEGORIES = Object.freeze([
  { key: 'construction', label: 'Construction' },
  { key: 'draw', label: 'Draw' },
  { key: 'burn', label: 'Burn' },
  { key: 'aroma', label: 'Aroma' },
  { key: 'flavor', label: 'Flavor' },
  { key: 'overall', label: 'Overall' },
]);

export const RATING_KEYS = Object.freeze(RATING_CATEGORIES.map((c) => c.key));

function toRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(Math.min(5, Math.max(0, parsed)) * 10) / 10;
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Normalised category values for one rating record. */
export function normalizeRating(rating = {}) {
  const categories = {};
  RATING_KEYS.forEach((key) => {
    categories[key] = toRating(rating?.[key]);
  });
  return {
    id: rating?.id || null,
    cigar_id: rating?.cigar_id || null,
    cigar_name: rating?.cigar_name || null,
    rated_at: rating?.rated_at || null,
    observations: rating?.observations || '',
    session_id: rating?.session_id || null,
    categories,
  };
}

export function hasAnyRating(rating = {}) {
  return RATING_KEYS.some((key) => toRating(rating?.[key]) !== null);
}

/** Mean of the categories the collector recorded, or null when none were. */
export function averageCategoryRating(rating = {}) {
  const values = RATING_KEYS.map((key) => toRating(rating?.[key])).filter((v) => v !== null);
  if (!values.length) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

/** Share of categories recorded, 0-1. */
export function ratingCompleteness(rating = {}) {
  const recorded = RATING_KEYS.filter((key) => toRating(rating?.[key]) !== null).length;
  return recorded / RATING_KEYS.length;
}

/** Newest first. */
export function sortRatingsNewestFirst(ratings = []) {
  return [...ratings].sort((a, b) => toTime(b?.rated_at) - toTime(a?.rated_at));
}

export function latestRatingForCigar(ratings = [], cigarId) {
  if (!cigarId) return null;
  const match = sortRatingsNewestFirst(ratings.filter((r) => r?.cigar_id === cigarId));
  return match[0] || null;
}

/**
 * Collection-level rating summary.
 *
 * @returns {{
 *   count: number,
 *   ratedCigars: number,
 *   categories: Record<string, { average: number|null, count: number }>,
 *   perCigar: Record<string, { count: number, latest: object|null, average: number|null }>,
 * }}
 */
export function summarizeRatings(ratings = []) {
  const list = Array.isArray(ratings) ? ratings.filter(hasAnyRating) : [];
  const categories = {};
  RATING_KEYS.forEach((key) => {
    const values = list.map((r) => toRating(r?.[key])).filter((v) => v !== null);
    categories[key] = {
      average: values.length
        ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
        : null,
      count: values.length,
    };
  });

  const perCigar = {};
  list.forEach((rating) => {
    const cigarId = rating?.cigar_id;
    if (!cigarId) return;
    if (!perCigar[cigarId]) perCigar[cigarId] = { count: 0, latest: null, average: null };
    perCigar[cigarId].count += 1;
  });
  Object.keys(perCigar).forEach((cigarId) => {
    const forCigar = sortRatingsNewestFirst(list.filter((r) => r?.cigar_id === cigarId));
    perCigar[cigarId].latest = forCigar[0] || null;
    const averages = forCigar.map(averageCategoryRating).filter((v) => v !== null);
    perCigar[cigarId].average = averages.length
      ? Math.round((averages.reduce((s, v) => s + v, 0) / averages.length) * 100) / 100
      : null;
  });

  return {
    count: list.length,
    ratedCigars: Object.keys(perCigar).length,
    categories,
    perCigar,
  };
}

export function ratingCategoryLabel(key) {
  return RATING_CATEGORIES.find((c) => c.key === key)?.label || key;
}