/**
 * Duplicate Subscription Guard (Corrected)
 *
 * Prevents duplicate checkout ONLY when the new subscription's entitlement scope
 * overlaps with an existing BILLABLE subscription's scope.
 *
 * Key corrections from the previous version:
 * - Compares entitlement SCOPE (module sets), not tier names or user identity
 * - Allows different-module purchases (PipeKeeper + WhiskeyKeeper)
 * - Allows expired → repurchase
 * - Allows lapsed → renewal
 * - Allows monthly → annual upgrade
 * - Handles canceled-but-active-through-period-end
 * - Handles universal/bundle vs individual module scope overlap
 * - Handles pending verification (trial/trialing)
 * - Does NOT block on failed/abandoned checkout (incomplete)
 * - Does NOT block on historical/expired records
 */

import {
  resolveEntitlementScope,
  scopesIntersect,
} from './entitlementScopeResolver.ts';

export interface SubscriptionLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider: string;
  provider_subscription_id?: string;
  status: string;
  tier?: string;
  billing_interval: string;
  plan_key?: string;
  modules_csv?: string;
  primary_module?: string;
  product_kind?: string;
  product_id?: string;
  modules?: string[];
  product?: string;
  bundle_name?: string;
  amount?: number | null;
  current_period_start?: string;
  current_period_end?: string;
  started_at?: string;
  subscriptionStartedAt?: string;
  canceled_at?: string;
  cancel_at_period_end?: boolean;
  created_date?: string;
}

export interface GuardResult {
  block: boolean;
  reason: string;
  existingSubscriptionId?: string;
  isUpgrade?: boolean;
  newScope?: string[];
  overlappingScope?: string[];
}

// ── Status helpers ───────────────────────────────────────────────────────────

function isActiveStatus(status: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'trial';
}

function isCanceledActiveThroughPeriodEnd(sub: SubscriptionLike): boolean {
  if (String(sub.status || '').toLowerCase() !== 'canceled') return false;
  if (!sub.cancel_at_period_end) return false;
  const periodEnd = sub.current_period_end;
  if (!periodEnd) return false;
  return new Date(periodEnd).getTime() > Date.now();
}

/**
 * A subscription is a "billable obligation" if it represents an actual recurring
 * billing commitment — NOT a historical record, failed checkout, or expired sub.
 */
function isBillableObligation(sub: SubscriptionLike): boolean {
  const status = String(sub.status || '').toLowerCase();
  if (status === 'incomplete') return false;
  if (status === 'expired') return false;
  if (isActiveStatus(status)) return true;
  if (isCanceledActiveThroughPeriodEnd(sub)) return true;
  return false;
}

// ── Interval helpers ─────────────────────────────────────────────────────────

function normalizeInterval(interval: string): 'monthly' | 'annual' | 'unknown' {
  const s = String(interval || '').toLowerCase();
  if (s.includes('month')) return 'monthly';
  if (s.includes('year') || s.includes('annual')) return 'annual';
  return 'unknown';
}

/**
 * Determines whether a new subscription should be blocked due to an existing
 * billable subscription with overlapping entitlement scope.
 *
 * @param existingSubs - All existing subscription records for the user
 * @param newBillingInterval - 'monthly' | 'annual' | 'month' | 'year'
 * @param newModuleScope - Module key string ('pipekeeper') or array (['pipekeeper','whiskeykeeper'])
 *                         or bundle key ('founders_bundle', 'three_module_bundle')
 */
export function shouldBlockNewSubscription(
  existingSubs: SubscriptionLike[],
  newBillingInterval: string,
  newModuleScope: string | string[]
): GuardResult {
  // Resolve the new subscription's scope
  const newScope = resolveNewScope(newModuleScope);
  const newInterval = normalizeInterval(newBillingInterval);

  if (newScope.length === 0) {
    return { block: false, reason: 'Unable to resolve module scope — allowing checkout.' };
  }

  // Check each existing subscription for scope overlap.
  // Must check ALL existing subs — don't return on first match, because
  // one sub may allow (upgrade) while another may block (duplicate).
  let blockResult: GuardResult | null = null;
  let upgradeResult: GuardResult | null = null;

  for (const sub of existingSubs) {
    if (!isBillableObligation(sub)) continue;

    const existingScope = resolveEntitlementScope(sub as Record<string, unknown>);
    if (existingScope.length === 0) continue;

    if (!scopesIntersect(newScope, existingScope)) continue;

    const existingInterval = normalizeInterval(sub.billing_interval);

    // Monthly → Annual upgrade: ALLOW (but keep checking for blocks)
    if (newInterval === 'annual' && existingInterval === 'monthly') {
      if (!upgradeResult) {
        upgradeResult = {
          block: false,
          reason: 'Upgrade from monthly to annual — existing monthly should be terminated after annual activation.',
          existingSubscriptionId: sub.id,
          isUpgrade: true,
          newScope,
          overlappingScope: existingScope,
        };
      }
      continue;
    }

    // Annual → Monthly: BLOCK
    if (newInterval === 'monthly' && existingInterval === 'annual') {
      return {
        block: true,
        reason: `User already has an active annual subscription covering ${existingScope.join(', ')}. Monthly checkout blocked to prevent duplicate billing.`,
        existingSubscriptionId: sub.id,
        newScope,
        overlappingScope: existingScope,
      };
    }

    // Same interval: BLOCK unless bundle upgrade
    if (newInterval === existingInterval) {
      const isNewSuperset = newScope.length > existingScope.length;
      if (isNewSuperset) {
        if (!upgradeResult) {
          upgradeResult = {
            block: false,
            reason: 'Bundle upgrade — existing subscription should be terminated after bundle activation.',
            existingSubscriptionId: sub.id,
            isUpgrade: true,
            newScope,
            overlappingScope: existingScope,
          };
        }
        continue;
      }

      return {
        block: true,
        reason: `User already has an active ${existingInterval} subscription covering ${existingScope.join(', ')}. Duplicate checkout blocked.`,
        existingSubscriptionId: sub.id,
        newScope,
        overlappingScope: existingScope,
      };
    }

    // Unknown interval on existing: block to be safe
    if (existingInterval === 'unknown' && newInterval !== 'unknown') {
      return {
        block: true,
        reason: `User has an existing subscription with unknown billing interval covering ${existingScope.join(', ')}. Checkout blocked pending review.`,
        existingSubscriptionId: sub.id,
        newScope,
        overlappingScope: existingScope,
      };
    }
  }

  // If any sub blocked, we already returned. If any was an upgrade, return that.
  if (upgradeResult) return upgradeResult;

  return { block: false, reason: '', newScope };
}

