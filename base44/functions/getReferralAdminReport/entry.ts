/**
 * getReferralAdminReport
 * Admin-only: full referral funnel by semantic event type, provider-specific
 * reward audit, fraud flags, manual review queue, and per-user program summary.
 *
 * Funnel semantics:
 *   invited          — email invite sent
 *   clicked          — anonymous recipient clicked a referral URL
 *   signed_up        — attributed signup completed
 *   activated        — in manual review (fraud score 40-79)
 *   qualified        — passed fraud checks, conversion confirmed
 *   rewarded         — reward created and fulfillment triggered
 *   rejected         — explicitly rejected
 *   fraud_flagged    — fraud score >= 80
 *
 * Referrer share actions (copy, share) are stored on ReferralProgram counters,
 * not as ReferralEvent rows — they are NOT funnel steps.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [events, programs, credits, referralRewards, earnedAccessRecords] = await Promise.all([
      base44.asServiceRole.entities.ReferralEvent.list('-invite_sent_at', 500),
      base44.asServiceRole.entities.ReferralProgram.list('-qualified_referrals', 100),
      base44.asServiceRole.entities.SubscriptionCredit.filter({ source: 'referral' }),
      base44.asServiceRole.entities.ReferralReward.list('-granted_at', 500),
      base44.asServiceRole.entities.ReferralEarnedAccess.list('-granted_at', 200).catch(() => []),
    ]);

    // ─── Funnel ───────────────────────────────────────────────────────────────
    const statusCounts = {};
    const fraudFlags = [];
    const manualReviewQueue = [];
    const topReferrers = {};

    for (const ev of events) {
      statusCounts[ev.status] = (statusCounts[ev.status] || 0) + 1;

      if (ev.status === 'fraud_flagged') {
        fraudFlags.push({
          id: ev.id,
          referrerEmail: ev.referrer_email,
          referredEmail: ev.referred_email,
          fraudScore: ev.fraud_score,
          fraudReason: ev.fraud_reason,
          status: ev.status,
          manualReview: ev.manual_review_required,
          qualifiedAt: ev.subscription_started_at,
          inviteChannel: ev.invite_channel,
        });
      }

      if (ev.manual_review_required && ev.status !== 'fraud_flagged' && ev.status !== 'rewarded' && ev.status !== 'qualified') {
        manualReviewQueue.push({
          id: ev.id,
          referrerEmail: ev.referrer_email,
          referredEmail: ev.referred_email,
          fraudScore: ev.fraud_score,
          fraudReason: ev.fraud_reason,
          status: ev.status,
        });
      }

      if (ev.referrer_email) {
        if (!topReferrers[ev.referrer_email]) {
          topReferrers[ev.referrer_email] = {
            email: ev.referrer_email,
            invitesSent: 0,
            recipientClicks: 0,
            qualified: 0,
            rewarded: 0,
          };
        }
        if (ev.status === 'invited') topReferrers[ev.referrer_email].invitesSent++;
        if (ev.status === 'clicked') topReferrers[ev.referrer_email].recipientClicks++;
        if (ev.status === 'qualified' || ev.status === 'rewarded') topReferrers[ev.referrer_email].qualified++;
        if (ev.status === 'rewarded') topReferrers[ev.referrer_email].rewarded++;
      }
    }

    const topReferrersList = Object.values(topReferrers)
      .sort((a, b) => b.qualified - a.qualified)
      .slice(0, 20);

    // ─── Reward ledger by provider ────────────────────────────────────────────
    const stripeRewards = referralRewards.filter(r => r.billing_provider === 'stripe');
    const iosRewards = referralRewards.filter(r => r.billing_provider === 'ios');
    const freeUserRewards = referralRewards.filter(r => !['stripe', 'ios'].includes(r.billing_provider) || r.status === 'ready_to_apply');

    // Earned access breakdown (non-revenue)
    const earnedAccessByModule = {};
    for (const a of earnedAccessRecords) {
      if (a.module) earnedAccessByModule[a.module] = (earnedAccessByModule[a.module] || 0) + 1;
    }

    const rewardAuditList = referralRewards.slice(0, 200).map(r => {
      let metadata = {};
      try { metadata = JSON.parse(r.metadata || '{}'); } catch {}
      return {
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
        // Provider-specific audit fields
        cappedAmountCents: metadata.capped_amount_cents || null,
        renewalAmountCents: metadata.renewal_amount_cents || null,
        iosOfferIdentifier: metadata.ios_offer_identifier || r.provider_reward_reference || null,
        transactionId: metadata.transaction_id || null,
        qualificationProvider: metadata.qualification_provider || null,
      };
    });

    const totalCreditsMonths = credits.reduce((sum, c) => sum + (c.months_granted || 0), 0);

    // ─── Program-level share action totals ───────────────────────────────────
    const totalInvitesSent = programs.reduce((s, p) => s + (p.invites_sent || p.total_referrals || 0), 0);
    const totalLinksCopied = programs.reduce((s, p) => s + (p.links_copied || 0), 0);
    const totalSharesOpened = programs.reduce((s, p) => s + (p.shares_opened || 0), 0);
    const totalRecipientClicks = programs.reduce((s, p) => s + (p.recipient_clicks || 0), 0);

    // ─── Earned access audit list ─────────────────────────────────────────────
    const earnedAccessAudit = earnedAccessRecords.slice(0, 200).map(a => ({
      id: a.id,
      userId: a.user_id,
      userEmail: a.user_email,
      module: a.module,
      rewardType: a.reward_type,
      monthsGranted: a.months_granted,
      status: a.status,
      grantedAt: a.granted_at,
      activatedAt: a.activated_at,
      startAt: a.start_at,
      endAt: a.end_at,
      sourceRewardId: a.source_reward_id,
      sourceEventId: a.source_referral_event_id,
      isRevenue: false,
    }));

    return Response.json({
      ok: true,
      funnel: {
        // Email invite steps
        invites_sent: statusCounts.invited || 0,
        // Recipient-side click (anonymous URL open)
        recipient_clicks: statusCounts.clicked || 0,
        // Conversion funnel
        signed_up: statusCounts.signed_up || 0,
        activated: statusCounts.activated || 0,   // manual review hold
        qualified: statusCounts.qualified || 0,
        rewarded: statusCounts.rewarded || 0,
        rejected: statusCounts.rejected || 0,
        fraud_flagged: statusCounts.fraud_flagged || 0,
        manual_review_pending: manualReviewQueue.length,
        total_events: events.length,
      },
      // Referrer-side share actions (from program counters, not event rows)
      shareActions: {
        invites_sent: totalInvitesSent,
        links_copied: totalLinksCopied,
        shares_opened: totalSharesOpened,
        recipient_clicks: totalRecipientClicks,
      },
      rewards: {
        totalCreditsGranted: credits.length,
        totalMonthsGranted: totalCreditsMonths,
        pendingCredits: credits.filter(c => c.status === 'pending').length,
        appliedCredits: credits.filter(c => c.status === 'applied').length,
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
        // Non-revenue referral-earned access (free users) — NEVER counted as paid revenue
        referralEarned: {
          total: earnedAccessRecords.length,
          pendingModuleSelection: earnedAccessRecords.filter(a => a.status === 'pending_module_selection').length,
          active: earnedAccessRecords.filter(a => a.status === 'active').length,
          expired: earnedAccessRecords.filter(a => a.status === 'expired').length,
          byModule: earnedAccessByModule,
          isRevenue: false,
        },
      },
      rewardAudit: rewardAuditList,
      earnedAccessAudit,
      fraudFlags,
      manualReviewQueue,
      topReferrers: topReferrersList,
      programs: programs.slice(0, 50).map(p => ({
        userEmail: p.user_email,
        code: p.referral_code,
        invitesSent: p.invites_sent ?? p.total_referrals ?? 0,
        linksCopied: p.links_copied ?? 0,
        sharesOpened: p.shares_opened ?? 0,
        recipientClicks: p.recipient_clicks ?? 0,
        qualifiedReferrals: p.qualified_referrals ?? 0,
        earnedFreeMonths: p.earned_free_months ?? 0,
        earnedFreeYears: p.earned_free_years ?? 0,
        pendingRewards: p.pending_rewards ?? 0,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});