/**
 * summarySelectors.js
 *
 * Cross-module summary selectors for the Collection Hub and any surface that
 * needs aggregated metrics spanning multiple modules.
 *
 * All individual module selectors are imported from their canonical files.
 * No ad-hoc calculation logic here — only composition.
 */

import {
  selectWhiskeyMetrics,
  selectCollectionValue as selectWhiskeyCollectionValue,
} from './whiskeySelectors.js';
import {
  selectPipeMetrics,
  selectPipeCollectionValue,
} from './pipeSelectors.js';
import {
  selectTobaccoMetrics,
  selectCellarValue,
} from './tobaccoSelectors.js';
import { selectCigarMetrics, selectCigarCollectionValue } from './cigarSelectors.js';

// ---------------------------------------------------------------------------
// Cross-module totals
// ---------------------------------------------------------------------------

/**
 * selectTotalCollectionValue — sum value across all active modules.
 *
 * @param {object} params
 * @param {object[]} params.pipes
 * @param {object[]} params.blends
 * @param {object[]} params.bottles
 * @param {object[]} params.inventoryUnits - WhiskeyInventoryUnit records
 * @param {object[]} params.cigars
 * @returns {number}
 */
export function selectTotalCollectionValue({
  pipes = [],
  blends = [],
  bottles = [],
  inventoryUnits = [],
  cigars = [],
} = {}) {
  return (
    selectPipeCollectionValue(pipes) +
    selectCellarValue(blends) +
    selectWhiskeyCollectionValue(bottles, inventoryUnits) +
    selectCigarCollectionValue(cigars)
  );
}

// ---------------------------------------------------------------------------
// Full cross-module summary
// ---------------------------------------------------------------------------

/**
 * selectCollectionSummary — compute all module metrics in one call.
 *
 * Returns a structured object that the Collection Hub, reports, and Curator
 * can all consume without any further calculation.
 *
 * @param {object} params
 * @param {object[]} params.pipes
 * @param {object[]} params.smokingLogs
 * @param {object[]} params.blends
 * @param {object[]} params.bottles
 * @param {object[]} params.inventoryUnits - WhiskeyInventoryUnit records
 * @param {object[]} params.tastingLogs
 * @param {object[]} params.cigars
 * @param {object[]} params.humidors       - HumidorLocation records (optional)
 * @returns {{
 *   pipe: ReturnType<selectPipeMetrics>,
 *   tobacco: ReturnType<selectTobaccoMetrics>,
 *   whiskey: ReturnType<selectWhiskeyMetrics>,
 *   cigar: ReturnType<selectCigarMetrics>,
 *   total_value: number,
 * }}
 */
export function selectCollectionSummary({
  pipes = [],
  smokingLogs = [],
  blends = [],
  bottles = [],
  inventoryUnits = [],
  tastingLogs = [],
  cigars = [],
  humidors = [],
} = {}) {
  const pipe = selectPipeMetrics(pipes, smokingLogs);
  const tobacco = selectTobaccoMetrics(blends);
  const whiskey = selectWhiskeyMetrics(bottles, inventoryUnits, tastingLogs);
  const cigar = selectCigarMetrics(cigars, humidors);

  const total_value =
    pipe.collection_value +
    tobacco.cellar_value +
    whiskey.collection_value +
    cigar.collection_value;

  return { pipe, tobacco, whiskey, cigar, total_value };
}
