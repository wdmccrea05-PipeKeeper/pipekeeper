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
  // iOS: unredeemed rewards expire after 90 days
  IOS_REWARD_EXPIRY_DAYS: 90,
};

// ─── Stripe: read preconfigured coupon/promo IDs from env ────────────────────
// Set STRIPE_REFERRAL_MONTH_COUPON_ID and STRIPE_REFERRAL_YEAR_COUPON_ID in your
// Stripe dashboard, then add them as env secrets. If not set, falls back to
// dynamic coupon creation as a safety net.
function getStripeCouponId(rewardType) {
  if (rewardType === 'free_year') {
    return Deno.env.get('STRIPE_REFERRAL_YEAR_COUPON_ID') || null;
  }
  return Deno.env.get('STRIPE_REFERRAL_MONTH_COUPON_ID') || null;
}

// Reward caps — monthly max $2.99, annual max $29.99
const STRIPE_REWARD_CAPS = {
  free_month: 299,   // cents
  free_year: 2999,   // cents
};

function buildStripeRewardCouponParams(rewardType) {
  // Fallback: dynamic coupon creation when no env coupon ID is configured.
  // Fixed-value — capped at reward maximums, independent of plan price.
  if (rewardType === 'free_year') {
    return {
      name: 'CollectionKeeper Referral — 1 Free Module Year ($29.99)',
      amount_off: STRIPE_REWARD_CAPS.free_year,
      currency: 'usd',
      duration: 'once',
      max_redemptions: 1,
    };
  }
  return {
    name: 'CollectionKeeper Referral — 1 Free Module Month ($2.99)',
    amount_off: STRIPE_REWARD_CAPS.free_month,
    currency: 'usd',
    duration: 'once',
    max_redemptions: 1,
  };
}

// ─── iOS offer identifier mapping ────────────────────────────────────────────
// Maps referrer's active subscription SKU family + reward type → Apple offer identifier.
// Identifiers must exactly match your App Store Connect offer codes.
const IOS_OFFER_MAP = {
  // Single module subscriptions (any single keeper)
  single_monthly: {
    free_month: Deno.env.get('IOS_REFERRAL_SINGLE_MONTHLY_MONTH_OFFER') || 'Referral Module Month Reward',
    free_year:  Deno.env.get('IOS_REFERRAL_SINGLE_ANNUAL_YEAR_OFFER')   || 'Referral Module Year Reward',
  },
  single_annual: {
    free_month: Deno.env.get('IOS_REFERRAL_SINGLE_MONTHLY_MONTH_OFFER') || 'Referral Module Month Reward',
    free_year:  Deno.env.get('IOS_REFERRAL_SINGLE_ANNUAL_YEAR_OFFER')   || 'Referral Module Year Reward',
  },
  // 3-module bundle
  three_monthly: {
    free_month: Deno.env.get('IOS_REFERRAL_THREE_MONTHLY_MONTH_OFFER')  || 'Referral Module Month Reward - Three Monthly',
    free_year:  Deno.env.get('IOS_REFERRAL_THREE_ANNUAL_YEAR_OFFER')    || 'referral_module_year_three_annual',
  },
  three_annual: {
    free_month: Deno.env.get('IOS_REFERRAL_THREE_MONTHLY_MONTH_OFFER')  || 'Referral Module Month Reward - Three Monthly',
    free_year:  Deno.env.get('IOS_REFERRAL_THREE_ANNUAL_YEAR_OFFER')    || 'referral_module_year_three_annual',
  },
  // All-module (4-module) bundle
  all_monthly: {
    free_month: Deno.env.get('IOS_REFERRAL_ALL_MONTHLY_MONTH_OFFER')    || 'referral_module_all_monthly',
    free_year:  Deno.env.get('IOS_REFERRAL_ALL_ANNUAL_YEAR_OFFER')      || 'referral_module_all_annual',
  },
  all_annual: {
    free_month: Deno.env.get('IOS_REFERRAL_ALL_MONTHLY_MONTH_OFFER')    || 'referral_module_all_monthly',
    free_year:  Deno.env.get('IOS_REFERRAL_ALL_ANNUAL_YEAR_OFFER')      || 'referral_module_all_annual',
  },
  // Founders bundle
  founders_monthly: {
    free_month: Deno.env.get('IOS_REFERRAL_FOUNDERS_MONTHLY_MONTH_OFFER') || 'referral_module_founders_monthly',
    free_year:  Deno.env.get('IOS_REFERRAL_FOUNDERS_ANNUAL_YEAR_OFFER')   || 'referral_module_founders_annual',
  },
  founders_annual: {
    free_month: Deno.env.get('IOS_REFERRAL_FOUNDERS_MONTHLY_MONTH_OFFER') || 'referral_module_founders_monthly',
    free_year:  Deno.env.get('IOS_REFERRAL_FOUNDERS_ANNUAL_YEAR_OFFER')   || 'referral_module_founders_annual',
  },
};

