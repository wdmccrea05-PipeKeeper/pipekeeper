/**
 * fulfillReferralReward
 *
 * Central reward fulfillment router. Called after a referral qualifies.
 * Reads a ReferralReward row, detects billing provider, and routes accordingly:
 *   - Stripe: apply coupon/discount automatically
 *   - iOS:    mark as awaiting_user_redemption (no off-platform billing mutations)
 *
 * Idempotent — safe to retry failed rewards.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// ─── Reward config (single source of truth) ──────────────────────────────────
const REWARD_CONFIG = {
  REFERRALS_PER_FREE_MONTH: 1,
  MONTHS_PER_FREE_YEAR: 12,
  // iOS: unredeemed rewards expire after 90 days
  IOS_REWARD_EXPIRY_DAYS: 90,
  // Stripe coupon duration: once (applies to next invoice)
  STRIPE_COUPON_DURATION: 'once',
};

function buildStripeRewardCouponParams(rewardType, billingInterval) {
  // For a free_month on a monthly plan: 100% off for 1 month
  // For a free_month on an annual plan: apply equivalent prorated credit as percentage
  // For free_year: 100% off for 1 period (best handled as amount_off or percent_off 100 once)
  if (rewardType === 'free_year') {
    return {
      name: 'CollectionKeeper Referral — Free Year',
      percent_off: 100,
      duration: 'once',
      max_redemptions: 1,
    };
  }
  // free_month — one full billing cycle free
  return {
    name: 'CollectionKeeper Referral — Free Month',
    percent_off: 100,
    duration: 'once',
    max_redemptions: 1,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { rewardId } = body;

    if (!rewardId) {
      return Response.json({ error: 'rewardId required' }, { status: 400 });
    }

    // Load the reward
    const rewards = await base44.asServiceRole.entities.ReferralReward.filter({ id: rewardId });
    const reward = rewards?.[0];
    if (!reward) {
      return Response.json({ error: 'reward_not_found' }, { status: 404 });
    }

    // Already fulfilled?
    if (['applied', 'redeemed'].includes(reward.status)) {
      return Response.json({ ok: true, alreadyFulfilled: true, status: reward.status });
    }

    const now = new Date().toISOString();
    const attempts = (reward.fulfillment_attempts || 0) + 1;

    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      fulfillment_attempts: attempts,
      last_fulfillment_attempt_at: now,
    });

    // ─── Route by provider ────────────────────────────────────────────────────
    const provider = reward.billing_provider;

    if (provider === 'stripe') {
      return await fulfillStripe(base44, reward, now);
    }

    if (provider === 'ios') {
      return await fulfillIos(base44, reward, now);
    }

    // Unknown / no subscription — leave as pending, admin can retry
    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'pending',
      failure_reason: `Unknown or missing provider: ${provider}`,
    });
    return Response.json({ ok: false, reason: 'unknown_provider', provider });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Stripe fulfillment ───────────────────────────────────────────────────────
async function fulfillStripe(base44, reward, now) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'failed',
      failure_reason: 'STRIPE_SECRET_KEY not configured',
    });
    return Response.json({ ok: false, reason: 'stripe_not_configured' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

  // Find the user's active Stripe subscription
  const users = await base44.asServiceRole.entities.User.filter({ id: reward.user_id });
  const user = users?.[0];

  // Try to find subscription via ActiveContract or Subscription entity
  let stripeSubId = reward.provider_subscription_id;
  let stripeCustomerId = null;

  if (!stripeSubId) {
    // Look up from ActiveContract
    const contracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: reward.user_id,
      provider: 'stripe',
      is_active: true,
    });
    const contract = contracts?.[0];
    if (contract) {
      stripeSubId = contract.provider_subscription_id;
      stripeCustomerId = contract.provider_customer_id;
    }
  }

  if (!stripeSubId) {
    // Try legacy Subscription entity
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: reward.user_id,
      provider: 'stripe',
      status: 'active',
    });
    const sub = subs?.[0];
    if (sub) {
      stripeSubId = sub.stripe_subscription_id || sub.provider_subscription_id;
      stripeCustomerId = sub.stripe_customer_id;
    }
  }

  if (!stripeSubId) {
    // No active Stripe sub — leave pending for when they have one
    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'pending',
      failure_reason: 'no_active_stripe_subscription — will retry when subscription is found',
    });
    return Response.json({ ok: false, reason: 'no_active_stripe_subscription' });
  }

  try {
    // Create a one-time coupon
    const couponParams = buildStripeRewardCouponParams(reward.reward_type, 'month');
    const coupon = await stripe.coupons.create(couponParams);

    // Apply coupon to subscription
    await stripe.subscriptions.update(stripeSubId, {
      coupon: coupon.id,
    });

    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'applied',
      applied_at: now,
      provider_reward_reference: coupon.id,
      provider_subscription_id: stripeSubId,
      failure_reason: null,
    });

    return Response.json({
      ok: true,
      provider: 'stripe',
      status: 'applied',
      couponId: coupon.id,
      subscriptionId: stripeSubId,
    });

  } catch (stripeErr) {
    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'failed',
      failure_reason: `Stripe error: ${stripeErr.message}`,
    });
    return Response.json({ ok: false, reason: 'stripe_error', error: stripeErr.message }, { status: 500 });
  }
}

// ─── iOS fulfillment ──────────────────────────────────────────────────────────
// Do NOT mutate the App Store subscription from the backend.
// Instead mark as awaiting_user_redemption so the app can surface a redemption CTA.
async function fulfillIos(base44, reward, now) {
  const expiryDays = REWARD_CONFIG.IOS_REWARD_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
    status: 'awaiting_user_redemption',
    expires_at: expiresAt,
    failure_reason: null,
    // No provider_reward_reference yet — set when user initiates Apple offer redemption
  });

  return Response.json({
    ok: true,
    provider: 'ios',
    status: 'awaiting_user_redemption',
    expiresAt,
    message: 'iOS reward marked for in-app redemption. No App Store billing mutation performed.',
  });
}