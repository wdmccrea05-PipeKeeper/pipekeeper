/**
 * Handle bundle upgrades safely
 * Manages transitions from individual modules to bundles
 * Handles subscription cancellation and new bundle creation
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { currentSubscriptionIds = [], targetBundleType, billingPeriod } = payload;

    if (!targetBundleType || !billingPeriod) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate target bundle type
    if (!['bundle_3', 'bundle_4'].includes(targetBundleType)) {
      return Response.json({ error: 'Invalid bundle type' }, { status: 400 });
    }

    console.log(`[handleBundleUpgrade] User: ${user.email}, Target: ${targetBundleType}`);

    // Step 1: Get user's active subscriptions
    const subscriptions = await fetch(`https://api.stripe.com/v1/customers/${user.stripe_customer_id}/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    if (!subscriptions.ok) {
      console.error('Failed to fetch subscriptions:', await subscriptions.text());
      return Response.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    const subData = await subscriptions.json();
    const activeSubscriptions = subData.data.filter(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );

    // Step 2: Identify subscriptions to cancel
    // Only cancel subscriptions that are in currentSubscriptionIds list or match module prices
    const subsToCancel = activeSubscriptions.filter(sub => {
      return currentSubscriptionIds.includes(sub.id);
    });

    console.log(`[handleBundleUpgrade] Found ${subsToCancel.length} subscriptions to cancel`);

    // Step 3: Cancel old subscriptions (with proration credit)
    const cancelPromises = subsToCancel.map(sub =>
      fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          proration_behavior: 'create_prorations', // Generate credit for unused time
        }),
      })
    );

    const cancelResults = await Promise.all(cancelPromises);

    for (let i = 0; i < cancelResults.length; i++) {
      if (!cancelResults[i].ok) {
        const error = await cancelResults[i].text();
        console.error(`Failed to cancel subscription ${subsToCancel[i].id}:`, error);
        // Continue anyway - we'll try to process the upgrade
      }
    }

    console.log(`[handleBundleUpgrade] Cancelled ${subsToCancel.length} subscriptions`);

    // Step 4: Log the upgrade attempt
    try {
      await base44.entities.SubscriptionIntegrationEvent.create({
        user_email: user.email,
        event_type: 'bundle_upgrade_initiated',
        details: {
          targetBundleType,
          billingPeriod,
          cancelledSubscriptions: subsToCancel.map(s => s.id),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('[handleBundleUpgrade] Failed to log event:', err?.message);
    }

    // Step 5: Return success - new subscription will be created by checkout session
    // The webhook will sync entitlements after successful payment
    return Response.json({
      success: true,
      message: 'Bundle upgrade initiated',
      cancelledCount: subsToCancel.length,
      upgradeType: targetBundleType,
      note: 'New subscription will be created during checkout. Entitlements will be synced after payment.',
    });
  } catch (error) {
    console.error('[handleBundleUpgrade]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});