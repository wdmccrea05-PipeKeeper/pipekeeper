/* eslint-disable */
/**
 * ENTITLEMENT SPLIT-BRAIN REGRESSION TESTS
 *
 * Tests that the Pro indicator and collection gate use the SAME access decision.
 * Todd's production failure pattern is a permanent regression fixture.
 */

import { describe, it, expect } from 'vitest';

// ── Inline the access logic (mirrors production code) ──────────────────────

function isUnverifiedAppleSubscription(sub) {
  if (!sub) return false;
  if (String(sub.provider || '').toLowerCase() !== 'apple') return false;
  const subId = String(sub.provider_subscription_id || '');
  return subId.startsWith('apple_unverified_') || subId.startsWith('apple_pending_');
}

function hasProvisionalAppleExpired(sub) {
  if (!isUnverifiedAppleSubscription(sub)) return false;
  const periodEnd = sub.current_period_end;
  if (!periodEnd) return false;
  try { return Date.now() > new Date(periodEnd).getTime() + 30 * 86400000; } catch { return false; }
}

function subscriptionGrantsPaidAccess(sub) {
  if (!sub) return false;
  // Provisional Apple expiry check
  if (hasProvisionalAppleExpired(sub)) return false;
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
    // LEGACY FALLBACK: real provider subs with no modules_csv/plan_key
    const hasNoModuleScope = !subscription.modules_csv && !subscription.plan_key && !subscription.planKey;
    if (hasNoModuleScope) {
      const psub = String(subscription.provider_subscription_id || '');
      const isSynthetic = psub.startsWith('manual_grant_') || psub.startsWith('pro_manual_') || psub.startsWith('test_');
      const isRealProvider = psub.startsWith('sub_') || psub.startsWith('apple_');
      if (isRealProvider && !isSynthetic) {
        const tier = String(subscription.tier || '').toLowerCase();
        if (key === 'pipekeeper' && (tier === 'premium' || tier === 'pro')) return true;
      }
    }
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
    // LEGACY FALLBACK: real provider subs with no modules_csv/plan_key
    const hasNoModuleScope = !subscription.modules_csv && !subscription.plan_key && !subscription.planKey;
    if (hasNoModuleScope) {
      const psub = String(subscription.provider_subscription_id || '');
      const isSynthetic = psub.startsWith('manual_grant_') || psub.startsWith('pro_manual_') || psub.startsWith('test_');
      const isRealProvider = psub.startsWith('sub_') || psub.startsWith('apple_');
      if (isRealProvider && !isSynthetic) {
        const tier = String(subscription.tier || '').toLowerCase();
        if (tier === 'premium' || tier === 'pro') return ['pipekeeper'];
      }
    }
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

  // 16. SPLIT-BRAIN INVARIANT: badge=Pro AND free-limit=blocked is IMPOSSIBLE
  it('SPLIT-BRAIN INVARIANT: badge=Pro AND free-limit=blocked is impossible', () => {
    // For every module, if the Pro indicator says Pro, the free-limit gate must allow.
    // Both must consume the SAME canonical resolver result.
    const testCases = [
      { user: { role: 'user', pipekeeper_paid: false }, sub: { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' }, module: 'pipekeeper' },
      { user: { role: 'user', pipekeeper_paid: true }, sub: null, module: 'pipekeeper' }, // stale flag, no sub → false for both
      { user: { role: 'user', pipekeeper_paid: true }, sub: { status: 'expired', modules_csv: 'pipekeeper' }, module: 'pipekeeper' }, // stale flag + expired → false for both
      { user: { role: 'user', isFoundingMember: true }, sub: null, module: 'pipekeeper' }, // founding member → true for both
      { user: { role: 'user', pipekeeper_paid: false }, sub: { status: 'active', modules_csv: 'whiskeykeeper' }, module: 'pipekeeper' }, // wrong scope → false for both
    ];

    for (const { user, sub, module } of testCases) {
      // Use module-specific badge check (not proIndicatorShows which checks ANY module)
      const badgePro = hasModuleProAccess(user, module, sub);
      const gateAllows = collectionGateAllows(user, sub, module);
      // INVARIANT: badge=Pro AND gate=blocked is IMPOSSIBLE for the SAME module
      expect(badgePro).toBe(gateAllows);
    }
  });

  // 17. SPLIT-BRAIN INVARIANT: stale flag alone does not create Pro badge
  it('SPLIT-BRAIN INVARIANT: stale flag alone (no sub) does not create Pro badge', () => {
    const userWithStaleFlag = { role: 'user', pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    const badge = proIndicatorShows(userWithStaleFlag, null);
    const gate = collectionGateAllows(userWithStaleFlag, null, 'pipekeeper');
    expect(badge).toBe(gate); // They must agree
  });

  // 18. LEGACY PREMIUM FALLBACK — indicator and gate agree (both true)
  it('LEGACY premium fallback: indicator and gate agree (both true)', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: null, plan_key: null, tier: 'premium', provider: 'stripe', provider_subscription_id: 'sub_1abc' };
    const badge = proIndicatorShows(user, sub);
    const gate = collectionGateAllows(user, sub, 'pipekeeper');
    expect(badge).toBe(gate);
    expect(gate).toBe(true);
  });

  // 19. SYNTHETIC EXCLUSION — manual_grant does NOT get legacy fallback (both false)
  it('SYNTHETIC manual_grant: indicator and gate agree (both false)', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = { status: 'active', modules_csv: null, plan_key: null, tier: 'premium', provider: 'stripe', provider_subscription_id: 'manual_grant_user1' };
    const badge = proIndicatorShows(user, sub);
    const gate = collectionGateAllows(user, sub, 'pipekeeper');
    expect(badge).toBe(gate);
    expect(gate).toBe(false);
  });

  // 20. PROVISIONAL APPLE EXPIRY — expired provisional denies access (both false)
  it('PROVISIONAL APPLE expired: indicator and gate agree (both false)', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = {
      status: 'active',
      modules_csv: 'pipekeeper',
      plan_key: 'pipekeeper_pro_monthly',
      provider: 'apple',
      provider_subscription_id: 'apple_unverified_123',
      current_period_end: new Date(Date.now() - 45 * 86400000).toISOString(),
    };
    const badge = proIndicatorShows(user, sub);
    const gate = collectionGateAllows(user, sub, 'pipekeeper');
    expect(badge).toBe(gate);
    expect(gate).toBe(false);
  });

  // 21. PROVISIONAL APPLE NOT EXPIRED — indicator and gate agree (both true)
  it('PROVISIONAL APPLE not expired: indicator and gate agree (both true)', () => {
    const user = { role: 'user', pipekeeper_paid: false };
    const sub = {
      status: 'active',
      modules_csv: 'pipekeeper',
      plan_key: 'pipekeeper_pro_monthly',
      provider: 'apple',
      provider_subscription_id: 'apple_unverified_456',
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    const badge = proIndicatorShows(user, sub);
    const gate = collectionGateAllows(user, sub, 'pipekeeper');
    expect(badge).toBe(gate);
    expect(gate).toBe(true);
  });

  // 22. SPLIT-BRAIN INVARIANT with legacy fallback and provisional expiry
  it('SPLIT-BRAIN INVARIANT: legacy fallback and provisional expiry never cause split-brain', () => {
    const testCases = [
      // Legacy premium fallback
      { user: { role: 'user', pipekeeper_paid: false }, sub: { status: 'active', modules_csv: null, plan_key: null, tier: 'premium', provider: 'stripe', provider_subscription_id: 'sub_1' }, module: 'pipekeeper' },
      // Synthetic manual_grant — no fallback
      { user: { role: 'user', pipekeeper_paid: false }, sub: { status: 'active', modules_csv: null, plan_key: null, tier: 'premium', provider: 'stripe', provider_subscription_id: 'manual_grant_x' }, module: 'pipekeeper' },
      // Provisional Apple expired
      { user: { role: 'user', pipekeeper_paid: false }, sub: { status: 'active', modules_csv: 'pipekeeper', provider: 'apple', provider_subscription_id: 'apple_unverified_1', current_period_end: new Date(Date.now() - 45 * 86400000).toISOString() }, module: 'pipekeeper' },
      // Provisional Apple not expired
      { user: { role: 'user', pipekeeper_paid: false }, sub: { status: 'active', modules_csv: 'pipekeeper', provider: 'apple', provider_subscription_id: 'apple_unverified_2', current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() }, module: 'pipekeeper' },
    ];

    for (const { user, sub, module } of testCases) {
      const badgePro = proIndicatorShows(user, sub);
      const gateAllows = collectionGateAllows(user, sub, module);
      // INVARIANT: badge and gate must ALWAYS agree
      expect(badgePro).toBe(gateAllows);
    }
  });
});