/**
 * wineOptimization.js
 *
 * Wine-specific optimization analysis and patch generation for Curator.
 *
 * Exports:
 *   analyzeWineOptimizationIssues(wines, wineTastings, preferences)
 *   buildWineMetadataPatch(wine)
 *   buildWineValuationPatch(wine)
 *   buildWineDrinkingWindowPatch(wine)
 *   buildWineRarityPatch(wine)
 *   applyWineOptimizationPatch(wineId, patch, options)
 *   applyWineOptimizationBatch(issueId, records)
 */

import { shouldRefreshWineValuation, getWineValuationStatus } from '../valuation/wineValuation.js';
import { getWineUnitValue, getWineTotalValue } from '../collection/wineSelectors.js';

// ─── Auto-fix confidence threshold ───────────────────────────────────────────
// Only auto-apply patches when confidence meets or exceeds this threshold.
const AUTO_FIX_CONFIDENCE_THRESHOLD = 0.6;

// ─── Issue category constants ─────────────────────────────────────────────────

export const WINE_ISSUE_TYPE = {
  MISSING_METADATA:     'missing_core_metadata',
  MISSING_DRINKING_WINDOW: 'missing_drinking_window',
  MISSING_VALUATION:    'missing_valuation',
  STALE_VALUATION:      'stale_valuation',
  MISSING_RARITY:       'missing_rarity',
  MISSING_TASTING_NOTES: 'missing_tasting_notes',
};

// ─── Core metadata fields ─────────────────────────────────────────────────────

const CORE_METADATA_FIELDS = [
  'producer', 'vintage', 'style', 'varietal', 'region', 'country',
];

// ─── Drinking-window estimation tables ───────────────────────────────────────
// Peak windows are approximate guidelines, not guarantees.

const DRINKING_WINDOW_BY_STYLE = {
  'Sparkling':          { minAge: 0,  maxAge: 5,  peakStart: 1, peakEnd: 3 },
  'Rosé':               { minAge: 0,  maxAge: 3,  peakStart: 0, peakEnd: 2 },
  'White':              { minAge: 0,  maxAge: 8,  peakStart: 1, peakEnd: 5 },
  'Light Red':          { minAge: 0,  maxAge: 8,  peakStart: 2, peakEnd: 6 },
  'Red':                { minAge: 2,  maxAge: 15, peakStart: 5, peakEnd: 12 },
  'Full-Bodied Red':    { minAge: 3,  maxAge: 25, peakStart: 8, peakEnd: 20 },
  'Sweet':              { minAge: 0,  maxAge: 30, peakStart: 5, peakEnd: 20 },
  'Fortified':          { minAge: 0,  maxAge: 50, peakStart: 5, peakEnd: 40 },
  'Orange':             { minAge: 0,  maxAge: 8,  peakStart: 1, peakEnd: 5 },
  'Natural':            { minAge: 0,  maxAge: 5,  peakStart: 1, peakEnd: 3 },
};

// Varietal overrides (more specific than style)
const DRINKING_WINDOW_BY_VARIETAL = {
  'Nebbiolo':           { minAge: 5,  maxAge: 30, peakStart: 10, peakEnd: 25 },
  'Barolo':             { minAge: 5,  maxAge: 30, peakStart: 10, peakEnd: 25 },
  'Barbaresco':         { minAge: 4,  maxAge: 25, peakStart: 8,  peakEnd: 20 },
  'Cabernet Sauvignon': { minAge: 3,  maxAge: 20, peakStart: 8,  peakEnd: 18 },
  'Bordeaux Blend':     { minAge: 3,  maxAge: 25, peakStart: 8,  peakEnd: 20 },
  'Pinot Noir':         { minAge: 2,  maxAge: 15, peakStart: 5,  peakEnd: 12 },
  'Riesling':           { minAge: 0,  maxAge: 30, peakStart: 5,  peakEnd: 20 },
  'Chardonnay':         { minAge: 1,  maxAge: 12, peakStart: 3,  peakEnd: 8  },
  'Champagne':          { minAge: 1,  maxAge: 15, peakStart: 3,  peakEnd: 10 },
  'Syrah':              { minAge: 2,  maxAge: 20, peakStart: 6,  peakEnd: 15 },
  'Grenache':           { minAge: 1,  maxAge: 15, peakStart: 4,  peakEnd: 12 },
  'Malbec':             { minAge: 1,  maxAge: 15, peakStart: 3,  peakEnd: 10 },
  'Merlot':             { minAge: 2,  maxAge: 15, peakStart: 5,  peakEnd: 12 },
  'Sangiovese':         { minAge: 2,  maxAge: 20, peakStart: 5,  peakEnd: 15 },
  'Sauvignon Blanc':    { minAge: 0,  maxAge: 8,  peakStart: 1,  peakEnd: 5  },
};

