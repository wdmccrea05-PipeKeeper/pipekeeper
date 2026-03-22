/**
 * Sync user's Stripe subscription to database
 * 
 * HOTFIX: Now also updates User entity entitlement fields so the frontend
 * reads correct access immediately after checkout — not just after the
 * next webhook delivery.
 * 
 * HOTFIX: Now queries active + trialing subscriptions (was active-only).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapStripeStatus(status) {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    default: return 'inactive';
  }
}

function extractTierFromPlanKey(planKey) {
  if (!planKey) return 'pro'; // unknown plan but subscription exists → grant pro
  if (planKey.includes('founder')) return 'pro';
  if (planKey.includes('module')) return 'pro';
  if (planKey.includes('bundle')) return 'pro';
  if (planKey.includes('pro')) return 'pro';
  return 'pro'; // fail open for paid subscriptions
}

function determinePlanKeyFromPrice(priceId) {
  const priceMap = {
    [Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY')]: 'pipekeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL')]: 'pipekeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY')]: 'whiskeykeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL')]: 'whiskeykeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY')]: 'cigarkeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL')]: 'cigarkeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY')]: 'winekeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL')]: 'winekeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY')]: 'three_module_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL')]: 'three_module_bundle_annual',
    [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY')]: 'four_module_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL')]: 'four_module_bundle_annual',
    [Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL')]: 'founders_bundle_annual',
  };
  return priceMap[priceId] || null;
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

    // Find Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      return Response.json({ status: 'no_customer', message: 'No Stripe customer found' });
    }

    const customerId = customers.data[0].id;

    // HOTFIX: Query both active AND trialing subscriptions
    const [activeResult, trialingResult] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 10 }),
      stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 10 }),
    ]);

    const allSubs = [...(activeResult.data || []), ...(trialingResult.data || [])];

    if (allSubs.length === 0) {
      return Response.json({ status: 'no_subscription', message: 'No active or trialing subscriptions' });
    }

    // Use most recent subscription
    const subscription = allSubs.sort((a, b) => (b.created || 0) - (a.created || 0))[0];

    const item = subscription.items.data[0];
    if (!item?.price) {
      return Response.json({ error: 'Invalid subscription item' }, { status: 400 });
    }

    const priceId = item.price.id;
    const planKey = determinePlanKeyFromPrice(priceId);
    const tier = extractTierFromPlanKey(planKey);

    const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Build subscription record
    const subscriptionData = {
      user_id: userId,
      user_email: email,
      provider: 'stripe',
      provider_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: mapStripeStatus(subscription.status),
      tier,
      planKey: planKey || 'unknown',
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      billing_interval: item.price.recurring?.interval || 'month',
      // Carry through metadata from subscription if available (set by hotfixed checkout)
      modules_csv: subscription.metadata?.modules_csv || '',
      checkout_type: subscription.metadata?.checkout_type || 'single_module',
      billing_period: subscription.metadata?.billing_period || item.price.recurring?.interval || 'month',
      primary_module: subscription.metadata?.primary_module || 'pipekeeper',
    };

    // Upsert Subscription entity
    let existingSub = null;
    try {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
      existingSub = subs?.[0] || null;
    } catch {
      // No subscription record yet — will create
    }

    if (existingSub?.id) {
      await base44.asServiceRole.entities.Subscription.update(existingSub.id, subscriptionData);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subscriptionData);
    }

    // HOTFIX: Also update User entity entitlement fields directly.
    // This is what the frontend reads first (useCurrentUser → getEntitlementTier).
    // Without this, users get "free" access until the next webhook fires.
    try {
      const userRows = await base44.asServiceRole.entities.User.filter({ email });
      const userRow = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;
      if (userRow?.id) {
        await base44.asServiceRole.entities.User.update(userRow.id, {
          entitlement_tier: 'pro',
          has_paid_access: true,
          stripe_customer_id: customerId,
        });
      }
    } catch (err) {
      console.warn('[syncSubscriptionForMe] Failed to update user entitlement fields:', err?.message);
      // Non-blocking — subscription record is still created/updated
    }

    return Response.json({
      status: 'synced',
      planKey: planKey || 'unknown',
      tier,
      subscriptionStatus: subscription.status,
      currentPeriodEnd,
    });
  } catch (error) {
    console.error('Subscription sync failed:', error);
    return Response.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
});