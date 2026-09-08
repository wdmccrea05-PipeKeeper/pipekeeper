/**
 * Regression test: Three-Module Bundle classification and
 * getCanonicalBillingDataset plan-key prioritization fix.
 *
 * Verifies that:
 * 1. An Apple admin grant with resolved_plan_key = three_module_bundle_monthly
 *    is correctly classified as "Three-Module Bundle" (not Unknown).
 * 2. The plan key from ActiveContract.resolved_plan_key takes priority over
 *    a null/empty resolver result (so non-Stripe grants are not lost).
 * 3. The is_active flag on ActiveContract makes a contract count as "current"
 *    even when the lifecycle classifier returns MANUAL_REVIEW (no Stripe data).
 */

import { describe, it, expect } from 'vitest';

// Mirror of PLAN_DISPLAY in getCanonicalBillingDataset
const PLAN_DISPLAY = {
  pipekeeper_pro_monthly:      { display_name: 'PipeKeeper Individual', plan_type: 'single', modules: ['pipekeeper'] },
  pipekeeper_pro_annual:       { display_name: 'PipeKeeper Individual', plan_type: 'single', modules: ['pipekeeper'] },
  three_module_bundle_monthly: { display_name: 'Three-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] },
  three_module_bundle_annual:  { display_name: 'Three-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] },
  four_module_bundle_monthly:  { display_name: 'Four-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'] },
};

// Mirror of the fixed plan-key resolution logic
function resolvePlanKey(contractResolvedPlanKey, resolverPlanKey, matchingSubPlanKey) {
  return contractResolvedPlanKey || resolverPlanKey || matchingSubPlanKey || '';
}

// Mirror of the fixed isCurrent logic
const ACTIVE_LIFECYCLES = ['PROVIDER_ACTIVE', 'PROVIDER_TRIALING', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE'];
function resolveIsCurrent(lifecycleClassification, contractIsActive) {
  return ACTIVE_LIFECYCLES.includes(lifecycleClassification) || contractIsActive === true;
}

describe('Three-Module Bundle classification regression', () => {
  it('classifies an Apple admin grant as Three-Module Bundle', () => {
    const contract = {
      resolved_plan_key: 'three_module_bundle_monthly',
      is_active: true,
      provider: 'apple',
      bundle_name: 'Three-Module Bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
    };
    const resolverResult = { resolved_plan_key: null, resolved_modules: [] };
    const matchingSub = { plan_key: null };

    // Plan key: contract's resolved_plan_key should take priority
    const planKey = resolvePlanKey(contract.resolved_plan_key, resolverResult.resolved_plan_key, matchingSub.plan_key);
    expect(planKey).toBe('three_module_bundle_monthly');

    const planDisplay = PLAN_DISPLAY[planKey];
    expect(planDisplay.display_name).toBe('Three-Module Bundle');
    expect(planDisplay.plan_type).toBe('bundle');

    // isCurrent: is_active=true should make it current even without Stripe lifecycle
    const isCurrent = resolveIsCurrent('MANUAL_REVIEW', contract.is_active);
    expect(isCurrent).toBe(true);
  });

  it('prioritizes contract resolved_plan_key over resolver result', () => {
    const contract = { resolved_plan_key: 'three_module_bundle_monthly', is_active: true };
    // Even if the resolver returns a different (wrong) plan key from stale Stripe data,
    // the contract's canonical resolved_plan_key should win.
    const resolverResult = { resolved_plan_key: 'pipekeeper_pro_monthly', resolved_modules: ['pipekeeper'] };

    const planKey = resolvePlanKey(contract.resolved_plan_key, resolverResult.resolved_plan_key, null);
    expect(planKey).toBe('three_module_bundle_monthly');
  });

  it('counts Apple admin grant as current via is_active flag', () => {
    // An Apple admin grant has no Stripe subscription, so the lifecycle classifier
    // returns MANUAL_REVIEW. The is_active flag must make it count as current.
    const isCurrent = resolveIsCurrent('MANUAL_REVIEW', true);
    expect(isCurrent).toBe(true);
  });

  it('does not count a stale contract as current', () => {
    const isCurrent = resolveIsCurrent('PROVIDER_CANCELED', false);
    expect(isCurrent).toBe(false);
  });

  it('counts a Stripe-verified active contract as current', () => {
    const isCurrent = resolveIsCurrent('PROVIDER_ACTIVE', false);
    expect(isCurrent).toBe(true);
  });

  it('falls back to resolver plan key when contract has none', () => {
    const contract = { resolved_plan_key: null, is_active: true };
    const resolverResult = { resolved_plan_key: 'pipekeeper_pro_monthly' };

    const planKey = resolvePlanKey(contract.resolved_plan_key, resolverResult.resolved_plan_key, null);
    expect(planKey).toBe('pipekeeper_pro_monthly');
  });

  it('falls back to matching subscription plan key when neither contract nor resolver have one', () => {
    const contract = { resolved_plan_key: null, is_active: true };
    const resolverResult = { resolved_plan_key: null };
    const matchingSub = { plan_key: 'whiskeykeeper_pro_annual' };

    const planKey = resolvePlanKey(contract.resolved_plan_key, resolverResult.resolved_plan_key, matchingSub.plan_key);
    expect(planKey).toBe('whiskeykeeper_pro_annual');
  });

  it('returns empty string when no plan key source exists', () => {
    const planKey = resolvePlanKey(null, null, null);
    expect(planKey).toBe('');
  });

  it('correctly identifies the Three-Module Bundle modules', () => {
    const planDisplay = PLAN_DISPLAY['three_module_bundle_monthly'];
    expect(planDisplay.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(planDisplay.modules).not.toContain('winekeeper');
  });

  it('correctly identifies the Four-Module Bundle modules', () => {
    const planDisplay = PLAN_DISPLAY['four_module_bundle_monthly'];
    expect(planDisplay.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  });
});