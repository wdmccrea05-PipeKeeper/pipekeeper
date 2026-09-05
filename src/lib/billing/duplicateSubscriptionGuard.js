/**
 * Duplicate Subscription Guard (Frontend/Test Copy)
 *
 * Canonical implementation: base44/shared/duplicateSubscriptionGuard.ts
 * This JS copy exists because Vite cannot resolve .ts files from base44/
 * in frontend code. Keep in sync with the canonical version.
 *
 * Prevents conflicting simultaneous recurring contracts for the same
 * CollectionKeeper Pro entitlement.
 */

export function detectDuplicateConflicts(subscriptions) {
  const conflicts = [];

  const potentiallyActive = subscriptions.filter(s =>
    ['active', 'trial', 'trialing', 'past_due'].includes(String(s.status || '').toLowerCase())
  );

  if (potentiallyActive.length <= 1) return conflicts;

  const byModule = new Map();
  for (const sub of potentiallyActive) {
    const module = sub.primary_module || sub.modules_csv || 'unknown';
    const key = String(module).toLowerCase();
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key).push(sub);
  }

  for (const [module, subs] of byModule) {
    if (subs.length <= 1) continue;

    const monthly = subs.filter(s => String(s.billing_interval || '').toLowerCase().includes('month'));
    const annual = subs.filter(s => String(s.billing_interval || '').toLowerCase().includes('year'));

    if (monthly.length > 0 && annual.length > 0) {
      const keepAnnual = annual.sort((a, b) =>
        new Date(b.current_period_end || b.created_date || 0).getTime() -
        new Date(a.current_period_end || a.created_date || 0).getTime()
      )[0];

      const terminateMonthly = monthly.filter(s => s.id !== keepAnnual.id);
      const providers = new Set(subs.map(s => s.provider));
      const isCrossProvider = providers.size > 1;

      conflicts.push({
        type: 'monthly_plus_annual',
        severity: 'high',
        keep_subscription_id: keepAnnual.id,
        terminate_subscription_ids: terminateMonthly.map(s => s.id),
        description: `User has ${annual.length} annual + ${monthly.length} monthly subscription(s) for module '${module}'. Annual should be preserved; monthly should be terminated.`,
        requires_admin_review: isCrossProvider && !(annual.length === 1),
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
        description: `User has ${monthly.length} active monthly subscriptions for module '${module}'. Most recent should be kept; others terminated.`,
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
        description: `User has ${annual.length} active annual subscriptions for module '${module}'. Longest-period should be kept; others terminated.`,
        requires_admin_review: true,
      });
    }

    if (subs.length > 1) {
      const providers = new Set(subs.map(s => s.provider));
      if (providers.size > 1 && monthly.length === 0) {
        conflicts.push({
          type: 'cross_provider_duplicate',
          severity: 'medium',
          keep_subscription_id: '',
          terminate_subscription_ids: [],
          description: `User has active subscriptions across providers (${Array.from(providers).join(', ')}) for module '${module}'. Requires admin review.`,
          requires_admin_review: true,
        });
      }
    }
  }

  return conflicts;
}

export function shouldBlockNewSubscription(existingSubs, newBillingInterval, newModule) {
  const moduleKey = String(newModule || '').toLowerCase();
  const newInterval = String(newBillingInterval || '').toLowerCase();

  const sameModuleActive = existingSubs.filter(s => {
    const sModule = String(s.primary_module || s.modules_csv || '').toLowerCase();
    const sStatus = String(s.status || '').toLowerCase();
    return sModule === moduleKey && ['active', 'trial', 'trialing', 'past_due'].includes(sStatus);
  });

  if (sameModuleActive.length === 0) {
    return { block: false, reason: '' };
  }

  const existingMonthly = sameModuleActive.find(s =>
    String(s.billing_interval || '').toLowerCase().includes('month')
  );
  const existingAnnual = sameModuleActive.find(s =>
    String(s.billing_interval || '').toLowerCase().includes('year')
  );

  if (newInterval.includes('year') && existingMonthly && !existingAnnual) {
    return {
      block: false,
      reason: 'Upgrade from monthly to annual — existing monthly should be terminated after annual activation',
      existingSubscriptionId: existingMonthly.id
    };
  }

  if (newInterval.includes('month') && existingAnnual) {
    return {
      block: true,
      reason: `User already has an active annual subscription for ${moduleKey}. Monthly checkout blocked to prevent duplicate billing.`,
      existingSubscriptionId: existingAnnual.id
    };
  }

  if (newInterval.includes('year') && existingAnnual) {
    return {
      block: true,
      reason: `User already has an active annual subscription for ${moduleKey}. Duplicate annual checkout blocked.`,
      existingSubscriptionId: existingAnnual.id
    };
  }

  if (newInterval.includes('month') && existingMonthly) {
    return {
      block: true,
      reason: `User already has an active monthly subscription for ${moduleKey}. Duplicate monthly checkout blocked.`,
      existingSubscriptionId: existingMonthly.id
    };
  }

  return { block: false, reason: '' };
}