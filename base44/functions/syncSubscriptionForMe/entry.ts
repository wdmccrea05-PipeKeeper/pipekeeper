/**
 * Sync user's Stripe subscription to database.
 *
 * HARDENED:
 * - evaluates all Stripe customers for the email
 * - ignores fake test IDs when real cus_* customers exist
 * - aggregates ALL qualifying subscriptions across all customers
 * - updates BOTH Subscription and User records
 * - returns explicit activeModules + hasPaidAccess for post-checkout verification
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

function normEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

function mapStripeStatus(status: string) {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'incomplete': return 'incomplete';
    case 'canceled': return 'canceled';
    default: return 'inactive';
  }
}

function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_')) return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_')) return ['cigarkeeper'];
  if (key.startsWith('winekeeper_')) return ['winekeeper'];
  if (key.includes('three_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  // Founders bundle = PipeKeeper + WhiskeyKeeper ONLY (2 modules, not 4)
  if (key.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

// Hardcoded price ID → modules mapping (canonical, non-negotiable)
const HARDCODED_PRICE_TO_MODULES: Record<string, string[]> = {
  'price_1SsDgEDycvQWC88PmdvlxFDa': ['pipekeeper'],
  'price_1SsDU6DycvQWC88PIwpmt7Oc': ['pipekeeper'],
  'price_1TBfcdDycvQWC88PV0OV4t9B': ['whiskeykeeper'],
  'price_1TBfd7DycvQWC88PHrCnHl1X': ['whiskeykeeper'],
  'price_1TBfbJDycvQWC88PIjsHAufT': ['cigarkeeper'],
  'price_1TBfaeDycvQWC88PkAHy3qIC': ['cigarkeeper'],
  'price_1TKgGnDycvQWC88PwdJo75R5': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfhVDycvQWC88PdZ1jQNwX': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfdyDycvQWC88PPKSN5uVJ': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  'price_1TBfekDycvQWC88P5nZsEr7j': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
};

// Try hardcoded price map first, then env-var plan key lookup
function determinePlanKeyFromPrice(priceId: string | null) {
  if (!priceId) return null;
  // Hardcoded map overrides env vars
  if (HARDCODED_PRICE_TO_MODULES[priceId]) {
    const mods = HARDCODED_PRICE_TO_MODULES[priceId];
    if (mods.length === 1) {
      return `${mods[0]}_pro_monthly`; // approximation — modules still resolved directly
    }
  }
  const priceMap: Record<string, string> = {
    [Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY') || '']: 'pipekeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL') || '']: 'pipekeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') || '']: 'whiskeykeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') || '']: 'whiskeykeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY') || '']: 'cigarkeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL') || '']: 'cigarkeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY') || '']: 'winekeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL') || '']: 'winekeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY') || '']: 'three_module_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL') || '']: 'three_module_bundle_annual',
    [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') || '']: 'four_module_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') || '']: 'four_module_bundle_annual',
    [Deno.env.get('VITE_STRIPE_FOUNDERS_MONTHLY') || '']: 'founders_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']: 'founders_bundle_annual',
  };
  return priceMap[priceId] || null;
}

// Resolve modules directly from price ID (hardcoded first, then plan key)
function modulesFromPriceId(priceId: string | null): string[] {
  if (!priceId) return [];
  const hardcoded = HARDCODED_PRICE_TO_MODULES[priceId];
  if (hardcoded) return hardcoded;
  const planKey = determinePlanKeyFromPrice(priceId);
  return planKey ? modulesFromPlanKey(planKey) : [];
}

function statusRank(status: string): number {
  const key = String(status || '').toLowerCase();
  if (key === 'active') return 4;
  if (key === 'trialing') return 3;
  if (key === 'past_due') return 2;
  if (key === 'incomplete') return 1;
  return 0;
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function splitModulesCsv(csv: unknown): string[] {
  return unique(
    String(csv || '')
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean),
  );
}

function extractModulesFromMetadata(sub: Stripe.Subscription, priceId: string | null, planKey: string | null): string[] {
  // 1. Try hardcoded price ID map first (most authoritative)
  if (priceId) {
    const fromHardcoded = modulesFromPriceId(priceId);
    if (fromHardcoded.length > 0) return fromHardcoded;
  }
  // 2. Try metadata modules_csv
  const metadataModules = String(sub.metadata?.modules_csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
  if (metadataModules.length > 0) return metadataModules;
  // 3. Fall back to plan key
  return modulesFromPlanKey(planKey || '');
}

function choosePrimarySubscription(candidates: Array<{ customerId: string; subscription: Stripe.Subscription }>) {
  if (!candidates.length) return null;

  const sorted = [...candidates].sort((a, b) => {
    const aRank = statusRank(String(a.subscription.status || ''));
    const bRank = statusRank(String(b.subscription.status || ''));
    if (bRank !== aRank) return bRank - aRank;

    const aEnd = Number(a.subscription.current_period_end || 0);
    const bEnd = Number(b.subscription.current_period_end || 0);
    if (bEnd !== aEnd) return bEnd - aEnd;

    return Number(b.subscription.created || 0) - Number(a.subscription.created || 0);
  });

  return sorted[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = normEmail(user.email);
    const userId = user.id || user.auth_user_id;

    const customers = await stripe.customers.list({ email, limit: 20 });
    if (!customers.data.length) {
      return Response.json({ status: 'no_customer', message: 'No Stripe customer found' });
    }

    const realCustomers = customers.data.filter((c) => typeof c.id === 'string' && c.id.startsWith('cus_'));
    const customerPool = realCustomers.length ? realCustomers : customers.data;

    const qualifyingStatuses = new Set(['active', 'trialing', 'past_due', 'incomplete']);
    const candidates: Array<{ customerId: string; subscription: Stripe.Subscription }> = [];

    for (const customer of customerPool) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 50,
      });

      for (const sub of subs.data || []) {
        const normalized = String(sub.status || '').toLowerCase();
        if (!qualifyingStatuses.has(normalized)) continue;
        candidates.push({ customerId: customer.id, subscription: sub });
      }
    }

    const primary = choosePrimarySubscription(candidates);
    if (!primary) {
      return Response.json({ status: 'no_subscription', message: 'No qualifying subscription found' });
    }

    function bundleNameFromKey(key: string | null): string | null {
      if (!key) return null;
      if (key.includes('founders')) return 'Founders Bundle';
      if (key.includes('three_module')) return '3-Module Bundle';
      if (key.includes('four_module')) return '4-Module Bundle';
      return null;
    }

    function productLabelFromKey(key: string | null, modules: string[]): string {
      if (!key) return modules.length > 0 ? modules[0] : 'Unknown';
      if (key.includes('founders')) return 'Founders Bundle (PK+WK)';
      if (key.includes('three_module')) return '3-Module Bundle';
      if (key.includes('four_module')) return '4-Module Bundle';
      const m = modules[0];
      if (m === 'pipekeeper') return 'PipeKeeper';
      if (m === 'whiskeykeeper') return 'WhiskeyKeeper';
      if (m === 'cigarkeeper') return 'CigarKeeper';
      if (m === 'winekeeper') return 'WineKeeper';
      return modules[0] || 'Unknown';
    }

    // Upsert each qualifying Stripe subscription row
    const modulesBySubscription = new Map<string, string[]>();
    for (const candidate of candidates) {
      const subscription = candidate.subscription;
      const customerId = candidate.customerId;
      const item = subscription.items?.data?.[0];
      const priceId = item?.price?.id || null;
      const planKey = determinePlanKeyFromPrice(priceId);
      const subModules = unique(extractModulesFromMetadata(subscription, priceId, planKey));
      modulesBySubscription.set(subscription.id, subModules);

      const normalizedStatus = String(subscription.status || '').toLowerCase();
      const subHasPaidAccess = ['active', 'trialing', 'past_due', 'incomplete'].includes(normalizedStatus);
      const currentPeriodStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null;
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const isBundle = subModules.length > 1;
      const productKind = isBundle ? 'bundle' : (subModules.length === 1 ? 'single' : 'unknown');
      const bundleName = isBundle ? (bundleNameFromKey(planKey) || 'Bundle') : null;
      const billingIntervalRaw = item?.price?.recurring?.interval || null;
      const renewalAmount = item?.price?.unit_amount ? item.price.unit_amount / 100 : null;

      const subscriptionData = {
        user_id: userId,
        user_email: email,
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        price_id: priceId,
        status: mapStripeStatus(subscription.status),
        tier: subHasPaidAccess ? 'pro' : 'free',
        planKey,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        billing_interval: billingIntervalRaw,
        billing_period: subscription.metadata?.billing_period || billingIntervalRaw,
        modules_csv: subModules.join(','),
        module_count: subModules.length,
        product_kind: productKind,
        primary_module: subModules[0] || null,
        bundle_name: bundleName,
        product_label: productLabelFromKey(planKey, subModules),
        checkout_type: subscription.metadata?.checkout_type || (isBundle ? `bundle_${subModules.length}` : 'single_module'),
        renewal_amount: renewalAmount,
        updated_date: new Date().toISOString(),
      };

      let existingSub = null;
      try {
        const byProviderId = await base44.asServiceRole.entities.Subscription.filter({
          provider_subscription_id: subscription.id,
        });
        existingSub = byProviderId?.[0] || null;
      } catch {}

      if (existingSub?.id) {
        await base44.asServiceRole.entities.Subscription.update(existingSub.id, subscriptionData);
      } else {
        await base44.asServiceRole.entities.Subscription.create({
          ...subscriptionData,
          created_date: new Date().toISOString(),
        });
      }
    }

    const unionModules = unique(
      candidates.flatMap((candidate) => modulesBySubscription.get(candidate.subscription.id) || []),
    );
    const hasPaidAccess = candidates.length > 0;
    const primarySubscription = primary.subscription;
    const customerId = primary.customerId;
    const primaryPriceId = primarySubscription.items?.data?.[0]?.price?.id || null;
    const primaryPlanKey = determinePlanKeyFromPrice(primaryPriceId);
    const currentPeriodEnd = primarySubscription.current_period_end
      ? new Date(primarySubscription.current_period_end * 1000).toISOString()
      : null;
    const subscriptionStatus = mapStripeStatus(primarySubscription.status);

    // SAFE RULE: never clear module flags when paid and modules could not be resolved.
    // Preserve existing flags (paid_modules_csv → individual flags → empty).
    let preservedUserModules: string[] = [];
    if (hasPaidAccess && unionModules.length === 0) {
      // Try paid_modules_csv first
      const fromCsv = splitModulesCsv(user?.paid_modules_csv);
      if (fromCsv.length > 0) {
        preservedUserModules = fromCsv;
      } else {
        // Fall back to individual flag fields
        const fromFlags: string[] = [];
        if (user?.pipekeeper_paid)    fromFlags.push('pipekeeper');
        if (user?.whiskeykeeper_paid) fromFlags.push('whiskeykeeper');
        if (user?.cigarkeeper_paid)   fromFlags.push('cigarkeeper');
        if (user?.winekeeper_paid)    fromFlags.push('winekeeper');
        preservedUserModules = fromFlags;
      }
      if (preservedUserModules.length > 0) {
        console.warn(
          `[syncSubscriptionForMe] preserving existing module flags for ${email} because qualifying subscriptions resolved zero modules`,
        );
      }
    }
    const activeModules = unionModules.length > 0 ? unionModules : preservedUserModules;
    const entitlementSyncState = hasPaidAccess && unionModules.length === 0
      ? 'needs_review'
      : 'synced';

    const pipekeeper_paid = activeModules.includes('pipekeeper');
    const whiskeykeeper_paid = activeModules.includes('whiskeykeeper');
    const cigarkeeper_paid = activeModules.includes('cigarkeeper');
    const winekeeper_paid = activeModules.includes('winekeeper');
    const hasBundle = activeModules.length > 1;
    const entitlementTier = hasPaidAccess
      ? (hasBundle ? `bundle_${activeModules.length}` : 'pro')
      : 'free';

    await base44.asServiceRole.entities.User.update(userId, {
      stripe_customer_id: customerId,
      subscription_provider: 'stripe',
      entitlement_tier: entitlementTier,
      has_paid_access: hasPaidAccess,
      pipekeeper_paid,
      whiskeykeeper_paid,
      cigarkeeper_paid,
      winekeeper_paid,
      paid_modules_csv: hasPaidAccess ? activeModules.join(',') : '',
      subscription_tier: hasPaidAccess ? 'pro' : null,
      subscription_level: hasPaidAccess ? 'paid' : 'free',
      subscription_status: subscriptionStatus,
      entitlement_sync_state: entitlementSyncState,
      updated_date: new Date().toISOString(),
    });

    return Response.json({
      status: 'synced',
      hasPaidAccess,
      tier: entitlementTier,
      subscriptionStatus: String(primarySubscription.status || '').toLowerCase(),
      planKey: primaryPlanKey,
      activeModules,
      subscriptionCount: candidates.length,
      stripeCustomerId: customerId,
      currentPeriodEnd,
    });
  } catch (error) {
    console.error('[syncSubscriptionForMe] failed:', error);
    return Response.json(
      { error: error?.message || 'Failed to sync subscription' },
      { status: 500 },
    );
  }
});
