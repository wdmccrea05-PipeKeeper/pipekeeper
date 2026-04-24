/**
 * getReferralAdminReport
 * Admin-only: full referral funnel stats, reward audit by provider, fraud flags.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [events, programs, credits, referralRewards] = await Promise.all([
      base44.asServiceRole.entities.ReferralEvent.list('-invite_sent_at', 500),
      base44.asServiceRole.entities.ReferralProgram.list('-qualified_referrals', 100),
      base44.asServiceRole.entities.SubscriptionCredit.filter({ source: 'referral' }),
      base44.asServiceRole.entities.ReferralReward.list('-granted_at', 500),
    ]);

    // ─── Funnel ───────────────────────────────────────────────────────────────
    const statusCounts = {};
    const fraudFlags = [];
    const topReferrers = {};

    for (const ev of events) {
      statusCounts[ev.status] = (statusCounts[ev.status] || 0) + 1;
      if (ev.status === 'fraud_flagged' || ev.manual_review_required) {
        fraudFlags.push({
          id: ev.id,
          referrerEmail: ev.referrer_email,
          referredEmail: ev.referred_email,
          fraudScore: ev.fraud_score,
          fraudReason: ev.fraud_reason,
          status: ev.status,
          manualReview: ev.manual_review_required,
          qualifiedAt: ev.subscription_started_at,
        });
      }
      if (ev.referrer_email) {
        if (!topReferrers[ev.referrer_email]) {
          topReferrers[ev.referrer_email] = { email: ev.referrer_email, invited: 0, qualified: 0, rewarded: 0 };
        }
        topReferrers[ev.referrer_email].invited++;
        if (ev.status === 'qualified' || ev.status === 'rewarded') topReferrers[ev.referrer_email].qualified++;
        if (ev.status === 'rewarded') topReferrers[ev.referrer_email].rewarded++;
      }
    }

    const topReferrersList = Object.values(topReferrers)
      .sort((a, b) => b.qualified - a.qualified)
      .slice(0, 20);

    // ─── Reward ledger audit by provider ─────────────────────────────────────
    const rewardsByProvider = { stripe: {}, ios: {}, google: {}, unknown: {} };
    for (const r of referralRewards) {
      const p = r.billing_provider || 'unknown';
      if (!rewardsByProvider[p]) rewardsByProvider[p] = {};
      rewardsByProvider[p][r.status] = (rewardsByProvider[p][r.status] || 0) + 1;
    }

    const stripeRewards = referralRewards.filter(r => r.billing_provider === 'stripe');
    const iosRewards = referralRewards.filter(r => r.billing_provider === 'ios');

    const rewardAuditList = referralRewards.slice(0, 200).map(r => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      rewardType: r.reward_type,
      monthsGranted: r.months_granted,
      provider: r.billing_provider,
      status: r.status,
      grantedAt: r.granted_at,
      appliedAt: r.applied_at,
      redeemedAt: r.redeemed_at,
      expiresAt: r.expires_at,
      failureReason: r.failure_reason,
      attempts: r.fulfillment_attempts,
      providerRef: r.provider_reward_reference,
      sourceEventId: r.source_referral_event_id,
    }));

    const totalCreditsMonths = credits.reduce((sum, c) => sum + (c.months_granted || 0), 0);

    return Response.json({
      ok: true,
      funnel: {
        invited: statusCounts.invited || 0,
        clicked: statusCounts.clicked || 0,
        signed_up: statusCounts.signed_up || 0,
        activated: statusCounts.activated || 0,
        qualified: statusCounts.qualified || 0,
        rewarded: statusCounts.rewarded || 0,
        rejected: statusCounts.rejected || 0,
        fraud_flagged: statusCounts.fraud_flagged || 0,
        total: events.length,
      },
      rewards: {
        totalCreditsGranted: credits.length,
        totalMonthsGranted: totalCreditsMonths,
        pendingCredits: credits.filter(c => c.status === 'pending').length,
        appliedCredits: credits.filter(c => c.status === 'applied').length,
        // ReferralReward ledger
        totalRewards: referralRewards.length,
        stripe: {
          total: stripeRewards.length,
          pending: stripeRewards.filter(r => r.status === 'pending').length,
          applied: stripeRewards.filter(r => r.status === 'applied').length,
          failed: stripeRewards.filter(r => r.status === 'failed').length,
        },
        ios: {
          total: iosRewards.length,
          pending: iosRewards.filter(r => r.status === 'pending').length,
          awaitingRedemption: iosRewards.filter(r => r.status === 'awaiting_user_redemption').length,
          redeemed: iosRewards.filter(r => r.status === 'redeemed').length,
          failed: iosRewards.filter(r => r.status === 'failed').length,
          expired: iosRewards.filter(r => r.status === 'expired').length,
        },
      },
      rewardAudit: rewardAuditList,
      fraudFlags,
      topReferrers: topReferrersList,
      programs: programs.slice(0, 50).map(p => ({
        userEmail: p.user_email,
        code: p.referral_code,
        totalReferrals: p.total_referrals,
        qualifiedReferrals: p.qualified_referrals,
        earnedFreeMonths: p.earned_free_months,
        earnedFreeYears: p.earned_free_years,
        pendingRewards: p.pending_rewards,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});