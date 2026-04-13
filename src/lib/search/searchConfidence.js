/**
 * searchConfidence.js
 *
 * Returns confidence labels and human-readable reason strings for search results.
 *
 * Confidence thresholds (per spec):
 *   85+   → "High"
 *   65–84 → "Medium"
 *   <65   → "Low"
 */

export const CONFIDENCE_HIGH   = 'High';
export const CONFIDENCE_MEDIUM = 'Medium';
export const CONFIDENCE_LOW    = 'Low';

export const CONFIDENCE_THRESHOLDS = {
  high:   85,
  medium: 65,
};

/**
 * Map a numeric confidence score (0–100) to a label string.
 *
 * @param {number} score
 * @returns {'High'|'Medium'|'Low'}
 */
export function getConfidenceLabel(score) {
  if (score >= CONFIDENCE_THRESHOLDS.high)   return CONFIDENCE_HIGH;
  if (score >= CONFIDENCE_THRESHOLDS.medium) return CONFIDENCE_MEDIUM;
  return CONFIDENCE_LOW;
}

/**
 * Build a concise human-readable reason string explaining why a result
 * received its confidence score.
 *
 * @param {Object} result - A normalized search result (common shape)
 * @param {number} score
 * @returns {string}
 */
export function getConfidenceReason(result, score) {
  const parts = [];

  if (result.isExactMatch) {
    parts.push('Exact title match');
  } else if (score >= 60) {
    parts.push('Close title match');
  } else {
    parts.push('Partial match');
  }

  const tier = result.sourceTier;
  if (tier === 1) parts.push('official source');
  else if (tier === 2) parts.push('trusted specialist');
  else if (tier === 3) parts.push('broad retailer');

  if (result.isInternationalSource && result.regionHint) {
    parts.push(`${result.regionHint} specialist`);
  } else if (result.isInternationalSource) {
    parts.push('international source');
  }

  return parts.join(' · ');
}

/**
 * Return a short display label suitable for a confidence chip/badge.
 * Includes an emoji indicator for quick visual scanning.
 *
 * @param {'High'|'Medium'|'Low'} label
 * @returns {string}
 */
export function confidenceChipText(label) {
  if (label === CONFIDENCE_HIGH)   return '✓ High';
  if (label === CONFIDENCE_MEDIUM) return '~ Medium';
  return '? Low';
}
