import { base44 } from "@/api/base44Client";

// Free tier limits
export const FREE_TIER_LIMITS = {
  PIPES: 5,
  TOBACCO_BLENDS: 10,
  PHOTOS_PER_ITEM: 3,
  SMOKING_LOGS: 50
};

// February 1, 2026 - Date when trial restrictions take effect
const TRIAL_RESTRICTION_DATE = new Date('2026-02-01T00:00:00Z');

/**
 * Check if trial restrictions apply based on current date
 * Starting Feb 1, 2026, free trials are limited to Free tier maximums
 */
export function shouldApplyTrialRestrictions() {
  return new Date() >= TRIAL_RESTRICTION_DATE;
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

    const pipes = await base44.entities.Pipe.filter({ created_by: userEmail });
    const count = pipes?.length || 0;

    // If on trial and restrictions apply, enforce Free tier limits
    if (isTrialing && shouldApplyTrialRestrictions()) {
      const canCreate = count < FREE_TIER_LIMITS.PIPES;
      return {
        canCreate,
        currentCount: count,
        limit: FREE_TIER_LIMITS.PIPES,
        reason: canCreate ? null : `Free trial is limited to ${FREE_TIER_LIMITS.PIPES} pipes. Upgrade to add unlimited pipes.`
      };
    }

    // Free tier users (not on trial, not paid)
    const canCreate = count < FREE_TIER_LIMITS.PIPES;
    return {
      canCreate,
      currentCount: count,
      limit: FREE_TIER_LIMITS.PIPES,
      reason: canCreate ? null : `Free accounts are limited to ${FREE_TIER_LIMITS.PIPES} pipes. Upgrade for unlimited access.`
    };
  } catch (err) {
    console.warn("Failed to check pipe limit:", err);
    return { canCreate: false, currentCount: 0, limit: FREE_TIER_LIMITS.PIPES, reason: "Unable to verify limits" };
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

    const tobaccos = await base44.entities.TobaccoBlend.filter({ created_by: userEmail });
    const count = tobaccos?.length || 0;

    // If on trial and restrictions apply, enforce Free tier limits
    if (isTrialing && shouldApplyTrialRestrictions()) {
      const canCreate = count < FREE_TIER_LIMITS.TOBACCO_BLENDS;
      return {
        canCreate,
        currentCount: count,
        limit: FREE_TIER_LIMITS.TOBACCO_BLENDS,
        reason: canCreate ? null : `Free trial is limited to ${FREE_TIER_LIMITS.TOBACCO_BLENDS} blends. Upgrade to add unlimited blends.`
      };
    }

    // Free tier users (not on trial, not paid)
    const canCreate = count < FREE_TIER_LIMITS.TOBACCO_BLENDS;
    return {
      canCreate,
      currentCount: count,
      limit: FREE_TIER_LIMITS.TOBACCO_BLENDS,
      reason: canCreate ? null : `Free accounts are limited to ${FREE_TIER_LIMITS.TOBACCO_BLENDS} blends. Upgrade for unlimited access.`
    };
  } catch (err) {
    console.warn("Failed to check tobacco limit:", err);
    return { canCreate: false, currentCount: 0, limit: FREE_TIER_LIMITS.TOBACCO_BLENDS, reason: "Unable to verify limits" };
  }
}

export async function canAddPhoto(currentPhotoCount, freePhotoLimit) {
  return currentPhotoCount < freePhotoLimit;
}

export async function canCreateSmokingLog(userEmail, freeLogLimit) {
  try {
    const logs = await base44.entities.SmokingLog.filter({ created_by: userEmail });
    const count = logs?.length || 0;
    return count < freeLogLimit;
  } catch (err) {
    console.warn("Failed to check smoking log limit:", err);
    return false;
  }
}