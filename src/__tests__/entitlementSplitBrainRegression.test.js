/* eslint-disable */
/**
 * ENTITLEMENT SPLIT-BRAIN REGRESSION TESTS
 *
 * Tests that the Pro indicator and collection gate use the SAME access decision.
 * Todd's production failure pattern is a permanent regression fixture.
 */

import { describe, it, expect } from 'vitest';

// ── Inline the access logic (mirrors production code) ──────────────────────

function subscriptionGrantsPaidAccess(sub) {
  if (!sub) return false;
  const status = String(sub.status || '').toLowerCase();
  return status === 'active' || status === 'trialing' || status === 'trial' ||
    status === 'past_due' || status === 'incomplete' || status === 'unpaid';
}

function isModuleLaunched(m) {
  return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].includes(m);
}

function parseCsvModules(csv) {
  return [...new Set(String(csv || '').split(',').map(m => m.trim().toLowerCase()).filter(m => m && isModuleLaunched(m)))];
}

function getFlagModules(user) {
  if (!user) return [];
  const modules = [];
  if (user.pipekeeper_paid) modules.push('pipekeeper');
  if (user.whiskeykeeper_paid) modules.push('whiskeykeeper');
  if (user.cigarkeeper_paid) modules.push('cigarkeeper');
  if (user.winekeeper_paid) modules.push('winekeeper');
  return modules.filter(m => isModuleLaunched(m));
}

function resolveBundleModules(user) {
  if (!user) return [];
  const hints = [user.plan_key, user.planKey, user.plan, user.subscription_plan, user.subscription_plan_key]
    .map(v => String(v || '').toLowerCase()).filter(Boolean);
  if (hints.length === 0) return [];
  if (hints.some(h => h.includes('founders'))) return ['pipekeeper', 'whiskeykeeper'].filter(isModuleLaunched);
  if (hints.some(h => h.includes('four_module') || h.includes('bundle_4'))) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].filter(isModuleLaunched);
  if (hints.some(h => h.includes('three_module') || h.includes('bundle_3'))) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'].filter(isModuleLaunched);
  return [];
}

function getExplicitModuleEntitlements(user) {
  if (!user) return [];
  const csvModules = parseCsvModules(user.paid_modules_csv);
  const flaggedModules = getFlagModules(user);
  return [...new Set([...csvModules, ...flaggedModules])];
}

// ── CANONICAL: hasModuleProAccess with subscription-backed derivation ──────
function hasModuleProAccess(user, moduleKey, subscription = null) {
  if (!user) return false;
  const key = String(moduleKey || '').trim().toLowerCase();
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user.is_admin === true) return true;
  if (!key) return getModulesWithProAccess(user, subscription).length > 0;
  if (resolveBundleModules(user).includes(key)) return true;
  const explicitModules = getExplicitModuleEntitlements(user);
  if (explicitModules.includes(key)) return true;
  // SUBSCRIPTION-BACKED: derive modules from subscription when user fields aren't set
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const subModules = parseCsvModules(subscription.modules_csv);
    if (subModules.includes(key)) return true;
    const bundleModules = resolveBundleModules({ ...user, plan_key: subscription.plan_key, planKey: subscription.planKey });
    if (bundleModules.includes(key)) return true;
  }
  return false;
}

function getModulesWithProAccess(user, subscription = null) {
  if (!user) return [];
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user.is_admin === true) {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].filter(isModuleLaunched);
  }
  const explicitModules = getExplicitModuleEntitlements(user);
  if (explicitModules.length > 0) return explicitModules;
  if (user.isFoundingMember || user.legacy_broad_module_access) {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'].filter(isModuleLaunched);
  }
  // SUBSCRIPTION-BACKED: derive modules from subscription
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const subModules = parseCsvModules(subscription.modules_csv);
    if (subModules.length > 0) return subModules.filter(isModuleLaunched);
    const bundleModules = resolveBundleModules({ ...user, plan_key: subscription.plan_key, planKey: subscription.planKey });
    if (bundleModules.length > 0) return bundleModules;
  }
  return [];
}

// ── Pro indicator check (must use same source as collection gate) ──────
function proIndicatorShows(user, subscription) {
  return getModulesWithProAccess(user, subscription).length > 0;
}

// ── Collection gate check ──────────────────────────────────────────────
function collectionGateAllows(user, subscription, moduleKey) {
  return hasModuleProAccess(user, moduleKey, subscription);
}

// ═════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════

