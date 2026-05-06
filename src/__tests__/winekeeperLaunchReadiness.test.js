/**
 * WineKeeper Launch Readiness Tests (internal/pre-launch state)
 *
 * Verifies that all gating is correct while WINEKEEPER_PUBLIC_ENABLED is false:
 *   1. WineKeeper release state is 'internal'
 *   2. Checkout success route is /WineKeeper (fixed from /CollectionHub)
 *   3. WineKeeper Stripe plans are unavailable when module is internal
 *   4. 4-module bundle is unavailable when WineKeeper is internal
 *   5. subscriptionState excludes WineKeeper from eligibleActions when internal
 *   6. SUBSCRIPTION_PLANS includes all four winekeeper/bundle plan keys
 *   7. CigarKeeper Free can access module without Pro
 *   8. CigarKeeper Pro plans show on subscription page
 */

import { describe, it, expect } from 'vitest';

import {
  WINEKEEPER_PUBLIC_ENABLED,
  isModuleLaunched,
  isModuleInternal,
  canUserAccessModule,
  shouldShowModuleInNav,
} from '@/components/utils/moduleReleaseState';
import { getModuleSuccessRoute } from '@/components/subscription/moduleRoutes';
import { getStripeConfig } from '@/components/subscription/stripeConfig';
import { getUserSubscriptionState } from '@/lib/billing/subscriptionState';
import { hasModuleFreeAccess, hasModuleProAccess, getModuleTier } from '@/components/utils/moduleEntitlements';
import { SUBSCRIPTION_PLANS } from '@/lib/billing/subscriptionPlans';

// ─── 1. WineKeeper hidden when flag is false ──────────────────────────────────

describe('WineKeeper hidden when WINEKEEPER_PUBLIC_ENABLED is false', () => {
  it('WINEKEEPER_PUBLIC_ENABLED is false in the test environment', () => {
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(false);
  });

  it('winekeeper release state is internal', () => {
    expect(isModuleLaunched('winekeeper')).toBe(false);
    expect(isModuleInternal('winekeeper')).toBe(true);
  });

  it('public user cannot see WineKeeper in nav', () => {
    const user = { role: 'user', winekeeper_paid: true };
    expect(shouldShowModuleInNav('winekeeper', user, true)).toBe(false);
  });

  it('public user cannot access WineKeeper module', () => {
    const user = { role: 'user', winekeeper_paid: true };
    expect(canUserAccessModule('winekeeper', user, true)).toBe(false);
  });

  it('hasModuleFreeAccess returns false for winekeeper (internal)', () => {
    expect(hasModuleFreeAccess({ role: 'user' }, 'winekeeper')).toBe(false);
  });
});

// ─── 2. Checkout success route is /WineKeeper ────────────────────────────────

describe('WineKeeper checkout success route', () => {
  it('getModuleSuccessRoute returns /WineKeeper for winekeeper', () => {
    expect(getModuleSuccessRoute('winekeeper')).toBe('/WineKeeper');
  });

  it('other module routes are not affected', () => {
    expect(getModuleSuccessRoute('pipekeeper')).toBe('/PipeKeeper');
    expect(getModuleSuccessRoute('whiskeykeeper')).toBe('/WhiskeyKeeper');
    expect(getModuleSuccessRoute('cigarkeeper')).toBe('/CigarKeeper');
  });
});

// ─── 3. WineKeeper Stripe plans hidden when internal ─────────────────────────

describe('WineKeeper Stripe plans unavailable when module is internal', () => {
  it('winekeeper_pro_monthly isAvailable is false when module is internal', () => {
    const config = getStripeConfig();
    expect(config.winekeeper_pro_monthly.isAvailable).toBe(false);
  });

  it('winekeeper_pro_annual isAvailable is false when module is internal', () => {
    const config = getStripeConfig();
    expect(config.winekeeper_pro_annual.isAvailable).toBe(false);
  });

  it('four_module_bundle_monthly isAvailable is false when winekeeper is internal', () => {
    const config = getStripeConfig();
    expect(config.four_module_bundle_monthly.isAvailable).toBe(false);
  });

  it('four_module_bundle_annual isAvailable is false when winekeeper is internal', () => {
    const config = getStripeConfig();
    expect(config.four_module_bundle_annual.isAvailable).toBe(false);
  });
});

// ─── 4. subscriptionState excludes WineKeeper when internal ──────────────────

describe('subscriptionState excludes WineKeeper when module is internal', () => {
  it('getUserSubscriptionState does not add winekeeper to eligibleActions when internal', () => {
    const state = getUserSubscriptionState({
      activeSubscriptions: [{ status: 'active', plan_key: 'pipekeeper_pro_annual' }],
    });
    expect(state.eligibleActions).not.toContain('add_winekeeper_module');
  });

  it('three_module_bundle user does not see upgrade_to_four_module_bundle when winekeeper is internal', () => {
    const state = getUserSubscriptionState({
      activeSubscriptions: [{ status: 'active', plan_key: 'three_module_bundle_annual' }],
    });
    expect(state.eligibleActions).not.toContain('upgrade_to_four_module_bundle');
  });
});

