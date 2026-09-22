/**
 * CANONICAL MODULE ACCESS RESOLVER — SINGLE SOURCE OF TRUTH
 *
 * This is the ONE canonical access decision for module-level Pro access.
 * All access consumers (PremiumActiveIndicator, collection gate, free item
 * limits, paywalls, module navigation, subscription page) must consume
 * this result.
 *
 * PRECEDENCE (highest first):
 *   A. AUTHORITATIVE CURRENT PAID ENTITLEMENT
 *      - Active/trialing subscription with valid product/module scope
 *      - Canceled but paid through future period_end
 *      - Verified Apple active transaction
 *   B. EXPLICIT NON-PAID GRANT (requires provenance)
 *      - Grandfathered (isFoundingMember)
 *      - Legacy broad access (legacy_broad_module_access)
 *   C. APPROVED PROVISIONAL APPLE ACCESS
 *      - Apple subscription with unverified status, under provisional policy
 *   D. NO CURRENT ACCESS
 *      - Expired, revoked, refunded, canceled with period ended
 *      - Provider subscription missing
 *      - Stale user paid flag only
 *
 * LEGACY PROJECTION FIELDS (pipekeeper_paid, entitlement_tier, paid_modules_csv)
 * are NOT authoritative. They are cached denormalized state. They must NOT
 * independently override authoritative lifecycle evidence.
 *
 * @param {Object} user - User entity from auth.me()
 * @param {string} moduleKey - Module key (pipekeeper, whiskeykeeper, etc.)
 * @param {Object|null|undefined} subscription - Subscription record from useCurrentUser
 * @returns {Object} Canonical access decision
 */

import { subscriptionGrantsPaidAccess, isCanceledButPaidThrough } from './gracePeriod';
import { isModuleLaunched } from './moduleReleaseState';

const CANONICAL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function parseCsvModules(csv) {
  return [...new Set(
    String(csv || '')
      .split(',')
      .map(m => m.trim().toLowerCase())
      .filter(m => m && CANONICAL_MODULES.includes(m) && isModuleLaunched(m))
  )];
}

function resolveBundleModules(user) {
  if (!user) return [];
  const hints = [user.plan_key, user.planKey, user.plan, user.subscription_plan, user.subscription_plan_key]
    .map(v => String(v || '').toLowerCase())
    .filter(Boolean);
  if (hints.length === 0) return [];
  if (hints.some(h => h.includes('founders'))) {
    return ['pipekeeper', 'whiskeykeeper'].filter(m => isModuleLaunched(m));
  }
  if (hints.some(h => h.includes('four_module') || h.includes('bundle_4'))) {
    return CANONICAL_MODULES.filter(m => isModuleLaunched(m));
  }
  if (hints.some(h => h.includes('three_module') || h.includes('bundle_3'))) {
    const selectedCsv = user.selected_modules_csv || user.paid_modules_csv || '';
    const selected = parseCsvModules(selectedCsv);
    if (selected.length >= 2) return selected;
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'].filter(m => isModuleLaunched(m));
  }
  return [];
}

function isUnverifiedAppleSubscription(sub) {
  if (!sub) return false;
  if (String(sub.provider || '').toLowerCase() !== 'apple') return false;
  const subId = String(sub.provider_subscription_id || '');
  return subId.startsWith('apple_unverified_') || subId.startsWith('apple_pending_');
}

function getSubscriptionLifecycle(sub) {
  if (!sub) return { grantsAccess: false, status: 'none', verificationStatus: 'verified_inactive', reason: 'No subscription' };

  const status = String(sub.status || '').toLowerCase();

  if (status === 'active' || status === 'trialing' || status === 'trial') {
    return { grantsAccess: true, status, verificationStatus: 'verified_active', reason: `Subscription ${status}` };
  }

  if (status === 'past_due' || status === 'incomplete' || status === 'unpaid') {
    // Grace period check is handled by subscriptionGrantsPaidAccess
    const grants = subscriptionGrantsPaidAccess(sub);
    return {
      grantsAccess: grants,
      status,
      verificationStatus: grants ? 'verified_active' : 'verified_inactive',
      reason: grants ? `Subscription ${status} (in grace period)` : `Subscription ${status} (grace expired)`,
    };
  }

  if (status === 'canceled' || status === 'cancelled') {
    const paidThrough = isCanceledButPaidThrough(sub);
    return {
      grantsAccess: paidThrough,
      status: 'canceled',
      verificationStatus: paidThrough ? 'verified_active' : 'verified_inactive',
      reason: paidThrough ? 'Canceled but paid through period end' : 'Canceled and period ended',
    };
  }

  // expired, revoked, refunded, incomplete (no grace), unverified, etc.
  return { grantsAccess: false, status: status || 'unknown', verificationStatus: 'verified_inactive', reason: `Subscription ${status || 'unknown'}` };
}

