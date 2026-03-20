/**
 * SHIM — limitChecks.js now delegates to moduleLimits.js (canonical).
 * Kept to prevent import breakage.
 */
export { getModuleLimits, getModuleLimit, hasReachedLimit, getRemainingBeforeLimit } from './moduleLimits';
import { hasPaidAccess } from './premiumAccess';
import { base44 } from "@/api/base44Client";

// Free tier limits (single definition — matches moduleLimits.js)
export const FREE_TIER_LIMITS = {
  PIPES: 10,
  TOBACCO_BLENDS: 10,
  BOTTLES: 10,
  PHOTOS_PER_ITEM: 3,
  SMOKING_LOGS: 100,
};

export function shouldApplyTrialRestrictions() {
  return new Date() >= new Date('2026-02-01T00:00:00Z');
}

export async function canCreatePipe(userEmail, hasPaid_arg, _isTrialing) {
  if (hasPaid_arg) return { canCreate: true, currentCount: 0, limit: null };
  const pipes = await base44.entities.Pipe.filter({ created_by: userEmail }, null, FREE_TIER_LIMITS.PIPES + 1);
  const count = pipes?.length || 0;
  const canCreate = count < FREE_TIER_LIMITS.PIPES;
  return { canCreate, currentCount: count, limit: FREE_TIER_LIMITS.PIPES, reason: canCreate ? null : 'limits.freePipesExceeded' };
}

export async function canCreateTobacco(userEmail, hasPaid_arg, _isTrialing) {
  if (hasPaid_arg) return { canCreate: true, currentCount: 0, limit: null };
  const tobaccos = await base44.entities.TobaccoBlend.filter({ created_by: userEmail }, null, FREE_TIER_LIMITS.TOBACCO_BLENDS + 1);
  const count = tobaccos?.length || 0;
  const canCreate = count < FREE_TIER_LIMITS.TOBACCO_BLENDS;
  return { canCreate, currentCount: count, limit: FREE_TIER_LIMITS.TOBACCO_BLENDS, reason: canCreate ? null : 'limits.freeBlendExceeded' };
}