// ─── 5. SUBSCRIPTION_PLANS includes winekeeper and 4-module bundle keys ──────

describe('SUBSCRIPTION_PLANS includes winekeeper and 4-module bundle plan keys', () => {
  it('winekeeper_pro_monthly plan is defined', () => {
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_monthly).toBeDefined();
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_monthly.modules).toContain('winekeeper');
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_monthly.type).toBe('single_module');
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_monthly.term).toBe('monthly');
  });

  it('winekeeper_pro_annual plan is defined', () => {
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_annual).toBeDefined();
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_annual.modules).toContain('winekeeper');
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_annual.term).toBe('annual');
  });

  it('four_module_bundle_monthly plan is defined and includes winekeeper', () => {
    expect(SUBSCRIPTION_PLANS.four_module_bundle_monthly).toBeDefined();
    expect(SUBSCRIPTION_PLANS.four_module_bundle_monthly.modules).toContain('winekeeper');
    expect(SUBSCRIPTION_PLANS.four_module_bundle_monthly.modules).toHaveLength(4);
    expect(SUBSCRIPTION_PLANS.four_module_bundle_monthly.type).toBe('bundle');
  });

  it('four_module_bundle_annual plan is defined and includes winekeeper', () => {
    expect(SUBSCRIPTION_PLANS.four_module_bundle_annual).toBeDefined();
    expect(SUBSCRIPTION_PLANS.four_module_bundle_annual.modules).toContain('winekeeper');
  });
});

// ─── 6. CigarKeeper Free can access module without Pro ───────────────────────

describe('CigarKeeper Free can access module without Pro (regression guard)', () => {
  it('cigarkeeper is launched', () => {
    expect(isModuleLaunched('cigarkeeper')).toBe(true);
    expect(isModuleInternal('cigarkeeper')).toBe(false);
  });

  it('free user has cigarkeeper free access without any subscription', () => {
    const freeUser = { role: 'user' };
    expect(hasModuleFreeAccess(freeUser, 'cigarkeeper')).toBe(true);
    expect(hasModuleProAccess(freeUser, 'cigarkeeper')).toBe(false);
    expect(getModuleTier(freeUser, 'cigarkeeper')).toBe('free');
  });

  it('Subscription Required never fires for cigarkeeper (free access always true when launched)', () => {
    const user = { role: 'user' };
    const subscriptionRequiredCondition =
      !hasModuleProAccess(user, 'cigarkeeper') && !hasModuleFreeAccess(user, 'cigarkeeper');
    expect(subscriptionRequiredCondition).toBe(false);
  });

  it('pipekeeper-only subscriber still gets free cigarkeeper access', () => {
    const user = { role: 'user', pipekeeper_paid: true };
    expect(hasModuleFreeAccess(user, 'cigarkeeper')).toBe(true);
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(false);
  });
});

// ─── 7. CigarKeeper Pro plans show on subscription page ──────────────────────

describe('CigarKeeper Pro plans show on subscription page', () => {
  it('stripeConfig contains cigarkeeper_pro_monthly with correct shape', () => {
    const config = getStripeConfig();
    expect(config.cigarkeeper_pro_monthly).toBeDefined();
    expect(config.cigarkeeper_pro_monthly.modules).toContain('cigarkeeper');
    expect(config.cigarkeeper_pro_monthly.billingPeriod).toBe('monthly');
  });

  it('stripeConfig contains cigarkeeper_pro_annual with correct shape', () => {
    const config = getStripeConfig();
    expect(config.cigarkeeper_pro_annual).toBeDefined();
    expect(config.cigarkeeper_pro_annual.modules).toContain('cigarkeeper');
    expect(config.cigarkeeper_pro_annual.billingPeriod).toBe('annual');
  });

  it('cigarkeeper plans unavailableReason is about env var, not launch state', () => {
    const config = getStripeConfig();
    // cigarkeeper is launched, so the reason must be about missing price ID
    if (config.cigarkeeper_pro_monthly.unavailableReason) {
      expect(config.cigarkeeper_pro_monthly.unavailableReason).not.toContain('not publicly launched');
    }
  });

  it('getUserSubscriptionState does not prevent cigarkeeper upgrade offerings', () => {
    // A pipe-only user should see add_cigarkeeper_module as eligible
    const state = getUserSubscriptionState({
      activeSubscriptions: [{ status: 'active', plan_key: 'pipekeeper_pro_annual' }],
    });
    expect(state.eligibleActions).toContain('add_cigarkeeper_module');
  });
});
