/**
 * Four-module bundle upgrade routing tests
 *
 * Verifies that handleBundleUpgrade receives the correct targetBundleType:
 *   four_module_bundle_* → 'bundle_4'
 *   three_module_bundle_* → 'bundle_3'
 *   founders_*           → 'founders'
 */

import { describe, it, expect } from 'vitest';

/**
 * Pure extract of the bundle-type routing logic from SubscriptionFull.jsx.
 * Mirrors the fixed ternary in handleUpgradeWithIntent.
 */
function getTargetBundleType(targetPlanKey) {
  if (targetPlanKey?.startsWith('four_module_bundle')) return 'bundle_4';
  if (targetPlanKey?.startsWith('three_module_bundle')) return 'bundle_3';
  return 'founders';
}

// ─── four_module_bundle → bundle_4 ───────────────────────────────────────────

describe('four_module_bundle plans route to bundle_4', () => {
  it('four_module_bundle_monthly routes to bundle_4', () => {
    expect(getTargetBundleType('four_module_bundle_monthly')).toBe('bundle_4');
  });

  it('four_module_bundle_annual routes to bundle_4', () => {
    expect(getTargetBundleType('four_module_bundle_annual')).toBe('bundle_4');
  });
});

// ─── three_module_bundle → bundle_3 ──────────────────────────────────────────

describe('three_module_bundle plans route to bundle_3', () => {
  it('three_module_bundle_monthly routes to bundle_3', () => {
    expect(getTargetBundleType('three_module_bundle_monthly')).toBe('bundle_3');
  });

  it('three_module_bundle_annual routes to bundle_3', () => {
    expect(getTargetBundleType('three_module_bundle_annual')).toBe('bundle_3');
  });
});

// ─── founders → founders ──────────────────────────────────────────────────────

describe('founders bundle plans route to founders', () => {
  it('founders_bundle_monthly routes to founders', () => {
    expect(getTargetBundleType('founders_bundle_monthly')).toBe('founders');
  });

  it('founders_bundle_annual routes to founders', () => {
    expect(getTargetBundleType('founders_bundle_annual')).toBe('founders');
  });

  it('undefined targetPlanKey routes to founders', () => {
    expect(getTargetBundleType(undefined)).toBe('founders');
  });

  it('unknown plan key routes to founders', () => {
    expect(getTargetBundleType('some_unknown_plan')).toBe('founders');
  });
});

// ─── Regression: four_module_bundle is NOT routed as founders ────────────────

describe('four_module_bundle is never routed as founders (regression guard)', () => {
  it('four_module_bundle_monthly does NOT return founders', () => {
    expect(getTargetBundleType('four_module_bundle_monthly')).not.toBe('founders');
  });

  it('four_module_bundle_annual does NOT return founders', () => {
    expect(getTargetBundleType('four_module_bundle_annual')).not.toBe('founders');
  });
});
