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

  it('defines cigarkeeper and winekeeper annual plans', () => {
    expect(SUBSCRIPTION_PLANS.cigarkeeper_pro_annual?.modules).toEqual(['cigarkeeper']);
    expect(SUBSCRIPTION_PLANS.winekeeper_pro_annual?.modules).toEqual(['winekeeper']);
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

  it('defines three and four module bundles', () => {
    expect(SUBSCRIPTION_PLANS.three_module_bundle_annual?.modules).toEqual([
      'pipekeeper',
      'whiskeykeeper',
      'cigarkeeper',
    ]);
    expect(SUBSCRIPTION_PLANS.four_module_bundle_annual?.modules).toEqual([
      'pipekeeper',
      'whiskeykeeper',
      'cigarkeeper',
      'winekeeper',
    ]);
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

  it('detects CigarKeeper and WineKeeper from subscription records', () => {
    const cigarState = stateFor([makeSub('cigarkeeper_pro_annual')]);
    const wineState = stateFor([makeSub('winekeeper_pro_annual')]);
    expect(cigarState.hasCigarkeeperPro).toBe(true);
    expect(wineState.hasWinekeeperPro).toBe(true);
  });

  it('unions modules across multiple standalone subscriptions', () => {
    const state = stateFor([
      makeSub('pipekeeper_pro_annual'),
      makeSub('whiskeykeeper_pro_monthly'),
      makeSub('cigarkeeper_pro_annual'),
    ]);
    expect(state.paidModules.sort()).toEqual(['cigarkeeper', 'pipekeeper', 'whiskeykeeper'].sort());
  });

  it('detects bundle from founders_bundle_annual', () => {
    const state = stateFor([makeSub('founders_bundle_annual')]);
    expect(state.hasBundle).toBe(true);
    expect(state.hasPipekeeperPro).toBe(true);
    expect(state.hasWhiskeykeeperPro).toBe(true);
    expect(isFreeUser(state)).toBe(false);
  });

  it('bundle unlocks all included modules', () => {
    const state = stateFor([makeSub('four_module_bundle_annual')]);
    expect(state.hasBundle).toBe(true);
    expect(state.paidModules.sort()).toEqual([
      'pipekeeper',
      'whiskeykeeper',
      'cigarkeeper',
      'winekeeper',
    ].sort());
  });

  it('bundle + standalone overlap remains deduplicated', () => {
    const state = stateFor([
      makeSub('founders_bundle_annual'),
      makeSub('pipekeeper_pro_monthly'),
      makeSub('whiskeykeeper_pro_monthly'),
    ]);
    expect(state.paidModules).toEqual(['pipekeeper', 'whiskeykeeper']);
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
    const state = stateFor([], { paid_modules_csv: 'pipekeeper,whiskeykeeper,cigarkeeper,winekeeper' });
    expect(state.hasPipekeeperPro).toBe(true);
    expect(state.hasWhiskeykeeperPro).toBe(true);
    expect(state.hasCigarkeeperPro).toBe(true);
    expect(state.hasWinekeeperPro).toBe(true);
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

  it('founders bundle user has cigar add-on and three-module upgrade actions', () => {
    const state = stateFor([makeSub('founders_bundle_annual')]);
    expect(state.eligibleActions).toContain('add_cigarkeeper_module');
    expect(state.eligibleActions).toContain('upgrade_to_three_module_bundle');
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

  it('returns CigarKeeper and WineKeeper labels for single-module subs', () => {
    expect(getCurrentPlanLabel(stateFor([makeSub('cigarkeeper_pro_annual')]))).toBe('CigarKeeper Pro');
    expect(getCurrentPlanLabel(stateFor([makeSub('winekeeper_pro_annual')]))).toBe('WineKeeper Pro');
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

  it('returns founders add-on and three-module options for founders bundle user', () => {
    const options = getAvailableUpgradeOptions(stateFor([makeSub('founders_bundle_annual')]));
    const actions = options.map((o) => o.action);
    expect(actions).toContain('add_cigarkeeper_module');
    expect(actions).toContain('upgrade_to_three_module_bundle');
  });

  it('returns bundle + missing-module upgrade options for PK Pro user', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);

    const actions = options.map((o) => o.action);
    expect(actions).toContain('upgrade_to_bundle');
    expect(actions).toContain('add_whiskeykeeper_module');
    expect(actions).toContain('add_cigarkeeper_module');
    expect(actions).toContain('upgrade_to_three_module_bundle');
    expect(options).toHaveLength(4);
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

  it('add_whiskeykeeper_module option for PK Pro targets whiskeykeeper_pro_annual', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const addOpt = options.find((o) => o.action === 'add_whiskeykeeper_module');

    expect(addOpt).toBeDefined();
    expect(addOpt.actionType).toBe('add_complementary_module');
    expect(addOpt.targetPlanKey).toBe('whiskeykeeper_pro_annual');
  });

  it('returns correct options for WK Pro user', () => {
    const state = stateFor([makeSub('whiskeykeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const actions = options.map((o) => o.action);

    expect(actions).toContain('upgrade_to_bundle');
    expect(actions).toContain('add_pipekeeper_module');
    expect(actions).toContain('add_cigarkeeper_module');
    expect(actions).toContain('upgrade_to_three_module_bundle');

    const addOpt = options.find((o) => o.action === 'add_pipekeeper_module');
    expect(addOpt.targetPlanKey).toBe('pipekeeper_pro_annual');
    expect(addOpt.actionType).toBe('add_complementary_module');
  });

  it('upgrade_to_bundle option for PK monthly Pro uses founders_bundle_monthly', () => {
    const state = stateFor([makeSub('pipekeeper_pro_monthly')]);
    const options = getAvailableUpgradeOptions(state);
    const bundleOpt = options.find((o) => o.action === 'upgrade_to_bundle');

    expect(bundleOpt).toBeDefined();
    expect(bundleOpt.targetPlanKey).toBe('founders_bundle_monthly');
  });

  it('upgrade_to_bundle option for PK annual Pro uses founders_bundle_annual', () => {
    const state = stateFor([makeSub('pipekeeper_pro_annual')]);
    const options = getAvailableUpgradeOptions(state);
    const bundleOpt = options.find((o) => o.action === 'upgrade_to_bundle');

    expect(bundleOpt).toBeDefined();
    expect(bundleOpt.targetPlanKey).toBe('founders_bundle_annual');
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
  it('returns 5 options for free users when CigarKeeper is launched', () => {
    const options = getNewPurchaseOptions();
    expect(options.length).toBe(5);
    expect(options.some((o) => o.targetPlanKey?.startsWith('three_module_bundle'))).toBe(true);
    expect(options.some((o) => o.targetPlanKey?.startsWith('winekeeper'))).toBe(false);
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
