import { base44 } from "@/api/base44Client";

// Free tier limits
export const FREE_TIER_LIMITS = {
  PIPES: 5,
  TOBACCO_BLENDS: 10,
  PHOTOS_PER_ITEM: 3,
  SMOKING_LOGS: 50
};

/**
 * Check if trial restrictions apply based on current date
 * Restrictions have been permanently active since Feb 1, 2026.
 */
export function shouldApplyTrialRestrictions() {
  return true;
}

/**
 * Check if user can create a new pipe
 * @param {string} userEmail - User's email
 * @param {boolean} hasPaidAccess - Whether user has an active paid subscription
 * @param {boolean} isTrialing - Whether user is in a free trial
 * @returns {Promise<{canCreate: boolean, currentCount: number, limit: number|null, reason?: string}>}
 */
export async function canCreatePipe(userEmail, hasPaidAccess, isTrialing) {
  try {
    // Paid subscribers have unlimited access
    if (hasPaidAccess) {
      return { canCreate: true, currentCount: 0, limit: null };
    }

    const pipes = await base44.entities.Pipe.filter({ created_by: userEmail }, undefined, FREE_TIER_LIMITS.PIPES + 1);
    const count = pipes?.length || 0;

    // If on trial and restrictions apply, enforce Free tier limits
    if (isTrialing && shouldApplyTrialRestrictions()) {
      const canCreate = count < FREE_TIER_LIMITS.PIPES;
      return {
        canCreate,
        currentCount: count,
        limit: FREE_TIER_LIMITS.PIPES,
        reason: canCreate ? null : 'limits.trialPipesExceeded'
      };
    }

    // Free tier users (not on trial, not paid)
    const canCreate = count < FREE_TIER_LIMITS.PIPES;
    return {
      canCreate,
      currentCount: count,
      limit: FREE_TIER_LIMITS.PIPES,
      reason: canCreate ? null : 'limits.freePipesExceeded'
    };
  } catch (err) {
    console.warn("Failed to check pipe limit:", err);
    return { canCreate: true, currentCount: 0, limit: FREE_TIER_LIMITS.PIPES, reason: 'limits.unableToVerify' };
  }
}

/**
 * Check if user can create a new tobacco blend
 * @param {string} userEmail - User's email
 * @param {boolean} hasPaidAccess - Whether user has an active paid subscription
 * @param {boolean} isTrialing - Whether user is in a free trial
 * @returns {Promise<{canCreate: boolean, currentCount: number, limit: number|null, reason?: string}>}
 */
export async function canCreateTobacco(userEmail, hasPaidAccess, isTrialing) {
  try {
    // Paid subscribers have unlimited access
    if (hasPaidAccess) {
      return { canCreate: true, currentCount: 0, limit: null };
    }

    const tobaccos = await base44.entities.TobaccoBlend.filter({ created_by: userEmail }, undefined, FREE_TIER_LIMITS.TOBACCO_BLENDS + 1);
    const count = tobaccos?.length || 0;

    // If on trial and restrictions apply, enforce Free tier limits
    if (isTrialing && shouldApplyTrialRestrictions()) {
      const canCreate = count < FREE_TIER_LIMITS.TOBACCO_BLENDS;
      return {
        canCreate,
        currentCount: count,
        limit: FREE_TIER_LIMITS.TOBACCO_BLENDS,
        reason: canCreate ? null : 'limits.trialBlendExceeded'
      };
    }

    // Free tier users (not on trial, not paid)
    const canCreate = count < FREE_TIER_LIMITS.TOBACCO_BLENDS;
    return {
      canCreate,
      currentCount: count,
      limit: FREE_TIER_LIMITS.TOBACCO_BLENDS,
      reason: canCreate ? null : 'limits.freeBlendExceeded'
    };
  } catch (err) {
    console.warn("Failed to check tobacco limit:", err);
    return { canCreate: true, currentCount: 0, limit: FREE_TIER_LIMITS.TOBACCO_BLENDS, reason: 'limits.unableToVerify' };
  }
}