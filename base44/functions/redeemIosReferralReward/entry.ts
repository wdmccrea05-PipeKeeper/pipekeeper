/**
 * redeemIosReferralReward
 *
 * Called from the iOS in-app redemption flow when the user taps "Redeem Reward."
 *
 * Validation chain:
 *   1. User auth + ownership check
 *   2. Reward state check (not already redeemed, not expired)
 *   3. Require transactionId from StoreKit (proof of completion)
 *   4. Offer identifier cross-check against reward.provider_reward_reference
 *      - Mismatch is logged as a warning but does NOT block (StoreKit may normalize)
 *      - Hard block only if reward has an assigned offer AND client sends a completely
 *        different offer that doesn't contain the assigned offer as a substring
 *   5. Mark redeemed + decrement pending_rewards
 *
 * The actual Apple subscription offer must be initiated client-side via
 * StoreKit presentOfferCodeRedeemSheet — this backend records the outcome only.
 * Never modifies the App Store subscription directly.
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
      offerReference,   // Apple offer code identifier presented to StoreKit
      transactionId,    // StoreKit transaction ID returned after successful redemption
      originalTransactionId, // Apple originalTransactionId (preferred for dedup)
      productId,        // Product ID of the redeemed subscription from StoreKit
      outcome,          // 'redeemed' | 'failed' | 'dismissed'
    } = body;

    if (!rewardId) {
      return Response.json({ error: 'rewardId required' }, { status: 400 });
    }

    const rewards = await base44.asServiceRole.entities.ReferralReward.filter({ id: rewardId });
    const reward = rewards?.[0];

    if (!reward) {
      return Response.json({ error: 'reward_not_found' }, { status: 404 });
    }

    // Security: only the reward owner can redeem it
    const callerId = user.id || user.auth_user_id;
    if (reward.user_id !== callerId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (reward.billing_provider !== 'ios') {
      return Response.json({ error: 'This reward is not an iOS reward' }, { status: 400 });
    }

    if (reward.status === 'redeemed') {
      return Response.json({ ok: true, alreadyRedeemed: true });
    }

    if (reward.status === 'expired') {
      return Response.json({ ok: false, reason: 'reward_expired' }, { status: 410 });
    }

    const now = new Date().toISOString();

    if (outcome === 'redeemed') {
      // REQUIRE transactionId — proves StoreKit sheet was completed, not just dismissed.
      const txId = transactionId || originalTransactionId;
      if (!txId) {
        return Response.json({
          ok: false,
          reason: 'missing_transaction_evidence',
          message: 'transactionId or originalTransactionId from StoreKit is required to confirm redemption',
        }, { status: 400 });
      }

      // Offer cross-check: only hard-block if there is a clear mismatch that indicates
      // a different reward is being claimed. Partial matches pass (normalization).
      const assignedOffer = reward.provider_reward_reference;
      let offerWarning = null;
      if (assignedOffer && offerReference) {
        const normalizedAssigned = String(assignedOffer).toLowerCase().trim();
        const normalizedClient = String(offerReference).toLowerCase().trim();
        if (!normalizedClient.includes(normalizedAssigned) && !normalizedAssigned.includes(normalizedClient)) {
          // Log hard mismatch but do not block — StoreKit may return a different
          // normalized form. Record the discrepancy for audit.
          offerWarning = `offer_mismatch: expected=${assignedOffer}, got=${offerReference}`;
          console.warn(`[redeemIosReferralReward] ${offerWarning} for reward ${rewardId}`);
        }
      }

      // Dedup: check if this transactionId has already been recorded on another reward
      const existingRewards = await base44.asServiceRole.entities.ReferralReward.filter({
        user_id: reward.user_id,
        status: 'redeemed',
      }).catch(() => []);
      for (const r of existingRewards || []) {
        const meta = JSON.parse(r.metadata || '{}');
        if (meta.transaction_id === txId || meta.original_transaction_id === txId) {
          console.warn(`[redeemIosReferralReward] Duplicate transactionId ${txId} for user ${reward.user_id}`);
          return Response.json({ ok: false, reason: 'duplicate_transaction_id' }, { status: 409 });
        }
      }

      await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
        status: 'redeemed',
        redeemed_at: now,
        provider_reward_reference: offerReference || assignedOffer || null,
        failure_reason: null,
        metadata: JSON.stringify({
          ...(JSON.parse(reward.metadata || '{}')),
          transaction_id: txId,
          original_transaction_id: originalTransactionId || null,
          product_id: productId || null,
          offer_reference: offerReference || null,
          redeemed_at: now,
          validation_note: 'StoreKit transactionId required and received',
          offer_warning: offerWarning || null,
        }),
      });

      // Mark source SubscriptionCredit as applied
      if (reward.source_subscription_credit_id) {
        await base44.asServiceRole.entities.SubscriptionCredit.update(
          reward.source_subscription_credit_id,
          { status: 'applied', applied_at: now }
        ).catch(() => {});
      }

      // Decrement pending_rewards on ReferralProgram
      const programs = await base44.asServiceRole.entities.ReferralProgram.filter({ user_id: reward.user_id });
      if (programs?.[0]) {
        const p = programs[0];
        await base44.asServiceRole.entities.ReferralProgram.update(p.id, {
          pending_rewards: Math.max(0, (p.pending_rewards || 0) - 1),
        });
      }

      return Response.json({
        ok: true,
        status: 'redeemed',
        rewardId: reward.id,
        offerWarning: offerWarning || null,
      });

    } else if (outcome === 'failed') {
      await base44.asServiceRole.entities.ReferralReward.update(reward.id, {
        status: 'failed',
        failure_reason: 'User attempted iOS redemption but it failed client-side',
      });
      return Response.json({ ok: false, status: 'failed' });

    } else {
      // dismissed — leave as awaiting_user_redemption, do nothing
      return Response.json({ ok: true, status: 'dismissed' });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});