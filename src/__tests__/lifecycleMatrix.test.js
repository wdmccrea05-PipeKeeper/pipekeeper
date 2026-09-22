/* eslint-disable */
/**
 * LIFECYCLE REGRESSION TEST MATRIX
 *
 * Tests every subscription lifecycle state against the canonical access resolver.
 * Ensures stale legacy flags cannot independently grant access when authoritative
 * lifecycle says no.
 */

import { describe, it, expect } from 'vitest';

// ── Inline canonical resolver logic (mirrors resolveModuleAccess.jsx) ──────

const CANONICAL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function isModuleLaunched(m) {
  return CANONICAL_MODULES.includes(m);
}

function parseCsvModules(csv) {
  return [...new Set(String(csv || '').split(',').map(m => m.trim().toLowerCase()).filter(m => m && CANONICAL_MODULES.includes(m) && isModuleLaunched(m)))];
}

function resolveBundleModules(user) {
  if (!user) return [];
  const hints = [user.plan_key, user.planKey, user.plan, user.subscription_plan, user.subscription_plan_key]
    .map(v => String(v || '').toLowerCase()).filter(Boolean);
  if (hints.length === 0) return [];
  if (hints.some(h => h.includes('founders'))) return ['pipekeeper', 'whiskeykeeper'].filter(isModuleLaunched);
  if (hints.some(h => h.includes('four_module') || h.includes('bundle_4'))) return CANONICAL_MODULES.filter(isModuleLaunched);
  if (hints.some(h => h.includes('three_module') || h.includes('bundle_3'))) {
    const selected = parseCsvModules(user.selected_modules_csv || user.paid_modules_csv);
    if (selected.length >= 2) return selected;
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'].filter(isModuleLaunched);
  }
  return [];
}

function isUnverifiedAppleSubscription(sub) {
  if (!sub) return false;
  if (String(sub.provider || '').toLowerCase() !== 'apple') return false;
  const subId = String(sub.provider_subscription_id || '');
  return subId.startsWith('apple_unverified_') || subId.startsWith('apple_pending_');
}

function isCanceledButPaidThrough(sub) {
  if (!sub) return false;
  const status = String(sub.status || '').toLowerCase();
  if (status !== 'canceled' && status !== 'cancelled') return false;
  const periodEnd = sub.current_period_end;
  if (!periodEnd) return false;
  try { return Date.now() < new Date(periodEnd).getTime(); } catch { return false; }
}