/**
 * Determine the SKU family key from the referrer's active iOS subscription planKey.
 * Uses the REFERRER's subscription, not the referred friend's.
 */
function resolveIosSkuFamily(planKey) {
  const key = String(planKey || '').toLowerCase();
  if (key.includes('founders') && key.includes('annual')) return 'founders_annual';
  if (key.includes('founders')) return 'founders_monthly';
  if ((key.includes('four_module') || key.includes('all')) && key.includes('annual')) return 'all_annual';
  if (key.includes('four_module') || key.includes('all')) return 'all_monthly';
  if (key.includes('three_module') && key.includes('annual')) return 'three_annual';
  if (key.includes('three_module')) return 'three_monthly';
  if (key.includes('annual') || key.includes('year')) return 'single_annual';
  return 'single_monthly';
}

function resolveIosOfferIdentifier(planKey, rewardType) {
  const family = resolveIosSkuFamily(planKey);
  return (IOS_OFFER_MAP[family] || IOS_OFFER_MAP['single_monthly'])[rewardType] || 'Referral Module Month Reward';
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
      // Verify the user still has an active Stripe sub. If not, fall through to free-user path.
      const hasActiveSub = await hasActiveStripeSubscription(base44, reward.user_id);
      if (hasActiveSub) {
        return await fulfillStripe(base44, reward, now);
      }
      // Stripe user whose subscription lapsed — treat as free user
      console.log(`[fulfillReferralReward] User ${reward.user_id} has no active Stripe sub, routing to referral_earned_access`);
    }

    if (provider === 'ios') {
      // iOS flow: mark for in-app redemption (does not require active sub check — user may have churned)
      // But if the user has an active iOS sub, use the standard iOS offer flow.
      const hasActiveIos = await hasActiveIosSubscription(base44, reward.user_id);
      if (hasActiveIos) {
        return await fulfillIos(base44, reward, now);
      }
      // iOS user without active sub — fall through to free-user path
      console.log(`[fulfillReferralReward] User ${reward.user_id} has no active iOS sub, routing to referral_earned_access`);
    }

    // ─── Free user / no active subscription ───────────────────────────────────
    // Grant referral-earned promotional access directly.
    // This is NON-REVENUE access — never counted in billing reports.
    return await fulfillFreeUserReferralAccess(base44, reward, now);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Active subscription checks ──────────────────────────────────────────────

async function hasActiveStripeSubscription(base44, userId) {
  try {
    const contracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: userId, provider: 'stripe', is_active: true,
    });
    if (contracts?.length > 0) return true;
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: userId, provider: 'stripe', status: 'active',
    });
    return (subs?.length > 0);
  } catch { return false; }
}

async function hasActiveIosSubscription(base44, userId) {
  try {
    const contracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: userId, provider: 'apple', is_active: true,
    });
    if (contracts?.length > 0) return true;
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: userId, provider: 'apple', status: 'active',
    });
    return (subs?.length > 0);
  } catch { return false; }
}

