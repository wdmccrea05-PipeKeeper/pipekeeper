/**
 * CRUD creation limit checks for PipeKeeper release hardening.
 */
export { getModuleLimits, getModuleLimit, hasReachedLimit, getRemainingBeforeLimit } from './moduleLimits';
import { base44 } from "@/api/base44Client";
import { hasModuleProAccess } from './moduleEntitlements';

export const FREE_TIER_LIMITS = {
  PIPES: 5,
  TOBACCO_BLENDS: 10,
  BOTTLES: 10,
  PHOTOS_PER_ITEM: 20,
  SMOKING_LOGS: 100,
};

function hasModuleAccessFromInput(userOrHasPaid, moduleKey) {
  if (typeof userOrHasPaid === 'boolean') return userOrHasPaid;
  return hasModuleProAccess(userOrHasPaid, moduleKey);
}

export function shouldApplyTrialRestrictions() {
  return new Date() >= new Date('2026-02-01T00:00:00.000Z');
}

function buildFailure(reason, count, limit) {
  return { canCreate: false, currentCount: count, limit, reason };
}

async function countExisting(fetcher, limit) {
  const items = await fetcher();
  return Array.isArray(items) ? items.length : 0;
}

export async function canCreatePipe(userEmail, userOrHasPaid, isTrialing = false) {
  if (hasModuleAccessFromInput(userOrHasPaid, 'pipekeeper')) return { canCreate: true, currentCount: 0, limit: null, reason: null };

  try {
    const count = await countExisting(
      () => base44.entities.Pipe.filter({ created_by: userEmail }, null, FREE_TIER_LIMITS.PIPES + 1),
      FREE_TIER_LIMITS.PIPES
    );

    if (count >= FREE_TIER_LIMITS.PIPES) {
      if (isTrialing && shouldApplyTrialRestrictions()) {
        return buildFailure('limits.trialPipesExceeded', count, FREE_TIER_LIMITS.PIPES);
      }
      return buildFailure('limits.freePipesExceeded', count, FREE_TIER_LIMITS.PIPES);
    }

    return { canCreate: true, currentCount: count, limit: FREE_TIER_LIMITS.PIPES, reason: null };
  } catch (error) {
    console.error('[limitChecks] failed to verify pipe limit', error);
    return buildFailure('limits.unableToVerify', null, FREE_TIER_LIMITS.PIPES);
  }
}

export async function canCreateTobacco(userEmail, userOrHasPaid, _isTrialing = false) {
  if (hasModuleAccessFromInput(userOrHasPaid, 'pipekeeper')) return { canCreate: true, currentCount: 0, limit: null, reason: null };

  try {
    const count = await countExisting(
      () => base44.entities.TobaccoBlend.filter({ created_by: userEmail }, null, FREE_TIER_LIMITS.TOBACCO_BLENDS + 1),
      FREE_TIER_LIMITS.TOBACCO_BLENDS
    );

    if (count >= FREE_TIER_LIMITS.TOBACCO_BLENDS) {
      return buildFailure('limits.freeBlendExceeded', count, FREE_TIER_LIMITS.TOBACCO_BLENDS);
    }

    return { canCreate: true, currentCount: count, limit: FREE_TIER_LIMITS.TOBACCO_BLENDS, reason: null };
  } catch (error) {
    console.error('[limitChecks] failed to verify tobacco limit', error);
    return buildFailure('limits.unableToVerify', null, FREE_TIER_LIMITS.TOBACCO_BLENDS);
  }
}

export const FREE_CIGAR_LIMIT = 10;
export const FREE_HUMIDOR_LIMIT = 1;

export async function canCreateCigar(userEmail, userOrHasPaid) {
  if (hasModuleAccessFromInput(userOrHasPaid, 'cigarkeeper')) return { canCreate: true, currentCount: 0, limit: null, reason: null };

  try {
    const count = await countExisting(
      () => base44.entities.Cigar.filter({ created_by: userEmail }, null, FREE_CIGAR_LIMIT + 1),
      FREE_CIGAR_LIMIT
    );

    if (count >= FREE_CIGAR_LIMIT) {
      return buildFailure('limits.freeCigarsExceeded', count, FREE_CIGAR_LIMIT);
    }

    return { canCreate: true, currentCount: count, limit: FREE_CIGAR_LIMIT, reason: null };
  } catch (error) {
    console.error('[limitChecks] failed to verify cigar limit', error);
    return buildFailure('limits.unableToVerify', null, FREE_CIGAR_LIMIT);
  }
}

export async function canCreateHumidor(userEmail, userOrHasPaid) {
  if (hasModuleAccessFromInput(userOrHasPaid, 'cigarkeeper')) return { canCreate: true, currentCount: 0, limit: null, reason: null };

  try {
    const count = await countExisting(
      () => base44.entities.HumidorLocation.filter({ created_by: userEmail }, null, FREE_HUMIDOR_LIMIT + 1),
      FREE_HUMIDOR_LIMIT
    );

    if (count >= FREE_HUMIDOR_LIMIT) {
      return buildFailure('limits.freeHumidorsExceeded', count, FREE_HUMIDOR_LIMIT);
    }

    return { canCreate: true, currentCount: count, limit: FREE_HUMIDOR_LIMIT, reason: null };
  } catch (error) {
    console.error('[limitChecks] failed to verify humidor limit', error);
    return buildFailure('limits.unableToVerify', null, FREE_HUMIDOR_LIMIT);
  }
}
