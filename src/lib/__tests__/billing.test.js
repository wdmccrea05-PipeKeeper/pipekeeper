import { describe, it, expect } from 'vitest';
import { getUserSubscriptionState, isFreeUser, getCurrentPlanLabel } from '../billing/subscriptionState';
import { getAvailableUpgradeOptions, getNewPurchaseOptions } from '../billing/upgradePaths';
import { SUBSCRIPTION_PLANS } from '../billing/subscriptionPlans';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSub(planKey, status = 'active') {
  return { plan_key: planKey, status };
}

function stateFor(subs = [], user = null) {
  return getUserSubscriptionState({ activeSubscriptions: subs, user });
}

// ─── SUBSCRIPTION_PLANS ─────────────────────────────────────────────────────

describe('SUBSCRIPTION_PLANS', () => {
  it('defines pipekeeper_pro_annual', () => {
    const plan = SUBSCRIPTION_PLANS.pipekeeper_pro_annual;
    expect(plan).toBeDefined();
    expect(plan.modules).toEqual(['pipekeeper']);
    expect(plan.type).toBe('single_module');
    expect(plan.displayPrice).toBe(29.99);
  });

  it('defines whiskeykeeper_pro_annual', () => {
    const plan = SUBSCRIPTION_PLANS.whiskeykeeper_pro_annual;
    expect(plan).toBeDefined();
    expect(plan.modules).toEqual(['whiskeykeeper']);
  });

  it('defines founders_bundle_annual with 2 modules', () => {
    const plan = SUBSCRIPTION_PLANS.founders_bundle_annual;
    expect(plan).toBeDefined();
    expect(plan.type).toBe('bundle');
    expect(plan.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(plan.displayPrice).toBe(49.99);
  });

  it('defines founders_bundle_monthly', () => {
    const plan = SUBSCRIPTION_PLANS.founders_bundle_monthly;
    expect(plan).toBeDefined();
    expect(plan.type).toBe('bundle');
    expect(plan.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(plan.displayPrice).toBe(4.99);
  });
});

// ─── getUserSubscriptionState ────────────────────────────────────────────────

describe('getUserSubscriptionState', () => {
  it('returns free user state for empty subscriptions', () => {
    const state = stateFor([]);
    expect(state.hasPipekeeperPro).toBe(false);
    expect(state.hasWhiskeykeeperPro).toBe(false);
    expect(state.hasBundle).toBe(false);
    expect(state.activePlanKeys).toEqual([]);
    expect(state.eligibleActions).toEqual([]);
    expect(isFreeUser(state)).toBe(true);
  });

  it('detects PipeKeeper Pro from subscription record', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    expect(state.hasPipekeeperPro).toBe(true);
    expect(state.hasWhiskeykeeperPro).toBe(false);
    expect(state.hasBundle).toBe(false);
    expect(isFreeUser(state)).toBe(false);
  });

  it('detects WhiskeyKeeper Pro from subscription record', () => {
    const state = stateFor([makeSub('whiskeykeeper_pro_annual')]);
    expect(state.hasPipekeeperPro).toBe(false);
    expect(state.hasWhiskeykeeperPro).toBe(true);
    expect(state.hasBundle).toBe(false);
  });

  it('detects bundle from founders_bundle_annual', () => {
    const state = stateFor([makeSub('founders_bundle_annual')]);
    expect(state.hasBundle).toBe(true);
    expect(state.hasPipekeeperPro).toBe(true);
    expect(state.hasWhiskeykeeperPro).toBe(true);
    expect(isFreeUser(state)).toBe(false);
  });

  it('detects bundle from founders_bundle_monthly', () => {
    const state = stateFor([makeSub('founders_bundle_monthly')]);
    expect(state.hasBundle).toBe(true);
  });

  it('ignores canceled subscriptions', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual', 'canceled')]);
    expect(state.hasPipekeeperPro).toBe(false);
    expect(isFreeUser(state)).toBe(true);
  });

  it('accepts trialing as active', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual', 'trialing')]);
    expect(state.hasPipekeeperPro).toBe(true);
  });

  it('accepts past_due as active', () => {
    const state = stateFor([makeSub('whiskeykeeper_pro_annual', 'past_due')]);
    expect(state.hasWhiskeykeeperPro).toBe(true);
  });

  it('falls back to paid_modules_csv on user when no subscription records', () => {
    const state = stateFor([], { paid_modules_csv: 'pipekeeper,whiskeykeeper' });
    expect(state.hasPipekeeperPro).toBe(true);
    expect(state.hasWhiskeykeeperPro).toBe(true);
  });

  it('detects bundle from user.isFoundingMember', () => {
    const state = stateFor([], { isFoundingMember: true, paid_modules_csv: 'pipekeeper,whiskeykeeper' });
    expect(state.hasBundle).toBe(true);
  });

  it('PK Pro user has correct eligibleActions', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    expect(state.eligibleActions).toContain('upgrade_to_bundle');
    expect(state.eligibleActions).toContain('add_whiskeykeeper_module');
  });

  it('WK Pro user has correct eligibleActions', () => {
    const state = stateFor([makeSub('whiskeykeeper_pro_annual')]);
    expect(state.eligibleActions).toContain('upgrade_to_bundle');
    expect(state.eligibleActions).toContain('add_pipekeeper_module');
  });

  it('bundle user has empty eligibleActions', () => {
    const state = stateFor([makeSub('founders_bundle_annual')]);
    expect(state.eligibleActions).toEqual([]);
  });
});

