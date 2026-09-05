/**
 * Duplicate Subscription Guard (Frontend/Test Copy)
 *
 * Canonical implementation: base44/shared/duplicateSubscriptionGuard.ts
 * Keep in sync with the canonical version.
 *
 * Scope-aware checkout guard that prevents duplicate billing without
 * blocking legitimate purchases.
 */

import {
  resolveEntitlementScope,
  scopesIntersect,
} from './entitlementScopeResolver.js';

// ── Status helpers ───────────────────────────────────────────────────────────

function isActiveStatus(status) {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'trial';
}

function isCanceledActiveThroughPeriodEnd(sub) {
  if (String(sub.status || '').toLowerCase() !== 'canceled') return false;
  if (!sub.cancel_at_period_end) return false;
  const periodEnd = sub.current_period_end;
  if (!periodEnd) return false;
  return new Date(periodEnd).getTime() > Date.now();
}

export function isBillableObligation(sub) {
  const status = String(sub.status || '').toLowerCase();
  if (status === 'incomplete') return false;
  if (status === 'expired') return false;
  if (isActiveStatus(status)) return true;
  if (isCanceledActiveThroughPeriodEnd(sub)) return true;
  return false;
}

function normalizeInterval(interval) {
  const s = String(interval || '').toLowerCase();
  if (s.includes('month')) return 'monthly';
  if (s.includes('year') || s.includes('annual')) return 'annual';
  return 'unknown';
}

// ── Main guard ───────────────────────────────────────────────────────────────

export function shouldBlockNewSubscription(existingSubs, newBillingInterval, newModuleScope) {
  const newScope = resolveNewScope(newModuleScope);
  const newInterval = normalizeInterval(newBillingInterval);

  if (newScope.length === 0) {
    return { block: false, reason: 'Unable to resolve module scope — allowing checkout.' };
  }

  let upgradeResult = null;

  for (const sub of existingSubs) {
    if (!isBillableObligation(sub)) continue;

    const existingScope = resolveEntitlementScope(sub);
    if (existingScope.length === 0) continue;

    if (!scopesIntersect(newScope, existingScope)) continue;

    const existingInterval = normalizeInterval(sub.billing_interval);

    // Monthly → Annual upgrade: ALLOW (keep checking for blocks)
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

  if (upgradeResult) return upgradeResult;
  return { block: false, reason: '', newScope };
}

// ── Resolve new subscription scope ────────────────────────────────────────────

function resolveNewScope(input) {
  if (Array.isArray(input)) {
    return input.map(m => String(m).trim().toLowerCase()).filter(Boolean);
  }

  const raw = String(input || '').trim().toLowerCase();

  if (raw === 'founders_bundle' || raw === 'founders') {
    return ['pipekeeper', 'whiskeykeeper'];
  }
  if (raw === 'three_module_bundle' || raw === 'three' || raw === 'bundle_3') {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  }
  if (raw === 'four_module_bundle' || raw === 'four' || raw === 'bundle_4') {
    return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  }

  const aliases = {
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

export function detectDuplicateConflicts(subscriptions) {
  const conflicts = [];
  const billable = subscriptions.filter(s => isBillableObligation(s));
  if (billable.length <= 1) return conflicts;

  const byModule = new Map();
  for (const sub of billable) {
    const scope = resolveEntitlementScope(sub);
    for (const mod of scope) {
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod).push(sub);
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