// ─── Free user fulfillment (referral-earned access) ───────────────────────────
// Creates a ReferralEarnedAccess record. User will be prompted to select a module
// in the referral dashboard before access becomes active.
async function fulfillFreeUserReferralAccess(base44, reward, now) {
  try {
    const result = await base44.asServiceRole.functions.invoke('grantReferralEarnedAccess', {
      rewardId: reward.id,
    });
    const data = result?.data || result;

    if (data?.ok) {
      return Response.json({
        ok: true,
        provider: 'referral_earned',
        status: data.status || 'ready_to_apply',
        accessId: data.accessId,
        requiresModuleSelection: data.requiresModuleSelection !== false,
        message: 'Referral-earned access created. User must select a module to activate.',
      });
    }

    // grantReferralEarnedAccess failed — mark the reward as failed
    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'failed',
      failure_reason: `grantReferralEarnedAccess failed: ${JSON.stringify(data)}`,
    });
    return Response.json({ ok: false, reason: 'referral_earned_access_failed', detail: data });
  } catch (err) {
    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'failed',
      failure_reason: `free_user_fulfillment_error: ${err.message}`,
    });
    return Response.json({ ok: false, reason: 'free_user_fulfillment_error', error: err.message }, { status: 500 });
  }
}

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
    // Fetch current subscription to determine actual renewal amount for cap enforcement
    let renewalAmountCents = null;
    try {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId, {
        expand: ['items.data.price'],
      });
      renewalAmountCents = stripeSub?.items?.data?.[0]?.price?.unit_amount || null;
    } catch {
      console.warn('[fulfillReferralReward] Could not fetch Stripe subscription for cap check');
    }

    // Enforce reward cap: never discount more than actual renewal amount
    const maxRewardCents = STRIPE_REWARD_CAPS[reward.reward_type] || 299;
    const cappedAmountCents = renewalAmountCents
      ? Math.min(maxRewardCents, renewalAmountCents)
      : maxRewardCents;

    // Prefer pre-configured coupon ID from env — avoids creating ad-hoc coupons.
    // Fall back to dynamic coupon creation if env IDs are not yet configured.
    const configuredCouponId = getStripeCouponId(reward.reward_type);
    let couponId;
    let usedConfiguredCoupon = false;

    if (configuredCouponId) {
      // Validate the configured coupon still exists in Stripe
      try {
        const existing = await stripe.coupons.retrieve(configuredCouponId);
        // Only use pre-configured coupon if its amount_off matches our cap
        if (existing.amount_off && existing.amount_off <= maxRewardCents) {
          couponId = configuredCouponId;
          usedConfiguredCoupon = true;
        } else {
          console.warn(`[fulfillReferralReward] Pre-configured coupon ${configuredCouponId} amount_off=${existing.amount_off} exceeds cap=${maxRewardCents} — creating capped coupon`);
        }
      } catch {
        console.warn(`[fulfillReferralReward] Configured coupon ${configuredCouponId} not found in Stripe — creating capped coupon`);
      }
    }

    if (!couponId) {
      const params = buildStripeRewardCouponParams(reward.reward_type);
      // Override amount_off with capped value if subscriber's plan is cheaper
      params.amount_off = cappedAmountCents;
      params.name = `${params.name} [capped:${cappedAmountCents}c]`;
      const coupon = await stripe.coupons.create(params);
      couponId = coupon.id;
    }

    // Apply coupon to subscription
    await stripe.subscriptions.update(stripeSubId, {
      coupon: couponId,
    });

    await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
      status: 'applied',
      applied_at: now,
      provider_reward_reference: couponId,
      provider_subscription_id: stripeSubId,
      failure_reason: null,
      metadata: JSON.stringify({
        coupon_id: couponId,
        capped_amount_cents: cappedAmountCents,
        renewal_amount_cents: renewalAmountCents,
        used_configured_coupon: usedConfiguredCoupon,
        applied_at: now,
      }),
    });

    return Response.json({
      ok: true,
      provider: 'stripe',
      status: 'applied',
      couponId,
      subscriptionId: stripeSubId,
      cappedAmountCents,
      usedConfiguredCoupon,
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
// Resolve the correct Apple offer identifier based on the referrer's active subscription SKU,
// then mark as awaiting_user_redemption so the app can present the correct offer code sheet.
async function fulfillIos(base44, reward, now) {
  const expiryDays = REWARD_CONFIG.IOS_REWARD_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  // Resolve referrer's active Apple subscription to pick the correct offer identifier
  let planKey = null;
  try {
    const contracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: reward.user_id,
      provider: 'apple',
      is_active: true,
    });
    if (contracts?.[0]?.product) {
      planKey = contracts[0].product;
    }
    if (!planKey) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_id: reward.user_id,
        provider: 'apple',
        status: 'active',
      });
      planKey = subs?.[0]?.plan_key || subs?.[0]?.planKey || null;
    }
  } catch {
    // Non-fatal — will use default offer
  }

  const offerIdentifier = resolveIosOfferIdentifier(planKey, reward.reward_type);

  await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
    status: 'awaiting_user_redemption',
    expires_at: expiresAt,
    provider_reward_reference: offerIdentifier, // Store resolved offer ID for client and audit
    failure_reason: null,
    metadata: JSON.stringify({
      ios_offer_identifier: offerIdentifier,
      sku_family: resolveIosSkuFamily(planKey),
      resolved_plan_key: planKey,
    }),
  });

  return Response.json({
    ok: true,
    provider: 'ios',
    status: 'awaiting_user_redemption',
    expiresAt,
    offerIdentifier,
    message: 'iOS reward marked for in-app redemption. Present offerIdentifier to StoreKit.',
  });
}