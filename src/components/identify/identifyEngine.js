/**
 * identifyEngine.js
 *
 * Canonical shared identification layer for PipeKeeper, WhiskeyKeeper, and
 * TobaccoKeeper.  All UPC/barcode and photo identification routes through here.
 *
 * Re-exports the core normalisation utilities so consumers only need to import
 * from this single module.
 *
 * Required exports (per problem statement):
 *   identifyByUPC(code, itemTypeHint?)
 *   identifyByImage(imageInput, itemTypeHint?)
 *   normalizeIdentifiedItem(rawResult, itemType)
 *   buildQuickAddPayload(identifiedItem, itemType)
 *   buildValuationSeedData(identifiedItem, itemType)
 */

export { identifyByUPC } from './upcLookup';
export { identifyByImage, identifyByImageUrls, uploadIdentifyImages } from './imageLookup';
export {
  normalizeIdentifiedItem,
  normalizeSingleCandidate,
  buildQuickAddPayload,
  buildValuationSeedData,
  resolveConfidenceLevel,
  confidenceToScore,
} from './normalizeIdentifiedItem';