function moduleInSubscriptionScope(sub, key, user) {
  if (!sub || !key) return false;
  const subModules = parseCsvModules(sub.modules_csv);
  if (subModules.includes(key)) return true;
  const bundleModules = resolveBundleModules({ ...user, plan_key: sub.plan_key, planKey: sub.planKey });
  if (bundleModules.includes(key)) return true;

  // LEGACY FALLBACK: subscriptions created before module-specific subscriptions
  // have modules_csv=null and plan_key=null. For these, infer pipekeeper as the
  // default module (PipeKeeper was the only module when legacy premium/pro
  // subscriptions were created).
  const hasNoModuleScope = !sub.modules_csv && !sub.plan_key && !sub.planKey;
  if (hasNoModuleScope) {
    const tier = String(sub.tier || '').toLowerCase();
    if (key === 'pipekeeper' && (tier === 'premium' || tier === 'pro')) {
      return true;
    }
  }

  return false;
}

function hasExplicitNonPaidProvenance(user, key) {
  if (!user || !key) return false;

  // Founding member — explicit provenance (set by system based on subscription start date)
  if (user.isFoundingMember && isModuleLaunched(key)) {
    return { source_type: 'grandfathered', reason: 'Founding member (pre-Feb 2026 paid subscriber)' };
  }

  // Legacy broad module access — explicit provenance
  if (user.legacy_broad_module_access && isModuleLaunched(key)) {
    return { source_type: 'grandfathered', reason: 'Legacy broad module access grant' };
  }

  return null;
}

/**
 * Resolve canonical module access.
 *
 * @returns {Object} {
 *   has_access: boolean,
 *   module: string,
 *   tier: 'free' | 'pro',
 *   source_type: 'admin' | 'paid_contract' | 'provisional_apple' | 'grandfathered' | 'legacy_flag_loading' | 'none',
 *   verification_status: 'verified_active' | 'verified_inactive' | 'provisional' | 'loading',
 *   lifecycle_status: string,
 *   commercial_plan: string | null,
 *   effective_end: string | null,
 *   reason: string
 * }
 */
