/**
 * searchRanking.js
 *
 * Scores and ranks search results using a weighted confidence algorithm.
 *
 * Scoring factors (out of 100):
 *
 * Text Match
 *   exact product title match  +35
 *   close normalised match     +25
 *   partial match              +10
 *
 * Brand/Distillery/Maker Match
 *   exact brand match          +20
 *   likely brand match         +10
 *
 * Source Trust (TIER_WEIGHTS from trustedSources)
 *   tier 1                     +25
 *   tier 2                     +18
 *   tier 3                     +10
 *   tier 4                     +3
 *
 * International Relevance
 *   non-US source + non-US product  +10
 *   regionally appropriate source   +8
 *
 * Image / Page Quality
 *   dedicated product page with clean image  +10
 *   thumbnail only                           +3
 *
 * Penalties
 *   marketplace junk / weak title mismatch  -25
 *   forum-only / ambiguous image            -20
 *   generic result with weak title          -15
 */

import { TIER_WEIGHTS, getDomainInfo, isInternationalProduct } from './trustedSources.js';
import { getConfidenceLabel, getConfidenceReason } from './searchConfidence.js';

// ── String normalisation (mirrors SmartSearchEngine approach) ─────────────────

function stripDiacritics(str) {
  if (typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(str) {
  return stripDiacritics(str || '')
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/[.,!?;:()[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return normalize(str).split(' ').filter(Boolean);
}

// ── Text match scoring ────────────────────────────────────────────────────────

/**
 * Score how well `query` matches `candidate` using exact / close / partial rules.
 * Returns { textScore, isExactMatch }.
 */
function scoreTextMatch(query, candidate) {
  if (!query || !candidate) return { textScore: 0, isExactMatch: false };

  const nq = normalize(query);
  const nc = normalize(candidate);

  if (nq === nc) return { textScore: 35, isExactMatch: true };

  // Normalised close match (one contains the other)
  if (nc.includes(nq) || nq.includes(nc)) return { textScore: 25, isExactMatch: false };

  // Token overlap — partial
  const qt = tokenize(query);
  const ct = tokenize(candidate);
  if (qt.length === 0) return { textScore: 0, isExactMatch: false };

  const overlap = qt.filter((t) => ct.some((c) => c.includes(t) || t.includes(c))).length;
  const ratio = overlap / qt.length;

  if (ratio >= 0.9) return { textScore: 22, isExactMatch: false };
  if (ratio >= 0.5) return { textScore: 10, isExactMatch: false };

  return { textScore: 0, isExactMatch: false };
}

/**
 * Score brand / distillery / maker match between query and result.
 * Returns 0–20.
 */
function scoreBrandMatch(query, brandField) {
  if (!brandField) return 0;
  const nq = normalize(query);
  const nb = normalize(brandField);
  if (nq === nb || nq.includes(nb) || nb.includes(nq)) return 20;
  const qt = tokenize(query);
  const bt = tokenize(brandField);
  const overlap = qt.filter((t) => bt.includes(t)).length;
  if (overlap > 0) return 10;
  return 0;
}

// ── Source trust scoring ──────────────────────────────────────────────────────

function scoreSourceTrust(sourceDomain) {
  const { tier } = getDomainInfo(sourceDomain);
  return TIER_WEIGHTS[tier] ?? TIER_WEIGHTS[4];
}

// ── International relevance scoring ──────────────────────────────────────────

function scoreInternationalRelevance(result, sourceDomain) {
  const { isInternational } = getDomainInfo(sourceDomain);
  const productIsInternational = isInternationalProduct(result);

  if (isInternational && productIsInternational) return 10;
  if (productIsInternational && !sourceDomain) return 8; // region hint present but no source
  return 0;
}

// ── Image / page quality scoring ─────────────────────────────────────────────

function scoreImageQuality(result) {
  if (result.imageUrl && result.sourceDomain && result.sourceTier <= 2) return 10;
  if (result.imageUrl) return 3;
  return 0;
}

// ── Penalty detection ─────────────────────────────────────────────────────────

function computePenalties(result, textScore) {
  let penalty = 0;
  const sourceType = result.sourceType || 'generic';
  const tier = result.sourceTier || 4;

  if (tier === 4 && textScore < 10) penalty += 15; // generic with weak title
  if (sourceType === 'review' && !result.imageUrl) penalty += 20; // forum/review only

  return penalty;
}

// ── Main scoring entry point ──────────────────────────────────────────────────

/**
 * Compute a 0–100 confidence score for a single result against a user query.
 *
 * @param {string} query      - The user's search query
 * @param {Object} result     - A normalised result in the common shape
 * @param {string} entityType - 'bottle' | 'blend' | 'pipe' | 'cigar' | 'image'
 * @returns {{ score: number, isExactMatch: boolean }}
 */
export function scoreResult(query, result, entityType) {
  // ── Text match against primary title ────────────────────────────────────────
  const { textScore, isExactMatch } = scoreTextMatch(query, result.title || result.matchedName);

  // ── Brand / maker match ──────────────────────────────────────────────────────
  const brandField =
    entityType === 'bottle'
      ? result.matchedBrand || result.subtitle
      : entityType === 'blend'
        ? result.matchedBrand || result.subtitle
        : entityType === 'pipe'
          ? result.matchedBrand || result.subtitle
          : result.matchedBrand;

  const brandScore = scoreBrandMatch(query, brandField);

  // ── Source trust ─────────────────────────────────────────────────────────────
  const trustScore = scoreSourceTrust(result.sourceDomain);

  // ── International relevance ──────────────────────────────────────────────────
  const intlScore = scoreInternationalRelevance(result, result.sourceDomain);

  // ── Image / page quality ─────────────────────────────────────────────────────
  const imgScore = scoreImageQuality(result);

  // ── Penalties ────────────────────────────────────────────────────────────────
  const penalties = computePenalties(result, textScore);

  const raw = textScore + brandScore + trustScore + intlScore + imgScore - penalties;
  const score = Math.min(100, Math.max(0, raw));

  return { score, isExactMatch };
}

/**
 * Annotate a list of results with confidence metadata and sort by score descending.
 *
 * @param {string} query
 * @param {Object[]} results  - Normalised results (common shape)
 * @param {string} entityType
 * @returns {Object[]} - Sorted array with confidenceScore, confidenceLabel, confidenceReason, isExactMatch added
 */
export function rankResults(query, results, entityType) {
  return (results || [])
    .map((result) => {
      const { score, isExactMatch } = scoreResult(query, result, entityType);
      const label = getConfidenceLabel(score);
      const reason = getConfidenceReason({ ...result, isExactMatch }, score);
      return {
        ...result,
        isExactMatch,
        confidenceScore: score,
        confidenceLabel: label,
        confidenceReason: reason,
      };
    })
    .sort((a, b) => {
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
      return b.confidenceScore - a.confidenceScore;
    });
}
