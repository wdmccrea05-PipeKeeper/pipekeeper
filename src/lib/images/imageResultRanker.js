/**
 * imageResultRanker.js
 *
 * Ranks normalized image results using a weighted confidence algorithm.
 *
 * Scoring factors:
 *   Exact title/name match     +35
 *   Close normalized match     +25
 *   Partial token overlap      +10
 *   Brand/maker match          +20 / +10
 *   Source tier trust          +25 / +18 / +10 / +3
 *   International relevance    +10 / +8
 *   Image quality              +10 / +3
 *   Penalties                  -15 to -25
 *
 * Confidence labels (5-level):
 *   90–100 → "Exact Match"
 *   70–89  → "High Confidence"
 *   50–69  → "Medium Confidence"
 *   30–49  → "Reference"      (also forced for pipes and reference-only domains)
 *    0–29  → "Low Confidence"
 */

import { TIER_WEIGHTS, getImageDomainInfo } from './trustedImageSources.js';

// ── Confidence label thresholds ───────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  exactMatch:       90,
  highConfidence:   70,
  mediumConfidence: 50,
  reference:        30,
};

export const CONFIDENCE_LABELS = {
  EXACT_MATCH:       'Exact Match',
  HIGH_CONFIDENCE:   'High Confidence',
  MEDIUM_CONFIDENCE: 'Medium Confidence',
  REFERENCE:         'Reference',
  LOW_CONFIDENCE:    'Low Confidence',
};

/**
 * Map a numeric score (0–100) to a confidence label string.
 *
 * @param {number} score
 * @param {boolean} [forceReference] — when true, caps at "Reference"
 * @returns {string}
 */
export function getConfidenceLabel(score, forceReference = false) {
  if (!forceReference && score >= CONFIDENCE_THRESHOLDS.exactMatch)       return CONFIDENCE_LABELS.EXACT_MATCH;
  if (!forceReference && score >= CONFIDENCE_THRESHOLDS.highConfidence)   return CONFIDENCE_LABELS.HIGH_CONFIDENCE;
  if (!forceReference && score >= CONFIDENCE_THRESHOLDS.mediumConfidence) return CONFIDENCE_LABELS.MEDIUM_CONFIDENCE;
  if (score >= CONFIDENCE_THRESHOLDS.reference || forceReference)         return CONFIDENCE_LABELS.REFERENCE;
  return CONFIDENCE_LABELS.LOW_CONFIDENCE;
}

// ── String helpers ────────────────────────────────────────────────────────────

function stripDiacritics(str) {
  return typeof str === 'string'
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : '';
}

function normalizeStr(str) {
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
  return normalizeStr(str).split(' ').filter(Boolean);
}

// ── Individual scoring components ─────────────────────────────────────────────

function scoreTextMatch(query, candidate) {
  if (!query || !candidate) return { textScore: 0, isExactMatch: false };

  const nq = normalizeStr(query);
  const nc = normalizeStr(candidate);

  if (nq === nc) return { textScore: 35, isExactMatch: true };
  if (nc.includes(nq) || nq.includes(nc)) return { textScore: 25, isExactMatch: false };

  const qt = tokenize(query);
  const ct = tokenize(candidate);
  if (qt.length === 0) return { textScore: 0, isExactMatch: false };

  const overlap = qt.filter((t) => ct.some((c) => c.includes(t) || t.includes(c))).length;
  const ratio = overlap / qt.length;

  if (ratio >= 0.9) return { textScore: 22, isExactMatch: false };
  if (ratio >= 0.5) return { textScore: 10, isExactMatch: false };

  return { textScore: 0, isExactMatch: false };
}

function scoreBrandMatch(query, brandField) {
  if (!brandField) return 0;
  const nq = normalizeStr(query);
  const nb = normalizeStr(brandField);
  if (nq === nb || nq.includes(nb) || nb.includes(nq)) return 20;
  const overlap = tokenize(query).filter((t) => tokenize(brandField).includes(t)).length;
  return overlap > 0 ? 10 : 0;
}

function scoreSourceTrust(sourceDomain) {
  const { tier } = getImageDomainInfo(sourceDomain);
  return TIER_WEIGHTS[tier] ?? TIER_WEIGHTS[4];
}

function scoreInternationalRelevance(result) {
  const { isInternational } = getImageDomainInfo(result.sourceDomain);
  const haystack = [result.title, result.matchedName, result.subtitle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const intlKeywords = [
    'scotch', 'scotland', 'scottish', 'islay', 'speyside', 'highland', 'irish', 'ireland',
    'japanese', 'japan', 'nikka', 'suntory', 'india', 'australian', 'swedish', 'welsh',
  ];
  const productIsInternational = intlKeywords.some((kw) => haystack.includes(kw));

  if (isInternational && productIsInternational) return 10;
  if (productIsInternational) return 8;
  return 0;
}

function scoreImageQuality(result) {
  if (result.imageUrl && result.isDirectImageUrl && result.sourceTier <= 2) return 10;
  if (result.imageUrl) return 5;
  if (result.url) return 2; // has a product page URL at least
  return 0;
}

function computePenalties(result, textScore) {
  let penalty = 0;
  const tier = result.sourceTier || 4;
  const type = result.sourceType || 'fallback';

  if (tier === 4 && textScore < 10) penalty += 15;
  if (type === 'fallback' && !result.imageUrl) penalty += 20;

  return penalty;
}

// ── Main scoring entry point ──────────────────────────────────────────────────

/**
 * Compute a confidence score (0–100) for a single normalized image result.
 *
 * @param {string} query
 * @param {Object} result - NormalizedImageResult
 * @returns {{ score: number, isExactMatch: boolean }}
 */
export function scoreImageResult(query, result) {
  const { textScore, isExactMatch } = scoreTextMatch(query, result.title || result.matchedName);
  const brandScore  = scoreBrandMatch(query, result.matchedBrand || result.subtitle);
  const trustScore  = scoreSourceTrust(result.sourceDomain);
  const intlScore   = scoreInternationalRelevance(result);
  const imgScore    = scoreImageQuality(result);
  const penalties   = computePenalties(result, textScore);

  const raw   = textScore + brandScore + trustScore + intlScore + imgScore - penalties;
  const score = Math.min(100, Math.max(0, raw));

  return { score, isExactMatch };
}

// ── Ranking ───────────────────────────────────────────────────────────────────

/**
 * Annotate a list of normalized image results with confidence metadata and
 * sort by score descending.
 *
 * Exact matches are pinned to the top; alternatives are still returned.
 *
 * @param {string} query
 * @param {Object[]} results - Array of NormalizedImageResult objects
 * @param {boolean} [forceReference] — when true (pipes), caps label at "Reference"
 * @returns {Object[]}
 */
export function rankImageResults(query, results, forceReference = false) {
  return (results || [])
    .map((result) => {
      const { score, isExactMatch } = scoreImageResult(query, result);
      // A reference-only domain (e.g. pipedia.org) caps at "Reference"
      const domainIsReferenceOnly = result.isReferenceImage === true;
      const label = getConfidenceLabel(score, forceReference || domainIsReferenceOnly);

      return {
        ...result,
        isExactMatch,
        confidenceScore: score,
        confidenceLabel: label,
      };
    })
    .sort((a, b) => {
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
      return b.confidenceScore - a.confidenceScore;
    });
}
