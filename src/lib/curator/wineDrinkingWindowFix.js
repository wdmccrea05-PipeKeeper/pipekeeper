/**
 * wineDrinkingWindowFix.js
 *
 * Turns Curator's "wines without a drinking window" suggestion into an applyable
 * finding, so the estimated dates can be saved straight from the Curator screen
 * instead of edited record by record.
 *
 * The estimate itself comes from wineOptimization.buildWineDrinkingWindowPatch().
 * This module only maps that estimate onto the date fields the Wine entity stores.
 */

import {
  analyzeWineOptimizationIssues,
  buildWineDrinkingWindowPatch,
  WINE_ISSUE_TYPE,
} from './wineOptimization.js';
import {
  ACTION_TYPE,
  CATEGORY,
  MODULE_KEY,
  OWNERSHIP_CONTEXT,
  PRIORITY,
  createRecommendation,
} from './recommendationSchema.js';

// The Wine entity stores style in lowercase ("red", "sparkling"), while the
// drinking-window estimator is keyed on title case. Normalizing keeps a red wine
// on the red peak window instead of the neutral fallback.
const STYLE_PROFILE_ALIASES = {
  red: 'Red',
  white: 'White',
  'rosé': 'Rosé',
  rose: 'Rosé',
  sparkling: 'Sparkling',
  dessert: 'Sweet',
  fortified: 'Fortified',
  orange: 'Orange',
};

/**
 * Build the finding that backs the in-chat "estimate drinking windows" action.
 * Wines without a vintage (or without a style/varietal) are left out — their
 * window cannot be estimated deterministically.
 *
 * @param {object[]} wines — Wine records
 * @returns {object|null} Finding with one applyable item per estimable wine
 */
export function buildWineDrinkingWindowFix(wines = []) {
  const issue = analyzeWineOptimizationIssues(wines)
    .find((entry) => entry.type === WINE_ISSUE_TYPE.MISSING_DRINKING_WINDOW);
  const affected = issue?.records || [];

  const items = affected
    .map((wine) => {
      const profileStyle = STYLE_PROFILE_ALIASES[String(wine.style || '').toLowerCase()];
      const patch = buildWineDrinkingWindowPatch(profileStyle ? { ...wine, style: profileStyle } : wine);
      const startYear = Number(patch.drinking_window_start);
      const endYear = Number(patch.drinking_window_end);
      if (!wine?.id || !startYear || !endYear) return null;

      return {
        id: wine.id,
        recordId: wine.id,
        recordType: 'wine',
        recordName: wine.name,
        itemName: wine.name,
        ownershipStatus: 'owned',
        missingFields: ['drinking window'],
        proposedChange: {
          payload: {
            drink_window_start: `${startYear}-01-01`,
            drink_window_end: `${endYear}-12-31`,
          },
          confidence: 0.7,
          rationale: `Estimated from vintage ${wine.vintage} and ${wine.varietal || wine.style || 'style'} profile.`,
        },
      };
    })
    .filter(Boolean);

  if (!items.length) return null;

  return createRecommendation({
    id: 'curator_wine_drinking_window_fix',
    category: CATEGORY.RECORD_OPTIMIZATION,
    goal: 'wine_missing_drinking_window',
    actionType: ACTION_TYPE.AUTO_FIX,
    title: 'Estimated Drinking Windows',
    summary: `${items.length} wine${items.length === 1 ? '' : 's'} without a drinking window.`,
    recommendationText: 'Sets drink-from and drink-by dates estimated from vintage and style.',
    moduleKey: MODULE_KEY.WINE,
    ownershipContext: OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority: PRIORITY.MEDIUM,
    confidence: 'medium',
    items,
    actionPayload: { type: 'auto_estimate_wine_drinking_window' },
  });
}