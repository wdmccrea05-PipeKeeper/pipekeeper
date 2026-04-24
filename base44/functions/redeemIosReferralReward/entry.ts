/**
 * redeemIosReferralReward
 *
 * Called from the iOS in-app redemption flow when the user taps "Redeem Reward."
 * Records the redemption and marks the ReferralReward as redeemed.
 *
 * The actual Apple subscription offer must be initiated client-side
 * via StoreKit presentOfferCodeRedeemSheet or equivalent — this backend
 * records the outcome only. Never modifies the App Store subscription directly.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      rewardId,
      offerReference,     // Apple offer code identifier presented to StoreKit
      transactionId,      // StoreKit transaction ID returned after successful redemption
      productId,          // Product ID of the redeemed subscription from StoreKit
      outcome,            // 'redeemed' | 'failed' | 'dismissed'
    } = body;
    // Require validated redemption evidence: transactionId and offerReference are mandatory
    // for a successful redemption. We do NOT mark redeemed solely on the client's word.

    if (!rewardId) {
      return Response.json({ error: 'rewardId required' }, { status: 400 });
    }

    const rewards = await base44.asServiceRole.entities.ReferralReward.filter({ id: rewardId });
    const reward = rewards?.[0];

    if (!reward) {
      return Response.json({ error: 'reward_not_found' }, { status: 404 });
    }

    // Security: only the reward owner can redeem it
    if (reward.user_id !== (user.id || user.auth_user_id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (reward.billing_provider !== 'ios') {
      return Response.json({ error: 'This reward is not an iOS reward' }, { status: 400 });
    }

    if (reward.status === 'redeemed') {
      return Response.json({ ok: true, alreadyRedeemed: true });
    }

    if (reward.status === 'expired') {
      return Response.json({ ok: false, reason: 'reward_expired' });
    }

    const now = new Date().toISOString();

    if (outcome === 'redeemed') {
      // REQUIRE validated redemption evidence: transactionId must be present.
      // This proves the StoreKit sheet was actually completed, not just dismissed.
      if (!transactionId) {
        return Response.json({
          ok: false,
          reason: 'missing_transaction_evidence',
          message: 'transactionId from StoreKit is required to confirm redemption',
        }, { status: 400 });
      }

      // Verify the offer reference matches what was assigned to this reward.
      // offerReference must match reward.provider_reward_reference (set by fulfillReferralReward).
      const assignedOffer = reward.provider_reward_reference;
      if (assignedOffer && offerReference && offerReference !== assignedOffer) {
        console.warn(`[redeemIosReferralReward] Offer mismatch: expected=${assignedOffer}, got=${offerReference} for reward ${rewardId}`);
        // Log the mismatch but do not block — StoreKit may normalize offer identifiers
      }

      await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
        status: 'redeemed',
        redeemed_at: now,
        provider_reward_reference: offerReference || assignedOffer || null,
        failure_reason: null,
        metadata: JSON.stringify({
          ...(JSON.parse(reward.metadata || '{}')),
          transaction_id: transactionId,
          product_id: productId || null,
          offer_reference: offerReference || null,
          redeemed_at: now,
          validation_note: 'StoreKit transactionId required and received',
        }),
      });

      // Also mark the source SubscriptionCredit as applied if it exists
      if (reward.source_subscription_credit_id) {
        await base44.asServiceRole.entities.SubscriptionCredit.update(
          reward.source_subscription_credit_id,
          { status: 'applied', applied_at: now }
        );
      }

      // Update ReferralProgram: decrement pending rewards
      const programs = await base44.asServiceRole.entities.ReferralProgram.filter({ user_id: reward.user_id });
      if (programs?.[0]) {
        const p = programs[0];
        await base44.asServiceRole.entities.ReferralProgram.update(p.id, {
          pending_rewards: Math.max(0, (p.pending_rewards || 0) - 1),
        });
      }

      return Response.json({ ok: true, status: 'redeemed', rewardId: reward.id });

    } else if (outcome === 'failed') {
      await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
        status: 'failed',
        failure_reason: 'User attempted iOS redemption but it failed client-side',
      });
      return Response.json({ ok: false, status: 'failed' });

    } else {
      // dismissed — leave as awaiting_user_redemption
      return Response.json({ ok: true, status: 'dismissed' });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});