// ── Resolve new subscription scope from input ─────────────────────────────────

function resolveNewScope(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.map(m => String(m).trim().toLowerCase()).filter(Boolean);
  }

  const raw = String(input || '').trim().toLowerCase();

  // Bundle keys → module sets
  if (raw === 'founders_bundle' || raw === 'founders') {
    return ['pipekeeper', 'whiskeykeeper'];
  }
  if (raw === 'three_module_bundle' || raw === 'three' || raw === 'bundle_3') {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  }
  if (raw === 'four_module_bundle' || raw === 'four' || raw === 'bundle_4') {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  }

  // Single module keys
  const aliases: Record<string, string> = {
    pipe: 'pipekeeper',
    whiskey: 'whiskeykeeper',
    cigar: 'cigarkeeper',
    wine: 'winekeeper',
  };

  const resolved = aliases[raw] || raw;
  if (resolved && resolved !== 'unknown') return [resolved];
  return [];
}

// ── Legacy: detectDuplicateConflicts wrapper ─────────────────────────────────
// Backward-compatible wrapper that maps the new detector results to the old
// DuplicateConflict shape. Used by repairDuplicateSubscriptions.
// NOTE: The canonical detector is detectDuplicateBilling in duplicateBillingDetector.ts.

export interface DuplicateConflict {
  type: 'monthly_plus_annual' | 'multiple_active_same_interval' | 'cross_provider_duplicate' | 'stale_monthly_after_annual';
  severity: 'high' | 'medium' | 'low';
  keep_subscription_id: string;
  terminate_subscription_ids: string[];
  description: string;
  requires_admin_review: boolean;
}

export function detectDuplicateConflicts(subscriptions: SubscriptionLike[]): DuplicateConflict[] {
  const conflicts: DuplicateConflict[] = [];

  const billable = subscriptions.filter(s => isBillableObligation(s));
  if (billable.length <= 1) return conflicts;

  // Group by module scope
  const byModule = new Map<string, SubscriptionLike[]>();
  for (const sub of billable) {
    const scope = resolveEntitlementScope(sub as Record<string, unknown>);
    for (const mod of scope) {
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod)!.push(sub);
    }
  }

  for (const [mod, subs] of byModule) {
    if (subs.length <= 1) continue;

    const monthly = subs.filter(s => normalizeInterval(s.billing_interval) === 'monthly');
    const annual = subs.filter(s => normalizeInterval(s.billing_interval) === 'annual');

    if (monthly.length > 0 && annual.length > 0) {
      const keepAnnual = annual.sort((a, b) =>
        new Date(b.current_period_end || b.created_date || 0).getTime() -
        new Date(a.current_period_end || a.created_date || 0).getTime()
      )[0];
      const terminateMonthly = monthly.filter(s => s.id !== keepAnnual.id);
      const providers = new Set(subs.map(s => s.provider));

      conflicts.push({
        type: 'monthly_plus_annual',
        severity: 'high',
        keep_subscription_id: keepAnnual.id,
        terminate_subscription_ids: terminateMonthly.map(s => s.id),
        description: `Module '${mod}': ${annual.length} annual + ${monthly.length} monthly. Annual preserved; monthly terminated.`,
        requires_admin_review: providers.size > 1 && annual.length !== 1,
      });
    }

    if (monthly.length > 1 && annual.length === 0) {
      const keepMonthly = monthly.sort((a, b) =>
        new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
      )[0];
      const terminateRest = monthly.filter(s => s.id !== keepMonthly.id);
      conflicts.push({
        type: 'multiple_active_same_interval',
        severity: 'high',
        keep_subscription_id: keepMonthly.id,
        terminate_subscription_ids: terminateRest.map(s => s.id),
        description: `Module '${mod}': ${monthly.length} active monthly. Most recent kept; others terminated.`,
        requires_admin_review: true,
      });
    }

    if (annual.length > 1 && monthly.length === 0) {
      const keepAnnual = annual.sort((a, b) =>
        new Date(b.current_period_end || b.created_date || 0).getTime() -
        new Date(a.current_period_end || a.created_date || 0).getTime()
      )[0];
      const terminateRest = annual.filter(s => s.id !== keepAnnual.id);
      conflicts.push({
        type: 'multiple_active_same_interval',
        severity: 'high',
        keep_subscription_id: keepAnnual.id,
        terminate_subscription_ids: terminateRest.map(s => s.id),
        description: `Module '${mod}': ${annual.length} active annual. Longest-period kept; others terminated.`,
        requires_admin_review: true,
      });
    }
  }

  return conflicts;
}