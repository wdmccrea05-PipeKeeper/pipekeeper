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
export * from './summarySelectors.js';
export * from './collectionValidator.js';
