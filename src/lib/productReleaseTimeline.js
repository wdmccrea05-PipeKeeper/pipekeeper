/**
 * Canonical product release dates for historical subscription inference.
 * Used to determine default product mapping for legacy subscriptions.
 */

export const PRODUCT_RELEASE_DATES = {
  // PipeKeeper was the first product, always available
  PIPEKEEPER_PUBLIC_RELEASE: new Date('2020-01-01'),

  // WhiskeyKeeper went public on this date
  WHISKEYKEEPER_PUBLIC_RELEASE: new Date('2024-01-15'),

  // CigarKeeper went public yesterday (April 20, 2026)
  CIGARKEEPER_PUBLIC_RELEASE: new Date('2026-04-20'),

  // WineKeeper has not yet launched publicly
  WINEKEEPER_PUBLIC_RELEASE: new Date('2099-12-31'),
};

/**
 * Infer product from subscription creation date.
 * Before multi-product era, default to PipeKeeper.
 */
export function inferProductFromReleaseDate(createdDate) {
  if (!createdDate) return null;
  const date = new Date(createdDate);

  // Before WhiskeyKeeper release: only PipeKeeper was available
  if (date < PRODUCT_RELEASE_DATES.WHISKEYKEEPER_PUBLIC_RELEASE) {
    return 'pipekeeper';
  }

  // Before CigarKeeper release: no CigarKeeper subscriptions should exist
  if (date < PRODUCT_RELEASE_DATES.CIGARKEEPER_PUBLIC_RELEASE) {
    return null; // Cannot infer — could be PipeKeeper, WhiskeyKeeper, or bundle
  }

  // After CigarKeeper, any product is possible
  return null; // Cannot infer without explicit metadata
}

/**
 * Check if subscription predates a product's public release.
 */
export function predatesProductRelease(createdDate, product) {
  if (!createdDate) return false;
  const date = new Date(createdDate);
  const releaseDate = PRODUCT_RELEASE_DATES[`${product.toUpperCase()}_PUBLIC_RELEASE`];
  return releaseDate ? date < releaseDate : false;
}