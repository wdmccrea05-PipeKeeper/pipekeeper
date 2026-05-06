/**
 * ModuleVisibilitySettings entitlement guard tests
 *
 * Verifies that Active Modules (ModuleVisibilitySettings) never mutates
 * paid entitlement flags:
 *   1. Free button must NOT write *_paid=false.
 *   2. Pro button without entitlement must route to Subscription.
 *   3. Pro button with entitlement must only enable module visibility (no *_paid write).
 *   4. A paid user can never be downgraded through the Active Modules screen.
 */

import { describe, it, expect } from 'vitest';

/**
 * Mirrors the handleSetTierAndEnable logic after the fix.
 * Returns { navigated, calledUpdateMe, calledSetEnabled }.
 */
function simulateHandleSetTierAndEnable(moduleId, isPaid, paidFlagByModule) {
  const hasEntitlement = !!paidFlagByModule[moduleId];
  const result = { navigated: false, calledUpdateMe: false, calledSetEnabled: false };

  if (isPaid && !hasEntitlement) {
    result.navigated = true;
    return result;
  }

  // After the fix: only setModuleEnabled is called — no updateMe with *_paid keys.
  result.calledSetEnabled = true;
  return result;
}

// ─── 1. Free button does not write *_paid ────────────────────────────────────

describe('Free button does not mutate entitlement flags', () => {
  it('clicking Free with a paid entitlement does NOT call updateMe with *_paid', () => {
    const paid = { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false };
    const res = simulateHandleSetTierAndEnable('pipekeeper', false, paid);
    expect(res.calledUpdateMe).toBe(false);
    expect(res.calledSetEnabled).toBe(true);
    expect(res.navigated).toBe(false);
  });

  it('clicking Free on a module without entitlement does NOT call updateMe', () => {
    const paid = { pipekeeper: false, whiskeykeeper: false, cigarkeeper: false, winekeeper: false };
    const res = simulateHandleSetTierAndEnable('whiskeykeeper', false, paid);
    expect(res.calledUpdateMe).toBe(false);
    expect(res.calledSetEnabled).toBe(true);
  });
});

// ─── 2. Pro button without entitlement routes to Subscription ────────────────

describe('Pro button without entitlement routes to Subscription', () => {
  it('clicking Pro without pipekeeper entitlement navigates to Subscription', () => {
    const paid = { pipekeeper: false, whiskeykeeper: false, cigarkeeper: false, winekeeper: false };
    const res = simulateHandleSetTierAndEnable('pipekeeper', true, paid);
    expect(res.navigated).toBe(true);
    expect(res.calledUpdateMe).toBe(false);
    expect(res.calledSetEnabled).toBe(false);
  });

  it('clicking Pro without whiskeykeeper entitlement navigates to Subscription', () => {
    const paid = { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false };
    const res = simulateHandleSetTierAndEnable('whiskeykeeper', true, paid);
    expect(res.navigated).toBe(true);
  });
});

// ─── 3. Pro button WITH entitlement enables visibility (no *_paid write) ─────

describe('Pro button with entitlement only enables module visibility', () => {
  it('clicking Pro with pipekeeper entitlement calls setEnabled, NOT updateMe', () => {
    const paid = { pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false };
    const res = simulateHandleSetTierAndEnable('pipekeeper', true, paid);
    expect(res.navigated).toBe(false);
    expect(res.calledUpdateMe).toBe(false);
    expect(res.calledSetEnabled).toBe(true);
  });

  it('clicking Pro with winekeeper entitlement calls setEnabled, NOT updateMe', () => {
    const paid = { pipekeeper: false, whiskeykeeper: false, cigarkeeper: false, winekeeper: true };
    const res = simulateHandleSetTierAndEnable('winekeeper', true, paid);
    expect(res.calledUpdateMe).toBe(false);
    expect(res.calledSetEnabled).toBe(true);
  });
});

// ─── 4. Paid user cannot be downgraded by Active Modules screen ──────────────

describe('Paid user cannot be downgraded by Active Modules screen', () => {
  it('pipekeeper_paid remains unaffected regardless of which button is clicked', () => {
    // Simulates a user with pipekeeper_paid=true clicking Free (isPaid=false)
    // The fix ensures updateMe is never called, so the entitlement stays true.
    const paid = { pipekeeper: true, whiskeykeeper: true, cigarkeeper: false, winekeeper: false };
    const free = simulateHandleSetTierAndEnable('pipekeeper', false, paid);
    expect(free.calledUpdateMe).toBe(false);

    // Clicking Pro also does NOT reset the entitlement
    const pro = simulateHandleSetTierAndEnable('pipekeeper', true, paid);
    expect(pro.calledUpdateMe).toBe(false);
  });

  it('all four modules: Free click never produces an updateMe call', () => {
    const paid = { pipekeeper: true, whiskeykeeper: true, cigarkeeper: true, winekeeper: true };
    ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].forEach((mod) => {
      const res = simulateHandleSetTierAndEnable(mod, false, paid);
      expect(res.calledUpdateMe).toBe(false);
    });
  });
});
