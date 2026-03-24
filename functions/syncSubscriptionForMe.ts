/**
 * Sync user's Stripe subscription to database.
 *
 * HARDENED:
 * - evaluates all Stripe customers for the email
 * - ignores fake test IDs when real cus_* customers exist
 * - picks the best qualifying subscription across all customers
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
  if (key.includes('four_module') || key.includes('founders')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  return ['pipekeeper'];
}

function determinePlanKeyFromPrice(priceId: string | null) {
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
    [Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']: 'founders_bundle_annual',
  };
  return priceId ? (priceMap[priceId] || null) : null;
}

function statusRank(status: string): number {
  const key = String(status || '').toLowerCase();
  if (key === 'active') return 4;
  if (key === 'trialing') return 3;
  if (key === 'past_due') return 2;
  if (key === 'incomplete') return 1;
  return 0;
}

function extractModulesFromMetadata(sub: Stripe.Subscription, planKey: string | null): string[] {
  const metadataModules = String(sub.metadata?.modules_csv || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);

  return metadataModules.length > 0 ? metadataModules : modulesFromPlanKey(planKey || '');
}

function chooseBestSubscription(candidates: Array<{ customerId: string; subscription: Stripe.Subscription }>) {
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

    const best = chooseBestSubscription(candidates);
    if (!best) {
      return Response.json({ status: 'no_subscription', message: 'No qualifying subscription found' });
    }

    const subscription = best.subscription;
    const customerId = best.customerId;
    const item = subscription.items?.data?.[0];
    const priceId = item?.price?.id || null;
    const planKey = determinePlanKeyFromPrice(priceId) || 'unknown';
    const activeModules = extractModulesFromMetadata(subscription, planKey);
    const normalizedStatus = String(subscription.status || '').toLowerCase();
    const hasPaidAccess = ['active', 'trialing', 'past_due', 'incomplete'].includes(normalizedStatus);
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const subscriptionData = {
      user_id: userId,
      user_email: email,
      provider: 'stripe',
      provider_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: mapStripeStatus(subscription.status),
      tier: hasPaidAccess ? 'pro' : 'free',
      planKey,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      billing_interval: item?.price?.recurring?.interval || 'month',
      modules_csv: activeModules.join(','),
      checkout_type: subscription.metadata?.checkout_type || (activeModules.length > 1 ? `bundle_${activeModules.length}` : 'single_module'),
      billing_period: subscription.metadata?.billing_period || item?.price?.recurring?.interval || 'month',
      primary_module: subscription.metadata?.primary_module || activeModules[0] || 'pipekeeper',
      updated_date: new Date().toISOString(),
    };

    let existingSub = null;
    try {
      const byProviderId = await base44.asServiceRole.entities.Subscription.filter({
        provider_subscription_id: subscription.id,
      });
      existingSub = byProviderId?.[0] || null;
    } catch {}

    if (!existingSub) {
      try {
        const byEmail = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
        existingSub = byEmail?.find((row: any) => row.provider === 'stripe') || byEmail?.[0] || null;
      } catch {}
    }

    if (existingSub?.id) {
      await base44.asServiceRole.entities.Subscription.update(existingSub.id, subscriptionData);
    } else {
      await base44.asServiceRole.entities.Subscription.create({
        ...subscriptionData,
        created_date: new Date().toISOString(),
      });
    }

    await base44.asServiceRole.entities.User.update(userId, {
      stripe_customer_id: customerId,
      entitlement_tier: hasPaidAccess ? 'pro' : 'free',
      has_paid_access: hasPaidAccess,
      paid_modules_csv: hasPaidAccess ? activeModules.join(',') : '',
      subscription_status: mapStripeStatus(subscription.status),
      updated_date: new Date().toISOString(),
    });

    return Response.json({
      status: 'synced',
      hasPaidAccess,
      tier: hasPaidAccess ? 'pro' : 'free',
      subscriptionStatus: subscription.status,
      planKey,
      activeModules,
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
