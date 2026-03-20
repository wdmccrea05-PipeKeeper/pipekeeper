/**
 * SHIM — re-exports from canonical premiumAccess.
 * This file is kept only to prevent import errors from legacy code.
 * Do not use directly — import from premiumAccess.jsx.
 */
export { buildCanonicalEntitlements as buildEntitlements } from './premiumAccess';
export const PRO_LAUNCH_CUTOFF_ISO = "2026-02-01T00:00:00.000Z";