// ─── Rarity scoring ───────────────────────────────────────────────────────────

const RARITY_LABEL_MAP = [
  { min: 80, label: 'Extremely Rare' },
  { min: 60, label: 'Very Rare' },
  { min: 40, label: 'Rare' },
  { min: 20, label: 'Uncommon' },
  { min: 0,  label: 'Common' },
];

function getRarityLabel(score) {
  const match = RARITY_LABEL_MAP.find((r) => score >= r.min);
  return match?.label || 'Unknown';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYear() {
  return new Date().getFullYear();
}

function getWineAge(wine) {
  const vintage = Number(wine.vintage);
  if (!vintage || isNaN(vintage)) return null;
  return Math.max(0, currentYear() - vintage);
}

function getDrinkWindowProfile(wine) {
  const varietal = wine.varietal || wine.varietals;
  if (varietal && DRINKING_WINDOW_BY_VARIETAL[varietal]) {
    return DRINKING_WINDOW_BY_VARIETAL[varietal];
  }
  const style = wine.style || wine.wine_type;
  if (style && DRINKING_WINDOW_BY_STYLE[style]) {
    return DRINKING_WINDOW_BY_STYLE[style];
  }
  // Default: generic red
  return DRINKING_WINDOW_BY_STYLE['Red'];
}

function calcDrinkWindowStatus(age, profile) {
  if (age === null) return 'unknown';
  if (age < profile.peakStart) return 'hold';
  if (age <= profile.peakEnd) return 'in_window';
  if (age <= profile.maxAge) return 'past_peak';
  return 'past_peak';
}

// ─── Issue Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze wines and produce a structured list of optimization issues.
 * Each issue carries enough data to generate auto-fix patches.
 *
 * @param {object[]} wines            Wine records
 * @param {object[]} wineTastings     Wine tasting logs
 * @param {object}   preferences      User preferences
 * @returns {object[]} Array of optimization issues
 */
export function analyzeWineOptimizationIssues(wines = [], wineTastings = [], preferences = {}) {
  const issues = [];

  // Missing core metadata
  const missingMeta = wines.filter((w) =>
    CORE_METADATA_FIELDS.some((key) => !w[key])
  );
  if (missingMeta.length > 0) {
    issues.push({
      id:           'wine_missing_core_metadata',
      type:         WINE_ISSUE_TYPE.MISSING_METADATA,
      title:        'Wines Missing Core Metadata',
      records:      missingMeta,
      autoFixable:  true,
      confidence:   'high',
      actionType:   'auto_enrich_wine_metadata',
    });
  }

  // Missing drinking window
  const missingWindow = wines.filter(
    (w) => !w.drink_from && !w.drink_by && !w.drinking_window &&
           !w.drink_window_status && !w.drinking_window_start
  );
  if (missingWindow.length > 0) {
    // Only auto-fix when we have enough identity data (vintage + style/varietal)
    const autoFixable = missingWindow.some((w) => w.vintage && (w.style || w.varietal));
    issues.push({
      id:           'wine_missing_drinking_window',
      type:         WINE_ISSUE_TYPE.MISSING_DRINKING_WINDOW,
      title:        'Wines Without a Drinking Window',
      records:      missingWindow,
      autoFixable,
      confidence:   'medium',
      actionType:   'auto_estimate_wine_drinking_window',
    });
  }

  // Missing valuation
  const missingValuation = wines.filter(
    (w) => !w.manual_valuation_enabled &&
           !Number(w.market_estimated_unit_value) &&
           !Number(w.estimated_unit_value) &&
           !Number(w.purchase_price)
  );
  if (missingValuation.length > 0) {
    const autoFixable = missingValuation.some(
      (w) => w.name || w.wine_name || w.producer
    );
    issues.push({
      id:           'wine_missing_valuation',
      type:         WINE_ISSUE_TYPE.MISSING_VALUATION,
      title:        'Wines Without Valuation Data',
      records:      missingValuation,
      autoFixable,
      confidence:   'medium',
      actionType:   'auto_enrich_wine_valuation',
    });
  }

  // Stale valuation
  const staleValuation = wines.filter(
    (w) => !w.manual_valuation_enabled &&
           (Number(w.market_estimated_unit_value) > 0 || Number(w.estimated_unit_value) > 0) &&
           shouldRefreshWineValuation(w)
  );
  if (staleValuation.length > 0) {
    issues.push({
      id:           'wine_stale_valuation',
      type:         WINE_ISSUE_TYPE.STALE_VALUATION,
      title:        'Wines with Stale Valuation',
      records:      staleValuation,
      autoFixable:  true,
      confidence:   'high',
      actionType:   'auto_refresh_wine_valuation',
    });
  }

  // Missing rarity
  const missingRarity = wines.filter(
    (w) => !w.rarity_score && !w.collectibility_score && !w.rarity_notes
  );
  if (missingRarity.length >= 3) {
    issues.push({
      id:           'wine_missing_rarity',
      type:         WINE_ISSUE_TYPE.MISSING_RARITY,
      title:        'Wines Without Rarity / Collectibility Scores',
      records:      missingRarity,
      autoFixable:  true,
      confidence:   'medium',
      actionType:   'auto_calculate_wine_rarity',
    });
  }

  return issues;
}

// ─── Patch Builders ───────────────────────────────────────────────────────────

/**
 * Build a metadata patch for a wine record.
 * Only populates fields that are currently empty — never overwrites existing values.
 *
 * @param {object} wine
 * @returns {object} Partial patch object
 */
export function buildWineMetadataPatch(wine) {
  if (!wine) return {};
  const patch = {};

  // Derive fields from name when they can be inferred
  // (Production-quality implementations would call enrichment service here)

  // Bottle size default
  if (!wine.bottle_size) patch.bottle_size = '750ml';

  // Source/confidence
  if (!wine.source) patch.source = 'curator_enrichment';
  patch.metadata_confidence = 'medium';
  patch.metadata_enriched_at = new Date().toISOString();

  return patch;
}

/**
 * Build a drinking-window patch for a wine record.
 * Uses vintage + style/varietal to estimate the window.
 * Never overwrites manually set values.
 *
 * @param {object} wine
 * @returns {object} Partial patch object ready to merge into record
 */
export function buildWineDrinkingWindowPatch(wine) {
  if (!wine) return {};
  if (wine.drink_from || wine.drink_by || wine.drink_window_status) return {};

  const vintage = Number(wine.vintage);
  if (!vintage || isNaN(vintage)) {
    return {
      drinking_window_confidence: 'low',
      drinking_window_notes: 'Vintage unknown — window cannot be estimated.',
    };
  }

  const profile = getDrinkWindowProfile(wine);
  const age = getWineAge(wine);
  const status = calcDrinkWindowStatus(age, profile);

  const windowStart = vintage + profile.peakStart;
  const windowEnd   = vintage + profile.peakEnd;

  return {
    drinking_window_start:      windowStart,
    drinking_window_end:        windowEnd,
    drink_from:                 windowStart,
    drink_by:                   windowEnd,
    drink_window_status:        status,
    drinking_window_status:     status,
    drinking_window_confidence: 'medium',
    drinking_window_notes:
      `Estimated from ${wine.varietal || wine.style || 'style'} profile. ` +
      `Vintage ${vintage}: peak ${windowStart}–${windowEnd}.`,
    drinking_window_enriched_at: new Date().toISOString(),
  };
}

/**
 * Build a valuation patch for a wine record.
 * Uses purchase_price as fallback when no market estimate exists.
 * Respects manual_valuation_enabled — returns {} if set.
 *
 * @param {object} wine
 * @returns {object} Partial patch object
 */
export function buildWineValuationPatch(wine) {
  if (!wine) return {};
  if (wine.manual_valuation_enabled) return {};

  const quantity = Math.max(1, Number(wine.quantity) || 1);
  const purchasePrice = Number(wine.purchase_price) || 0;

  // If we have a purchase price but no estimated values, bootstrap from it
  if (purchasePrice > 0 && !Number(wine.estimated_unit_value) && !Number(wine.market_estimated_unit_value)) {
    const totalValue = purchasePrice * quantity;
    return {
      estimated_unit_value:       purchasePrice,
      estimated_total_value:      totalValue,
      valuation_source:           'purchase_price',
      valuation_confidence:       'low',
      valuation_notes:            'Estimated from purchase price. Market comparison recommended.',
      valuation_updated_at:       new Date().toISOString(),
      market_comparable_count:    0,
    };
  }

  // No usable data — return minimal patch signaling enrichment is needed
  return {
    valuation_source:       'curator_pending',
    valuation_confidence:   'low',
    valuation_notes:        'Awaiting market enrichment data.',
    valuation_updated_at:   new Date().toISOString(),
  };
}

/**
 * Build a rarity/collectibility patch for a wine record.
 * Scoring is deterministic from available metadata.
 *
 * @param {object} wine
 * @returns {object} Partial patch object
 */
export function buildWineRarityPatch(wine) {
  if (!wine) return {};
  if (wine.rarity_score || wine.collectibility_score) return {};

  let rarityScore = 0;
  let collectibilityScore = 0;
  const factors = [];

  // Vintage age: older generally rarer
  const age = getWineAge(wine);
  if (age !== null) {
    if (age >= 20) { rarityScore += 30; factors.push('aged 20+ years'); }
    else if (age >= 10) { rarityScore += 15; factors.push('aged 10+ years'); }
    else if (age >= 5) { rarityScore += 5; }
  }

  // Varietal rarity
  const rarityVarietals = ['Nebbiolo', 'Barolo', 'Barbaresco', 'Pétrus', 'Amarone'];
  if (rarityVarietals.some((v) => (wine.varietal || '').includes(v))) {
    rarityScore += 25;
    collectibilityScore += 25;
    factors.push(`rare varietal (${wine.varietal})`);
  }

  // Region rarity signals
  const rareRegions = ['Pomerol', 'Saint-Émilion Grand Cru', 'Grand Cru', 'Premier Cru'];
  if (rareRegions.some((r) => (wine.region || wine.appellation || '').includes(r))) {
    rarityScore += 20;
    collectibilityScore += 20;
    factors.push(`prestigious region/appellation`);
  }

  // Valuation signals collectibility
  const unitValue = getWineUnitValue(wine);
  if (unitValue >= 200)  { collectibilityScore += 20; rarityScore += 10; factors.push('high market value'); }
  else if (unitValue >= 100) { collectibilityScore += 10; factors.push('notable market value'); }

  // Drinking window: held-worthy scores
  const profile = getDrinkWindowProfile(wine);
  if (profile.maxAge >= 20) { collectibilityScore += 15; factors.push('long aging potential'); }

  rarityScore = Math.min(100, rarityScore);
  collectibilityScore = Math.min(100, collectibilityScore);

  return {
    rarity_score:          rarityScore,
    collectibility_score:  collectibilityScore,
    rarity_label:          getRarityLabel(rarityScore),
    rarity_confidence:     factors.length >= 2 ? 'medium' : 'low',
    rarity_factors:        factors,
    rarity_notes:          factors.length
      ? `Scored from: ${factors.join(', ')}.`
      : 'Insufficient metadata for detailed scoring.',
    rarity_enriched_at:    new Date().toISOString(),
  };
}

// ─── Patch Application ────────────────────────────────────────────────────────

/**
 * Apply a patch to a single wine record.
 *
 * In production, this should call the Wine entity update API.
 * Here it returns the merged record and patch for the caller to persist.
 *
 * Options:
 *   skipManualOverrides {boolean} — never overwrite fields marked as manual (default: true)
 *   dryRun {boolean}             — return patch without applying (default: false)
 *
 * @param {string} wineId
 * @param {object} patch
 * @param {object} options
 * @returns {{ wineId, patch, merged: boolean, skipped: string[] }}
 */
export function applyWineOptimizationPatch(wineId, patch, options = {}) {
  const { skipManualOverrides = true, dryRun = false } = options;

  if (!wineId || !patch || typeof patch !== 'object') {
    return { wineId, patch: {}, merged: false, skipped: [], error: 'Invalid arguments' };
  }

  const skipped = [];

  // Guard: never overwrite manual valuation fields
  if (skipManualOverrides) {
    const MANUAL_PROTECTED = [
      'manual_estimated_value', 'manual_valuation_enabled',
      'purchase_price',
    ];
    for (const field of MANUAL_PROTECTED) {
      if (field in patch) {
        skipped.push(field);
        delete patch[field];
      }
    }
  }

  return {
    wineId,
    patch,
    merged: !dryRun,
    skipped,
    appliedAt: dryRun ? null : new Date().toISOString(),
  };
}

/**
 * Apply optimization patches to a batch of wine records for a given issue.
 *
 * @param {string}   issueId   - Issue type identifier (WINE_ISSUE_TYPE value)
 * @param {object[]} records   - Array of wine records
 * @returns {object[]} Array of patch application results
 */
export function applyWineOptimizationBatch(issueId, records = []) {
  if (!Array.isArray(records) || records.length === 0) return [];

  return records.map((wine) => {
    let patch = {};

    switch (issueId) {
      case WINE_ISSUE_TYPE.MISSING_METADATA:
        patch = buildWineMetadataPatch(wine);
        break;
      case WINE_ISSUE_TYPE.MISSING_DRINKING_WINDOW:
        patch = buildWineDrinkingWindowPatch(wine);
        break;
      case WINE_ISSUE_TYPE.MISSING_VALUATION:
      case WINE_ISSUE_TYPE.STALE_VALUATION:
        patch = buildWineValuationPatch(wine);
        break;
      case WINE_ISSUE_TYPE.MISSING_RARITY:
        patch = buildWineRarityPatch(wine);
        break;
      default:
        patch = {};
    }

    return applyWineOptimizationPatch(wine.id, patch);
  });
}