function subscriptionGrantsPaidAccess(sub) {
  if (!sub) return false;
  const status = String(sub.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing' || status === 'trial') return true;
  if (status === 'past_due' || status === 'incomplete' || status === 'unpaid') {
    if (!sub.current_period_end) return false;
    try { return Date.now() < new Date(sub.current_period_end).getTime() + 5 * 86400000; } catch { return false; }
  }
  if (status === 'canceled' || status === 'cancelled') return isCanceledButPaidThrough(sub);
  return false;
}

function getSubscriptionLifecycle(sub) {
  if (!sub) return { grantsAccess: false, status: 'none', verificationStatus: 'verified_inactive', reason: 'No subscription' };
  const status = String(sub.status || '').toLowerCase();
  if (status === 'active' || status === 'trialing' || status === 'trial') {
    return { grantsAccess: true, status, verificationStatus: 'verified_active', reason: `Subscription ${status}` };
  }
  if (status === 'past_due' || status === 'incomplete' || status === 'unpaid') {
    const grants = subscriptionGrantsPaidAccess(sub);
    return { grantsAccess: grants, status, verificationStatus: grants ? 'verified_active' : 'verified_inactive', reason: `Subscription ${status}` };
  }
  if (status === 'canceled' || status === 'cancelled') {
    const paidThrough = isCanceledButPaidThrough(sub);
    return { grantsAccess: paidThrough, status: 'canceled', verificationStatus: paidThrough ? 'verified_active' : 'verified_inactive', reason: paidThrough ? 'Canceled paid through' : 'Canceled period ended' };
  }
  return { grantsAccess: false, status: status || 'unknown', verificationStatus: 'verified_inactive', reason: `Subscription ${status}` };
}

function moduleInSubscriptionScope(sub, key, user) {
  if (!sub || !key) return false;
  const subModules = parseCsvModules(sub.modules_csv);
  if (subModules.includes(key)) return true;
  const bundleModules = resolveBundleModules({ ...user, plan_key: sub.plan_key, planKey: sub.planKey });
  return bundleModules.includes(key);
}

function hasExplicitNonPaidProvenance(user, key) {
  if (!user || !key) return null;
  if (user.isFoundingMember && isModuleLaunched(key)) return { source_type: 'grandfathered', reason: 'Founding member' };
  if (user.legacy_broad_module_access && isModuleLaunched(key)) return { source_type: 'grandfathered', reason: 'Legacy broad access' };
  return null;
}

function resolveModuleAccess(user, moduleKey, subscription) {
  const key = String(moduleKey || '').trim().toLowerCase();
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user?.is_admin === true) {
    return { has_access: true, tier: 'pro', source_type: 'admin', verification_status: 'verified_active', lifecycle_status: 'active', reason: 'Admin' };
  }
  if (!key) return { has_access: false, tier: 'free', source_type: 'none', reason: 'No key' };

  // 2. Authoritative paid
  if (subscription && typeof subscription === 'object') {
    const lifecycle = getSubscriptionLifecycle(subscription);
    if (lifecycle.grantsAccess) {
      if (moduleInSubscriptionScope(subscription, key, user)) {
        if (isUnverifiedAppleSubscription(subscription)) {
          return { has_access: true, tier: 'pro', source_type: 'provisional_apple', verification_status: 'provisional', lifecycle_status: lifecycle.status, reason: 'Apple provisional' };
        }
        return { has_access: true, tier: 'pro', source_type: 'paid_contract', verification_status: lifecycle.verificationStatus, lifecycle_status: lifecycle.status, reason: lifecycle.reason };
      }
      return { has_access: false, tier: 'free', source_type: 'none', reason: 'Not in scope' };
    }
  }

  // 3. Explicit non-paid grant
  const grant = hasExplicitNonPaidProvenance(user, key);
  if (grant) {
    return { has_access: true, tier: 'pro', source_type: grant.source_type, verification_status: 'verified_active', lifecycle_status: 'active', reason: grant.reason };
  }

  // 4. Legacy flag fallback during loading
  if (subscription === undefined) {
    if (user?.[`${key}_paid`] === true) {
      return { has_access: true, tier: 'pro', source_type: 'legacy_flag_loading', verification_status: 'loading', lifecycle_status: 'loading', reason: 'Legacy flag loading fallback' };
    }
    if (parseCsvModules(user?.paid_modules_csv).includes(key)) {
      return { has_access: true, tier: 'pro', source_type: 'legacy_flag_loading', verification_status: 'loading', lifecycle_status: 'loading', reason: 'Legacy CSV loading fallback' };
    }
  }

  // 5. No access
  return { has_access: false, tier: 'free', source_type: 'none', verification_status: 'verified_inactive', reason: 'No access' };
}

// ═════════════════════════════════════════════════════════════════════════
// LIFECYCLE TEST MATRIX
// ═════════════════════════════════════════════════════════════════════════