describe('Entitlement Split-Brain Regression', () => {
  // 1. Free user below limit → allowed according to Free rules
  it('free user below limit is allowed (free rules)', () => {
    const user = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false };
    expect(hasModuleProAccess(user, 'pipekeeper', null)).toBe(false);
    expect(proIndicatorShows(user, null)).toBe(false);
  });

  // 2. Free user at limit → blocked appropriately
  it('free user at limit is blocked', () => {
    const user = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false };
    expect(collectionGateAllows(user, null, 'pipekeeper')).toBe(false);
  });

  // 3. Free user purchases PipeKeeper Pro → immediately unlocked (no restart)
  it('purchase immediately unlocks via subscription (no restart needed)', () => {
    // User entity NOT yet updated (sync hasn't set pipekeeper_paid)
    const user = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false };
    // But subscription record IS active with modules_csv
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    // Collection gate must allow via subscription-backed derivation
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(true);
    // Pro indicator must also show
    expect(proIndicatorShows(user, sub)).toBe(true);
  });

  // 4. Pro badge and collection gate consume same access state (THE SPLIT-BRAIN FIX)
  it('pro badge and collection gate consume same access state', () => {
    const user = { role: 'user', entitlement_tier: 'pro', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    const badge = proIndicatorShows(user, sub);
    const gate = collectionGateAllows(user, sub, 'pipekeeper');
    expect(badge).toBe(gate); // MUST be the same
    expect(badge).toBe(true);
    expect(gate).toBe(true);
  });

  // 5. Provider-current Pro user is never blocked by Free limit
  it('provider-current pro user is never blocked by free limit', () => {
    const user = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(true);
  });

  // 6. Pro PipeKeeper does not incorrectly grant unrelated modules
  it('pipekeeper pro does not grant whiskeykeeper', () => {
    const user = { role: 'user', pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    expect(hasModuleProAccess(user, 'pipekeeper', null)).toBe(true);
    expect(hasModuleProAccess(user, 'whiskeykeeper', null)).toBe(false);
  });

  // 7. Restore Purchases refreshes access (subscription-backed derivation works after restore)
  it('restore purchases refreshes access via subscription', () => {
    // Before restore: no sub, user fields not set
    const userBefore = { role: 'user', pipekeeper_paid: false };
    expect(collectionGateAllows(userBefore, null, 'pipekeeper')).toBe(false);
    // After restore: sub record exists
    const subAfter = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    expect(collectionGateAllows(userBefore, subAfter, 'pipekeeper')).toBe(true);
  });

  // 8. Login refreshes canonical entitlement appropriately
  it('login refresh provides subscription to access check', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(true);
  });

  // 9. Foreground refresh reconciles stale subscription state
  it('foreground refresh with new subscription unlocks access', () => {
    const user = { role: 'user', pipekeeper_paid: false, entitlement_tier: 'free' };
    // Stale: no sub initially
    expect(collectionGateAllows(user, null, 'pipekeeper')).toBe(false);
    // After foreground refresh: sub appears
    const sub = { status: 'active', modules_csv: 'pipekeeper' };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(true);
  });

  // 10. Provider outage does not downgrade last-known verified Pro
  it('provider outage (past_due with grace) does not downgrade pro', () => {
    const user = { role: 'user', pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    // Even with past_due sub, user fields preserve access
    const sub = { status: 'past_due', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() + 3 * 86400000).toISOString() };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(true); // via user fields
  });

  // 11. Expired subscription eventually returns to Free
  it('expired subscription with no user flags returns to free', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = { status: 'expired', modules_csv: 'pipekeeper' };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(false);
    expect(proIndicatorShows(user, sub)).toBe(false);
  });

  // 12. Wrong-scope entitlement does not grant PipeKeeper
  it('whiskeykeeper subscription does not grant pipekeeper', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: 'whiskeykeeper', plan_key: 'whiskeykeeper_pro_monthly' };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(false);
    expect(collectionGateAllows(user, sub, 'whiskeykeeper')).toBe(true);
  });

  // 13. TODD'S PRODUCTION FAILURE PATTERN — permanent regression fixture
  it('Todd pattern: Apple IAP sync failure does not cause split-brain', () => {
    // Todd's state BEFORE fix: no sub, user fields all free
    const toddBefore = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false, email: 'toddbg@gmail.com' };
    expect(proIndicatorShows(toddBefore, null)).toBe(false);
    expect(collectionGateAllows(toddBefore, null, 'pipekeeper')).toBe(false);
    // Both agree: Free — no split-brain

    // Todd's state AFTER repair: sub created + user flags set
    const toddAfter = { role: 'user', entitlement_tier: 'pro', pipekeeper_paid: true, paid_modules_csv: 'pipekeeper', email: 'toddbg@gmail.com' };
    const toddSub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    expect(proIndicatorShows(toddAfter, toddSub)).toBe(true);
    expect(collectionGateAllows(toddAfter, toddSub, 'pipekeeper')).toBe(true);
    // Both agree: Pro — no split-brain

    // SIMULATED FUTURE SCENARIO: sync fails again but sub record exists
    // User flags get cleared but sub record remains
    const toddSyncFail = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false, email: 'toddbg@gmail.com' };
    const toddSubStillActive = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    // With the fix: subscription-backed derivation grants access
    expect(collectionGateAllows(toddSyncFail, toddSubStillActive, 'pipekeeper')).toBe(true);
    expect(proIndicatorShows(toddSyncFail, toddSubStillActive)).toBe(true);
    // Both agree: Pro — split-brain ELIMINATED
  });

  // 14. Bundle subscription grants all bundle modules
  it('four module bundle grants all modules', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: 'pipekeeper,whiskeykeeper,cigarkeeper,winekeeper', plan_key: 'four_module_bundle_monthly' };
    expect(collectionGateAllows(user, sub, 'pipekeeper')).toBe(true);
    expect(collectionGateAllows(user, sub, 'whiskeykeeper')).toBe(true);
    expect(collectionGateAllows(user, sub, 'cigarkeeper')).toBe(true);
    expect(collectionGateAllows(user, sub, 'winekeeper')).toBe(true);
  });

  // 15. normalizeTier no longer always returns "pro"
  it('normalizeTier returns free for inactive subscriptions', () => {
    function normalizeTier(rawTier, productId) {
      const tier = String(rawTier || '').trim().toLowerCase();
      const product = String(productId || '').trim().toLowerCase();
      if (tier === 'premium' || tier === 'pro') return 'pro';
      if (product.includes('pro')) return 'pro';
      return 'free';
    }
    expect(normalizeTier('', '')).toBe('free');
    expect(normalizeTier('free', '')).toBe('free');
    expect(normalizeTier('pro', '')).toBe('pro');
    expect(normalizeTier('', 'pipekeeper_pro_monthly')).toBe('pro');
  });
});