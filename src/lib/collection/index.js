/**
 * src/lib/collection/index.js
 *
 * Unified collection selector layer — single entry point.
 *
 * Import from here to access all canonical metric selectors:
 *
 *   import {
 *     selectWhiskeyMetrics,
 *     selectPipeMetrics,
 *     selectTobaccoMetrics,
 *     selectCigarMetrics,
 *     selectCollectionSummary,
 *   } from '@/lib/collection';
 */

export * from './whiskeySelectors.js';
export * from './pipeSelectors.js';
export * from './tobaccoSelectors.js';
export * from './cigarSelectors.js';
export * from './wineSelectors.js';
export * from './summarySelectors.js';
export * from './collectionValidator.js';
export * from './activeFilters.js';
export * from './boundaries.js';
export * from './provenance.js';
export * from './conditionHistory.js';