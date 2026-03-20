/**
 * Sync user's Stripe subscription to database
 * Called after successful purchase to rebuild access summary
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return Response.json({
        status: 'no_customer',
        message: 'No Stripe customer found',
      });
    }

    const customerId = customers.data[0].id;

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    if (subscriptions.data.length === 0) {
      return Response.json({
        status: 'no_subscription',
        message: 'No active subscriptions',
      });
    }

    // Use most recent subscription
    const subscription = subscriptions.data.sort((a, b) =>
      (b.created || 0) - (a.created || 0)
    )[0];

    if (!subscription) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Get plan details from Stripe
    const item = subscription.items.data[0];
    if (!item?.price) {
      return Response.json({ error: 'Invalid subscription item' }, { status: 400 });
    }

    // Map price to plan key
    const priceId = item.price.id;
    let planKey = determinePlanKeyFromPrice(priceId);
    
    if (!planKey) {
      console.error('[SyncSubscription] Unknown price ID:', priceId);
      return Response.json(
        { error: 'Could not identify subscription plan' },
        { status: 400 }
      );
    }

    // Update user subscription record in database
    const email = user.email.toLowerCase();
    let existingSub = null;

    try {
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: email,
      });
      existingSub = subs?.[0];
    } catch {
      // No subscription record yet
    }

    const subscriptionData = {
      user_id: user.id || user.auth_user_id,
      user_email: email,
      provider: 'stripe',
      provider_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: mapStripeStatus(subscription.status),
      tier: extractTierFromPlanKey(planKey),
      planKey,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      billing_interval: item.price.recurring?.interval || 'month',
    };

    // Add metadata for 3-module bundles (with defensive parsing)
    if (subscription.metadata?.activeModules) {
      try {
        const activeModulesData = subscription.metadata.activeModules;
        // Handle both array and string formats
        const modules = typeof activeModulesData === 'string' 
          ? JSON.parse(activeModulesData)
          : activeModulesData;
        
        if (Array.isArray(modules)) {
          subscriptionData.metadata = {
            activeModules: modules.slice(0, 3), // Ensure max 3 modules
          };
        }
      } catch (parseErr) {
        console.warn('[SyncSubscription] Failed to parse activeModules metadata:', parseErr);
        // Continue without metadata if parsing fails
      }
    }

    // Create or update subscription
    if (existingSub?.id) {
      await base44.asServiceRole.entities.Subscription.update(existingSub.id, subscriptionData);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subscriptionData);
    }

    // Return success
    return Response.json({
      status: 'synced',
      planKey,
      tier: extractTierFromPlanKey(planKey),
      currentPeriodEnd: subscriptionData.current_period_end,
    });
  } catch (error) {
    console.error('Subscription sync failed:', error);
    return Response.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
});

function mapStripeStatus(status) {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    default: return 'inactive';
  }
}

function determinePlanKeyFromPrice(priceId) {
  // Map Stripe price IDs to plan keys
  // This must match the price IDs in your Stripe dashboard
  const priceMap = {
    // Single module plans - add your actual Stripe price IDs
    [Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY')]: 'pipekeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL')]: 'pipekeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY')]: 'whiskeykeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL')]: 'whiskeykeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY')]: 'cigarkeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL')]: 'cigarkeeper_pro_annual',
    [Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY')]: 'winekeeper_pro_monthly',
    [Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL')]: 'winekeeper_pro_annual',
    
    // Bundle plans
    [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY')]: 'three_module_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL')]: 'three_module_bundle_annual',
    [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY')]: 'four_module_bundle_monthly',
    [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL')]: 'four_module_bundle_annual',
    [Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL')]: 'founders_bundle_annual',
  };
  
  return priceMap[priceId] || null;
}

function extractTierFromPlanKey(planKey) {
  if (planKey.includes('founder')) return 'pro';
  if (planKey.includes('module')) return 'pro';
  if (planKey.includes('pro')) return 'pro';
  return 'free';
}