/**
 * Duplicate Subscription Guard
 * 
 * Prevents conflicting simultaneous recurring contracts for the same
 * CollectionKeeper Pro entitlement. Used by checkout, webhook processing,
 * and sync flows to detect and flag duplicate billing.
 * 
 * Rules:
 * - A user should have at most ONE active recurring subscription per module/tier.
 * - Annual takes precedence over monthly (annual is the intended subscription).
 * - When a monthly + annual exist for the same module, the monthly should be
 *   terminated (non-renewing) and the annual preserved.
 * - Cross-provider duplicates (Stripe + Apple) require admin reconciliation
 *   unless one is clearly the intended subscription.
 */

export interface SubscriptionLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider: string; // 'stripe' | 'apple' | 'google' | 'manual'
  provider_subscription_id?: string;
  status: string; // 'active' | 'canceled' | 'expired' | 'trial' | etc.
  tier: string; // 'pro' | 'premium'
  billing_interval: string; // 'month' | 'year'
  plan_key?: string;
  modules_csv?: string;
  primary_module?: string;
  amount?: number | null;
  current_period_end?: string;
  created_date?: string;
}

export interface DuplicateConflict {
  type: 'monthly_plus_annual' | 'multiple_active_same_interval' | 'cross_provider_duplicate' | 'stale_monthly_after_annual';
  severity: 'high' | 'medium' | 'low';
  keep_subscription_id: string;
  terminate_subscription_ids: string[];
  description: string;
  requires_admin_review: boolean;
}

/**
 * Detects duplicate subscription conflicts for a set of subscription records.
 * Returns conflicts that should be resolved, with the recommended action.
 */
export function detectDuplicateConflicts(subscriptions: SubscriptionLike[]): DuplicateConflict[] {
  const conflicts: DuplicateConflict[] = [];
  
  // Filter to subscriptions that could be active (active, trial, trialing, past_due)
  const potentiallyActive = subscriptions.filter(s => 
    ['active', 'trial', 'trialing', 'past_due', 'incomplete'].includes(String(s.status || '').toLowerCase())
  );
  
  if (potentiallyActive.length <= 1) return conflicts;
  
  // Group by module (primary_module or modules_csv)
  const byModule = new Map<string, SubscriptionLike[]>();
  for (const sub of potentiallyActive) {
    const module = sub.primary_module || sub.modules_csv || 'unknown';
    const key = String(module).toLowerCase();
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key)!.push(sub);
  }
  
  for (const [module, subs] of byModule) {
    if (subs.length <= 1) continue;
    
    // Separate by billing interval
    const monthly = subs.filter(s => String(s.billing_interval || '').toLowerCase().includes('month'));
    const annual = subs.filter(s => String(s.billing_interval || '').toLowerCase().includes('year'));
    
    // Case 1: Monthly + Annual for same module → keep annual, terminate monthly
    if (monthly.length > 0 && annual.length > 0) {
      // Keep the most recently updated annual
      const keepAnnual = annual.sort((a, b) => 
        new Date(b.current_period_end || b.created_date || 0).getTime() - 
        new Date(a.current_period_end || a.created_date || 0).getTime()
      )[0];
      
      const terminateMonthly = monthly.filter(s => s.id !== keepAnnual.id);
      
      // Check if cross-provider
      const providers = new Set(subs.map(s => s.provider));
      const isCrossProvider = providers.size > 1;
      
      conflicts.push({
        type: 'monthly_plus_annual',
        severity: 'high',
        keep_subscription_id: keepAnnual.id,
        terminate_subscription_ids: terminateMonthly.map(s => s.id),
        description: `User has ${annual.length} annual + ${monthly.length} monthly subscription(s) for module '${module}'. Annual should be preserved; monthly should be terminated.`,
        requires_admin_review: isCrossProvider && !canAutoResolveCrossProvider(monthly, annual),
      });
    }
    
    // Case 2: Multiple active monthly for same module
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
        requires_admin_review: true, // Always require admin review for same-interval duplicates
      });
    }
    
    // Case 3: Multiple active annual for same module
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
    
    // Case 4: Cross-provider duplicates (Stripe + Apple)
    if (subs.length > 1) {
      const providers = new Set(subs.map(s => s.provider));
      if (providers.size > 1 && monthly.length === 0) {
        // Multiple annual across providers
        conflicts.push({
          type: 'cross_provider_duplicate',
          severity: 'medium',
          keep_subscription_id: '', // Requires admin decision
          terminate_subscription_ids: [],
          description: `User has active subscriptions across providers (${Array.from(providers).join(', ')}) for module '${module}'. Requires admin review to determine intended subscription.`,
          requires_admin_review: true,
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Determines if a cross-provider monthly+annual conflict can be auto-resolved.
 * Rule: If the annual is from any provider and the monthly is from any provider,
 * the annual takes precedence and the monthly can be auto-terminated.
 */
function canAutoResolveCrossProvider(monthly: SubscriptionLike[], annual: SubscriptionLike[]): boolean {
  // If there's exactly one annual and one or more monthly, auto-resolve is safe
  // because annual always takes precedence
  return annual.length === 1;
}

/**
 * Determines whether a new subscription should be blocked due to an existing
 * active subscription for the same module.
 */
export function shouldBlockNewSubscription(
  existingSubs: SubscriptionLike[], 
  newBillingInterval: string,
  newModule: string
): { block: boolean; reason: string; existingSubscriptionId?: string } {
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
  
  // Check if upgrading from monthly to annual (allowed)
  const existingMonthly = sameModuleActive.find(s => 
    String(s.billing_interval || '').toLowerCase().includes('month')
  );
  const existingAnnual = sameModuleActive.find(s => 
    String(s.billing_interval || '').toLowerCase().includes('year')
  );
  
  if (newInterval.includes('year') && existingMonthly && !existingAnnual) {
    // Monthly → Annual upgrade: allow but flag for monthly termination
    return { 
      block: false, 
      reason: 'Upgrade from monthly to annual — existing monthly should be terminated after annual activation',
      existingSubscriptionId: existingMonthly.id
    };
  }
  
  if (newInterval.includes('month') && existingAnnual) {
    // Annual → Monthly downgrade: BLOCK — user already has annual
    return { 
      block: true, 
      reason: `User already has an active annual subscription for ${moduleKey}. Monthly checkout blocked to prevent duplicate billing.`,
      existingSubscriptionId: existingAnnual.id
    };
  }
  
  if (newInterval.includes('year') && existingAnnual) {
    // Duplicate annual: BLOCK
    return { 
      block: true, 
      reason: `User already has an active annual subscription for ${moduleKey}. Duplicate annual checkout blocked.`,
      existingSubscriptionId: existingAnnual.id
    };
  }
  
  if (newInterval.includes('month') && existingMonthly) {
    // Duplicate monthly: BLOCK
    return { 
      block: true, 
      reason: `User already has an active monthly subscription for ${moduleKey}. Duplicate monthly checkout blocked.`,
      existingSubscriptionId: existingMonthly.id
    };
  }
  
  return { block: false, reason: '' };
}