export function resolveModuleAccess(user, moduleKey, subscription) {
  const key = normalizeKey(moduleKey);
  const role = String(user?.role || '').toLowerCase();

  // 1. Admin — always pro
  if (role === 'admin' || role === 'owner' || user?.is_admin === true) {
    return {
      has_access: true,
      module: key,
      tier: 'pro',
      source_type: 'admin',
      verification_status: 'verified_active',
      lifecycle_status: 'active',
      commercial_plan: null,
      effective_end: null,
      reason: 'Admin role',
    };
  }

  if (!key) {
    return {
      has_access: false,
      module: '',
      tier: 'free',
      source_type: 'none',
      verification_status: 'verified_inactive',
      lifecycle_status: 'none',
      commercial_plan: null,
      effective_end: null,
      reason: 'No module key specified',
    };
  }

  // 2. AUTHORITATIVE CURRENT PAID ENTITLEMENT
  // subscription is an object → check lifecycle (authoritative)
  if (subscription && typeof subscription === 'object') {
    const lifecycle = getSubscriptionLifecycle(subscription);

    if (lifecycle.grantsAccess) {
      const inScope = moduleInSubscriptionScope(subscription, key, user);
      if (inScope) {
        // Check if this is a provisional Apple subscription
        if (isUnverifiedAppleSubscription(subscription)) {
          return {
            has_access: true,
            module: key,
            tier: 'pro',
            source_type: 'provisional_apple',
            verification_status: 'provisional',
            lifecycle_status: lifecycle.status,
            commercial_plan: subscription.plan_key || null,
            effective_end: subscription.current_period_end || null,
            reason: 'Apple provisional — pending provider verification',
          };
        }
        return {
          has_access: true,
          module: key,
          tier: 'pro',
          source_type: 'paid_contract',
          verification_status: lifecycle.verificationStatus,
          lifecycle_status: lifecycle.status,
          commercial_plan: subscription.plan_key || null,
          effective_end: subscription.current_period_end || null,
          reason: lifecycle.reason,
        };
      }
      // Subscription is active but module is NOT in scope — do not grant
      return {
        has_access: false,
        module: key,
        tier: 'free',
        source_type: 'none',
        verification_status: 'verified_active',
        lifecycle_status: lifecycle.status,
        commercial_plan: subscription.plan_key || null,
        effective_end: subscription.current_period_end || null,
        reason: `Subscription active but ${key} not in scope`,
      };
    }

    // Subscription exists but lifecycle says no access (canceled/expired/etc.)
    // Legacy flags must NOT override this authoritative contradiction.
    // Continue to check explicit non-paid grants below.
  }

  // 3. EXPLICIT NON-PAID GRANT (requires provenance)
  const nonPaidGrant = hasExplicitNonPaidProvenance(user, key);
  if (nonPaidGrant) {
    return {
      has_access: true,
      module: key,
      tier: 'pro',
      source_type: nonPaidGrant.source_type,
      verification_status: 'verified_active',
      lifecycle_status: 'active',
      commercial_plan: null,
      effective_end: null,
      reason: nonPaidGrant.reason,
    };
  }

  // 4. LEGACY FLAG FALLBACK — only during loading (subscription === undefined)
  // When subscription is undefined (not loaded yet), fall back to legacy flags
  // to prevent a flash of "no access" during the brief loading window.
  // When subscription is null (loaded, no records), legacy flags are NOT sufficient.
  if (subscription === undefined) {
    // Loading state — temporary fallback to legacy flags
    const flagKey = `${key}_paid`;
    if (user?.[flagKey] === true) {
      return {
        has_access: true,
        module: key,
        tier: 'pro',
        source_type: 'legacy_flag_loading',
        verification_status: 'loading',
        lifecycle_status: 'loading',
        commercial_plan: null,
        effective_end: null,
        reason: 'Legacy flag fallback during subscription load',
      };
    }
    // Also check paid_modules_csv during loading
    const csvModules = parseCsvModules(user?.paid_modules_csv);
    if (csvModules.includes(key)) {
      return {
        has_access: true,
        module: key,
        tier: 'pro',
        source_type: 'legacy_flag_loading',
        verification_status: 'loading',
        lifecycle_status: 'loading',
        commercial_plan: null,
        effective_end: null,
        reason: 'Legacy CSV fallback during subscription load',
      };
    }
  }

  // 5. NO CURRENT ACCESS
  // subscription is null (loaded, no records) or lifecycle says no access
  // and no explicit non-paid provenance exists.
  // Legacy flags (pipekeeper_paid, paid_modules_csv) are NOT sufficient.
  const lifecycleStatus = subscription && typeof subscription === 'object'
    ? getSubscriptionLifecycle(subscription).status
    : 'no_subscription';

  return {
    has_access: false,
    module: key,
    tier: 'free',
    source_type: 'none',
    verification_status: 'verified_inactive',
    lifecycle_status: lifecycleStatus,
    commercial_plan: null,
    effective_end: subscription?.current_period_end || null,
    reason: subscription === null
      ? 'No subscription record and no explicit non-paid provenance'
      : (subscription && typeof subscription === 'object')
        ? `Subscription ${lifecycleStatus} — no paid access`
        : 'No authoritative access evidence',
  };
}

/**
 * Get all modules with Pro access for a user, using the canonical resolver.
 * @returns {string[]} Array of module keys with has_access=true
 */
export function getCanonicalProModules(user, subscription) {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner' || user?.is_admin === true) {
    return CANONICAL_MODULES.filter(m => isModuleLaunched(m));
  }

  const modules = [];
  for (const key of CANONICAL_MODULES) {
    if (!isModuleLaunched(key)) continue;
    const result = resolveModuleAccess(user, key, subscription);
    if (result.has_access) modules.push(key);
  }
  return modules;
}

/**
 * Check if legacy projection fields agree with canonical access state.
 * @returns {Object} { mismatch: boolean, field: string, canonical: boolean, projection: boolean }
 */
export function checkLegacyProjectionMismatch(user, moduleKey, subscription) {
  const key = normalizeKey(moduleKey);
  const canonical = resolveModuleAccess(user, key, subscription);
  const flagKey = `${key}_paid`;
  const projection = user?.[flagKey] === true;

  if (canonical.has_access !== projection) {
    return {
      mismatch: true,
      field: flagKey,
      canonical: canonical.has_access,
      projection,
      source_type: canonical.source_type,
      reason: canonical.reason,
    };
  }
  return { mismatch: false };
}