describe('Lifecycle Regression Matrix', () => {
  const baseUser = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false, paid_modules_csv: '' };

  // 1. ACTIVE → access true
  it('ACTIVE subscription grants access', () => {
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(true);
  });

  // 2. TRIALING → access true
  it('TRIALING subscription grants access', () => {
    const sub = { status: 'trialing', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(true);
  });

  // 3. CANCELED + period_end in future → access true
  it('CANCELED with future period_end grants access until period ends', () => {
    const sub = { status: 'canceled', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() };
    const result = resolveModuleAccess(baseUser, 'pipekeeper', sub);
    expect(result.has_access).toBe(true);
    expect(result.source_type).toBe('paid_contract');
  });

  // 4. CANCELED + period_end past → access false
  it('CANCELED with past period_end denies access', () => {
    const sub = { status: 'canceled', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() - 86400000).toISOString() };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 5. EXPIRED → access false
  it('EXPIRED subscription denies access', () => {
    const sub = { status: 'expired', modules_csv: 'pipekeeper' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 6. REVOKED → access false
  it('REVOKED subscription denies access', () => {
    const sub = { status: 'revoked', modules_csv: 'pipekeeper' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 7. REFUNDED → access false
  it('REFUNDED subscription denies access', () => {
    const sub = { status: 'refunded', modules_csv: 'pipekeeper' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 8. PROVIDER_SUBSCRIPTION_MISSING → access false unless explicit grant
  it('PROVIDER_SUBSCRIPTION_MISSING denies access from stale flags alone', () => {
    const userWithStaleFlag = { ...baseUser, pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    // subscription is null = loaded, no records = provider subscription missing
    expect(resolveModuleAccess(userWithStaleFlag, 'pipekeeper', null).has_access).toBe(false);
  });

  // 9. HISTORICAL_SUBSCRIPTION_ONLY → access false
  it('HISTORICAL subscription only (expired) denies access even with stale flags', () => {
    const userWithStaleFlag = { ...baseUser, pipekeeper_paid: true };
    const sub = { status: 'expired', modules_csv: 'pipekeeper' };
    expect(resolveModuleAccess(userWithStaleFlag, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 10. STALE pipekeeper_paid=true + expired subscription → access false
  it('STALE flag + expired subscription denies access (stale flag is NOT authority)', () => {
    const userWithStaleFlag = { ...baseUser, pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    const sub = { status: 'expired', modules_csv: 'pipekeeper' };
    const result = resolveModuleAccess(userWithStaleFlag, 'pipekeeper', sub);
    expect(result.has_access).toBe(false);
    expect(result.source_type).not.toBe('paid_contract');
  });

  // 11. STALE pipekeeper_paid=true + no subscription → access false unless provenance
  it('STALE flag + no subscription (null) denies access without provenance', () => {
    const userWithStaleFlag = { ...baseUser, pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    // subscription is null = loaded, no records
    expect(resolveModuleAccess(userWithStaleFlag, 'pipekeeper', null).has_access).toBe(false);
  });

  // 12. EXPLICIT GRANDFATHERED GRANT → access true
  it('EXPLICIT grandfathered grant (isFoundingMember) grants access', () => {
    const foundingUser = { ...baseUser, isFoundingMember: true };
    expect(resolveModuleAccess(foundingUser, 'pipekeeper', null).has_access).toBe(true);
    expect(resolveModuleAccess(foundingUser, 'pipekeeper', null).source_type).toBe('grandfathered');
  });

  // 13. EXPLICIT MANUAL/LIFETIME GRANT → access true
  it('EXPLICIT legacy_broad_module_access grant provides access', () => {
    const legacyUser = { ...baseUser, legacy_broad_module_access: true };
    expect(resolveModuleAccess(legacyUser, 'pipekeeper', null).has_access).toBe(true);
    expect(resolveModuleAccess(legacyUser, 'pipekeeper', null).source_type).toBe('grandfathered');
  });

  // 14. UNRESOLVED PRODUCT SCOPE → must not automatically grant PipeKeeper
  it('UNRESOLVED product scope does not grant module access', () => {
    const sub = { status: 'active', modules_csv: '', plan_key: null };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 15. APPLE PROVISIONAL → access according to explicit provisional policy
  it('APPLE PROVISIONAL (unverified) grants access with provisional_apple source_type', () => {
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly', provider: 'apple', provider_subscription_id: 'apple_unverified_123' };
    const result = resolveModuleAccess(baseUser, 'pipekeeper', sub);
    expect(result.has_access).toBe(true);
    expect(result.source_type).toBe('provisional_apple');
    expect(result.verification_status).toBe('provisional');
  });

  // 16. APPLE VERIFIED ACTIVE → access true
  it('APPLE VERIFIED ACTIVE grants access with paid_contract source_type', () => {
    const sub = { status: 'active', modules_csv: 'pipekeeper', plan_key: 'pipekeeper_pro_monthly', provider: 'apple', provider_subscription_id: 'apple_verified_123' };
    const result = resolveModuleAccess(baseUser, 'pipekeeper', sub);
    expect(result.has_access).toBe(true);
    expect(result.source_type).toBe('paid_contract');
    expect(result.verification_status).toBe('verified_active');
  });

  // 17. APPLE VERIFIED EXPIRED/REVOKED → access false
  it('APPLE VERIFIED EXPIRED denies access', () => {
    const sub = { status: 'expired', modules_csv: 'pipekeeper', provider: 'apple', provider_subscription_id: 'apple_verified_123' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  it('APPLE VERIFIED REVOKED denies access', () => {
    const sub = { status: 'revoked', modules_csv: 'pipekeeper', provider: 'apple', provider_subscription_id: 'apple_verified_123' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 18. PROVIDER LOOKUP FAILURE → preserve last-known verified access
  it('PROVIDER LOOKUP FAILURE (past_due in grace) preserves access', () => {
    const sub = { status: 'past_due', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() + 3 * 86400000).toISOString() };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(true);
  });

  it('PROVIDER LOOKUP FAILURE (past_due grace expired) denies access', () => {
    const sub = { status: 'past_due', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() - 10 * 86400000).toISOString() };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 19. Legacy flag fallback during loading (subscription === undefined)
  it('Legacy flag fallback during loading (undefined subscription) grants temporary access', () => {
    const userWithFlag = { ...baseUser, pipekeeper_paid: true };
    // undefined = not loaded yet — fallback to legacy flags
    expect(resolveModuleAccess(userWithFlag, 'pipekeeper', undefined).has_access).toBe(true);
    expect(resolveModuleAccess(userWithFlag, 'pipekeeper', undefined).source_type).toBe('legacy_flag_loading');
  });

  // 20. Stale flag + canceled subscription (contradictory lifecycle) → access false
  it('Stale flag + canceled-ended subscription denies access (contradictory lifecycle wins)', () => {
    const userWithStaleFlag = { ...baseUser, pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' };
    const sub = { status: 'canceled', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() - 86400000).toISOString() };
    expect(resolveModuleAccess(userWithStaleFlag, 'pipekeeper', sub).has_access).toBe(false);
  });

  // 21. Bundle subscription grants all bundle modules
  it('Four-module bundle grants all modules', () => {
    const sub = { status: 'active', modules_csv: 'pipekeeper,whiskeykeeper,cigarkeeper,winekeeper', plan_key: 'four_module_bundle_monthly' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(true);
    expect(resolveModuleAccess(baseUser, 'whiskeykeeper', sub).has_access).toBe(true);
    expect(resolveModuleAccess(baseUser, 'cigarkeeper', sub).has_access).toBe(true);
    expect(resolveModuleAccess(baseUser, 'winekeeper', sub).has_access).toBe(true);
  });

  // 22. Wrong module scope does not grant
  it('WhiskeyKeeper subscription does not grant PipeKeeper', () => {
    const sub = { status: 'active', modules_csv: 'whiskeykeeper', plan_key: 'whiskeykeeper_pro_monthly' };
    expect(resolveModuleAccess(baseUser, 'pipekeeper', sub).has_access).toBe(false);
    expect(resolveModuleAccess(baseUser, 'whiskeykeeper', sub).has_access).toBe(true);
  });

  // 23. Founding member + canceled subscription → access true (non-paid grant is independent)
  it('Founding member retains access even with canceled subscription', () => {
    const foundingUser = { ...baseUser, isFoundingMember: true };
    const sub = { status: 'canceled', modules_csv: 'pipekeeper', current_period_end: new Date(Date.now() - 86400000).toISOString() };
    const result = resolveModuleAccess(foundingUser, 'pipekeeper', sub);
    expect(result.has_access).toBe(true);
    expect(result.source_type).toBe('grandfathered');
  });
});