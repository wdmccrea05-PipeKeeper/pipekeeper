/**
 * SHIM — re-exports from canonical premiumAccess.
 * This file is kept only to prevent import errors from legacy code.
 * Do not use directly — import from premiumAccess.jsx.
 */
export { getEntitlementTier as resolveEntitlementTier, hasProAccess, isFree as isFreeUser } from './premiumAccess';