// ─── getCurrentPlanLabel ─────────────────────────────────────────────────────

describe('getCurrentPlanLabel', () => {
  it('returns null for free user', () => {
    expect(getCurrentPlanLabel(stateFor([]))).toBeNull();
  });

  it('returns PipeKeeper Pro for PK sub', () => {
    expect(getCurrentPlanLabel(stateFor([makeSub('pipekeeper_pro_annual')]))).toBe('PipeKeeper Pro');
  });

  it('returns WhiskeyKeeper Pro for WK sub', () => {
    expect(getCurrentPlanLabel(stateFor([makeSub('whiskeykeeper_pro_annual')]))).toBe('WhiskeyKeeper Pro');
  });

  it('returns Founders Bundle for bundle', () => {
    expect(getCurrentPlanLabel(stateFor([makeSub('founders_bundle_annual')]))).toBe('Founders Bundle');
  });
});

// ─── getAvailableUpgradeOptions ─────────────────────────────────────────────

describe('getAvailableUpgradeOptions', () => {
  it('returns empty array for free user', () => {
    const options = getAvailableUpgradeOptions(stateFor([]));
    expect(options).toEqual([]);
  });

  it('returns empty array for bundle user', () => {
    const options = getAvailableUpgradeOptions(stateFor([makeSub('founders_bundle_annual')]));
    expect(options).toEqual([]);
  });

  it('returns upgrade_to_bundle and add_other_module for PK Pro user', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);

    const actions = options.map((o) => o.action);
    expect(actions).toContain('upgrade_to_bundle');
    expect(actions).toContain('add_other_module');
    expect(options).toHaveLength(2);
  });

  it('upgrade_to_bundle option for PK Pro uses founders_bundle_annual', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const bundleOpt = options.find((o) => o.action === 'upgrade_to_bundle');

    expect(bundleOpt).toBeDefined();
    expect(bundleOpt.actionType).toBe('upgrade_existing');
    expect(bundleOpt.targetPlanKey).toBe('founders_bundle_annual');
    expect(bundleOpt.currentPlanKey).toBe('pipekeeper_pro_annual');
  });

  it('add_other_module option for PK Pro targets whiskeykeeper_pro_annual', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const addOpt = options.find((o) => o.action === 'add_other_module');

    expect(addOpt).toBeDefined();
    expect(addOpt.actionType).toBe('add_complementary_module');
    expect(addOpt.targetPlanKey).toBe('whiskeykeeper_pro_annual');
  });

  it('returns correct options for WK Pro user', () => {
    const state = stateFor([makeSub('whiskeykeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const actions = options.map((o) => o.action);

    expect(actions).toContain('upgrade_to_bundle');
    expect(actions).toContain('add_other_module');

    const addOpt = options.find((o) => o.action === 'add_other_module');
    expect(addOpt.targetPlanKey).toBe('pipekeeper_pro_annual');
    expect(addOpt.actionType).toBe('add_complementary_module');
  });

  it('bundle option has correct description for WK Pro user', () => {
    const state = stateFor([makeSub('whiskeykeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const bundleOpt = options.find((o) => o.action === 'upgrade_to_bundle');
    expect(bundleOpt.description).toMatch(/WhiskeyKeeper/i);
  });
});

// ─── getNewPurchaseOptions ───────────────────────────────────────────────────

describe('getNewPurchaseOptions', () => {
  it('returns 3 options for free users', () => {
    const options = getNewPurchaseOptions();
    expect(options.length).toBe(3);
  });

  it('all options have actionType new_purchase', () => {
    const options = getNewPurchaseOptions();
    expect(options.every((o) => o.actionType === 'new_purchase')).toBe(true);
  });

  it('all options have null currentPlanKey', () => {
    const options = getNewPurchaseOptions();
    expect(options.every((o) => o.currentPlanKey === null)).toBe(true);
  });
});
