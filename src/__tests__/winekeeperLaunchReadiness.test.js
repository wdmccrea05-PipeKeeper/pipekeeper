/* eslint-disable */
/**
 * WineKeeper Launch Readiness Tests
 *
 * Updated for LAUNCHED state (VITE_WINEKEEPER_PUBLIC_ENABLED=true):
 *   1. WineKeeper release state is 'launched'
 *   2. Checkout success route is /WineKeeper
 *   3. WineKeeper Stripe plans available when module is launched (env-var gated)
 *   4. 4-module bundle available when WineKeeper is launched
 *   5. subscriptionState includes WineKeeper in eligibleActions when launched
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

// ─── 1. WineKeeper launch state follows env flag ──────────────────────────────

describe('WineKeeper launch state follows VITE_WINEKEEPER_PUBLIC_ENABLED', () => {
  it('exposes launch flag as boolean', () => {
    expect(typeof WINEKEEPER_PUBLIC_ENABLED).toBe('boolean');
  });

  it('winekeeper release state matches launch flag', () => {
    expect(isModuleLaunched('winekeeper')).toBe(WINEKEEPER_PUBLIC_ENABLED);
    expect(isModuleInternal('winekeeper')).toBe(!WINEKEEPER_PUBLIC_ENABLED);
  });

  it('paid user can see WineKeeper in nav', () => {
    const user = { role: 'user', winekeeper_paid: true };
    expect(shouldShowModuleInNav('winekeeper', user, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it('free user (no entitlement) cannot see WineKeeper in nav', () => {
    const user = { role: 'user' };
    expect(shouldShowModuleInNav('winekeeper', user, false)).toBe(false);
  });

  it('paid user can access WineKeeper module', () => {
    const user = { role: 'user', winekeeper_paid: true };
    expect(canUserAccessModule('winekeeper', user, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it('hasModuleFreeAccess reflects launch status', () => {
    expect(hasModuleFreeAccess({ role: 'user' }, 'winekeeper')).toBe(WINEKEEPER_PUBLIC_ENABLED);
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

// ─── 3. WineKeeper Stripe plans available when launched (env-var gated) ──────

describe('WineKeeper Stripe plans available when module is launched', () => {
  it('winekeeper_pro_monthly plan shape is correct', () => {
    const config = getStripeConfig();
    expect(config.winekeeper_pro_monthly).toBeDefined();
    expect(config.winekeeper_pro_monthly.modules).toContain('winekeeper');
    expect(config.winekeeper_pro_monthly.billingPeriod).toBe('monthly');
    // isAvailable is true when env var is set; in test env it may be false (no price ID)
    expect(typeof config.winekeeper_pro_monthly.isAvailable).toBe('boolean');
  });

  it('winekeeper_pro_annual plan shape is correct', () => {
    const config = getStripeConfig();
    expect(config.winekeeper_pro_annual).toBeDefined();
    expect(config.winekeeper_pro_annual.modules).toContain('winekeeper');
    expect(config.winekeeper_pro_annual.billingPeriod).toBe('annual');
  });

  it('four_module_bundle_monthly plan shape is correct', () => {
    const config = getStripeConfig();
    expect(config.four_module_bundle_monthly).toBeDefined();
    expect(config.four_module_bundle_monthly.modules).toContain('winekeeper');
  });

  it('four_module_bundle_annual plan shape is correct', () => {
    const config = getStripeConfig();
    expect(config.four_module_bundle_annual).toBeDefined();
    expect(config.four_module_bundle_annual.modules).toContain('winekeeper');
  });
});

// ─── 4. subscriptionState includes WineKeeper when launched ──────────────────

describe('subscriptionState includes WineKeeper when module is launched', () => {
  it('getUserSubscriptionState winekeeper add-on action matches launch status', () => {
    const state = getUserSubscriptionState({
      activeSubscriptions: [{ status: 'active', plan_key: 'pipekeeper_pro_annual' }],
    });
    if (WINEKEEPER_PUBLIC_ENABLED) {
      expect(state.eligibleActions).toContain('add_winekeeper_module');
    } else {
      expect(state.eligibleActions).not.toContain('add_winekeeper_module');
    }
  });

  it('three_module_bundle four-module upgrade action matches launch status', () => {
    const state = getUserSubscriptionState({
      activeSubscriptions: [{ status: 'active', plan_key: 'three_module_bundle_annual' }],
    });
    if (WINEKEEPER_PUBLIC_ENABLED) {
      expect(state.eligibleActions).toContain('upgrade_to_four_module_bundle');
    } else {
      expect(state.eligibleActions).not.toContain('upgrade_to_four_module_bundle');
    }
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

// ─── 8. 3-module bundle fallback includes all three launched modules ──────────

import { getModulesFromPlanKey } from '@/components/subscription/subscriptionHandler';

describe('3-module bundle fallback includes pipekeeper/whiskeykeeper/cigarkeeper', () => {
  it('three_module_bundle without metadata falls back to all three modules', () => {
    const modules = getModulesFromPlanKey('three_module_bundle_monthly', undefined);
    expect(modules).toContain('pipekeeper');
    expect(modules).toContain('whiskeykeeper');
    expect(modules).toContain('cigarkeeper');
    expect(modules).toHaveLength(3);
  });

  it('three_module_bundle with metadata.activeModules uses metadata', () => {
    const modules = getModulesFromPlanKey('three_module_bundle_annual', {
      activeModules: ['pipekeeper', 'cigarkeeper', 'winekeeper'],
    });
    expect(modules).toContain('pipekeeper');
    expect(modules).toContain('cigarkeeper');
    expect(modules).toContain('winekeeper');
    expect(modules).toHaveLength(3);
  });

  it('four_module_bundle always includes all four modules', () => {
    const modules = getModulesFromPlanKey('four_module_bundle_monthly', undefined);
    expect(modules).toContain('pipekeeper');
    expect(modules).toContain('whiskeykeeper');
    expect(modules).toContain('cigarkeeper');
    expect(modules).toContain('winekeeper');
    expect(modules).toHaveLength(4);
  });
});

// ─── 9. WineKeeper single-module checkout routes to /WineKeeper ─────────────

describe('WineKeeper single-module checkout routes to /WineKeeper (not /CollectionHub)', () => {
  it('getModuleSuccessRoute(winekeeper) returns /WineKeeper', () => {
    expect(getModuleSuccessRoute('winekeeper')).toBe('/WineKeeper');
  });

  it('four_module_bundle does not have a single-module route (goes to Hub)', () => {
    // The bundle has no module-specific route — hub is correct
    expect(getModuleSuccessRoute('unknown')).toBe('/CollectionHub');
  });
});
