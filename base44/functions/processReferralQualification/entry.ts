/**
 * processReferralQualification
 *
 * Called when a referred user converts to a paid subscriber.
 * Provider-aware fraud scoring: iOS referrals with null amount are NOT penalized
 * since iOS client sync does not provide transaction amount.
 *
 * Fraud scoring:
 *   - self_referral: +100 (instant flag)
 *   - duplicate_referral_already_qualified: +100 (instant flag)
 *   - same_email_domain (non-public): +30
 *   - suspiciously_fast_signup (<2 min): +40
 *   - subscription_amount_too_low: +50 — ONLY for non-iOS providers where amount is expected
 *
 * Thresholds: fraud_flagged >= 80, manual_review >= 40
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REWARD_CONFIG = {
  REFERRALS_PER_FREE_MONTH: 1,
  MONTHS_PER_FREE_YEAR: 12,
  // Only enforced for Stripe/Google where amount is always available
  MIN_SUBSCRIPTION_AMOUNT_CENTS: 100,
};

const PUBLIC_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com', 'protonmail.com'];

/** Resolve billing provider from body first, then contracts, then legacy subs */
function resolveProvider(body, contracts, legacySubs) {
  if (body.billingProvider) return body.billingProvider;
  const contract = contracts?.find(c => c.is_active) || contracts?.[0];
  if (contract?.provider) return contract.provider;
  const sub = legacySubs?.[0];
  if (sub?.provider) return sub.provider;
  return 'unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      referredUserId,
      referredEmail,
      subscriptionId,
      subscriptionAmount,   // may be null for iOS — do NOT penalize if provider = ios
      subscriptionInterval,
      billingProvider,      // stripe | ios | google | unknown
    } = body;

    if (!referredUserId && !referredEmail) {
      return Response.json({ error: 'referredUserId or referredEmail required' }, { status: 400 });
    }

    // ─── Resolve referred user ────────────────────────────────────────────────
    let referredUser = null;
    if (referredUserId) {
      const users = await base44.asServiceRole.entities.User.filter({ id: referredUserId });
      referredUser = users?.[0] || null;
    }
    if (!referredUser && referredEmail) {
      const users = await base44.asServiceRole.entities.User.filter({ email: referredEmail });
      referredUser = users?.[0] || null;
    }

    if (!referredUser) return Response.json({ ok: false, reason: 'referred_user_not_found' });
    if (!referredUser.referred_by_code || !referredUser.referred_by_user_id) {
      return Response.json({ ok: false, reason: 'no_referral_attribution' });
    }

    const now = new Date().toISOString();
    const referrerId = referredUser.referred_by_user_id;
    const referralCode = referredUser.referred_by_code;
    const referredId = referredUser.id;

    // ─── Find the ReferralEvent ───────────────────────────────────────────────
    const events = await base44.asServiceRole.entities.ReferralEvent.filter({
      referral_code: referralCode,
      referred_user_id: referredId,
    });

    if (!events || events.length === 0) {
      return Response.json({ ok: false, reason: 'no_referral_event' });
    }

    const event = events[0];

    if (['qualified', 'rewarded', 'rejected', 'fraud_flagged'].includes(event.status)) {
      return Response.json({ ok: false, reason: 'already_processed', status: event.status });
    }

    // ─── Determine the provider for this qualification ────────────────────────
    // Use caller-supplied billingProvider first (most reliable),
    // then try to infer from referred user's subscription data.
    const referredContracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: referredId,
      is_active: true,
    }).catch(() => []);
    const referredSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: referredId,
    }).catch(() => []);

    const qualificationProvider = resolveProvider({ billingProvider }, referredContracts, referredSubs);
    const isIosQualification = qualificationProvider === 'ios';

    // ─── Fraud checks ─────────────────────────────────────────────────────────
    let fraudScore = 0;
    const fraudReasons = [];

    // 1. Self-referral (instant flag)
    if (referrerId === referredId) {
      fraudScore += 100;
      fraudReasons.push('self_referral');
    }

    // 2. Same non-public email domain
    const referrerEmail = event.referrer_email || '';
    const referredEmailVal = referredUser.email || '';
    const referrerDomain = referrerEmail.split('@')[1];
    const referredDomain = referredEmailVal.split('@')[1];
    if (referrerDomain && referrerDomain === referredDomain && !PUBLIC_EMAIL_DOMAINS.includes(referrerDomain)) {
      fraudScore += 30;
      fraudReasons.push('same_email_domain');
    }

    // 3. Suspiciously fast signup (< 2 minutes from invite to signup)
    if (event.invite_sent_at && event.signup_at) {
      const delta = new Date(event.signup_at) - new Date(event.invite_sent_at);
      if (delta < 2 * 60 * 1000) {
        fraudScore += 40;
        fraudReasons.push('suspiciously_fast_signup');
      }
    }

    // 4. Already qualified (duplicate referral)
    const existingQualified = await base44.asServiceRole.entities.ReferralEvent.filter({
      referred_user_id: referredId,
      status: 'qualified',
    });
    if (existingQualified && existingQualified.length > 0) {
      fraudScore += 100;
      fraudReasons.push('duplicate_referral_already_qualified');
    }

    // 5. Amount check — SKIP for iOS since amount is never available from client sync.
    //    For Stripe and Google, a very low/zero amount is a fraud signal.
    if (!isIosQualification) {
      const amountCents = Math.round((subscriptionAmount || 0) * 100);
      if (amountCents < REWARD_CONFIG.MIN_SUBSCRIPTION_AMOUNT_CENTS) {
        fraudScore += 50;
        fraudReasons.push('subscription_amount_too_low');
      }
    }

    const fraudFlagged = fraudScore >= 80;
    const manualReview = fraudScore >= 40 && fraudScore < 80;

    if (fraudFlagged) {
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'fraud_flagged',
        fraud_score: fraudScore,
        fraud_reason: fraudReasons.join(', '),
        manual_review_required: true,
        subscription_id: subscriptionId,
        subscription_amount: subscriptionAmount,
        subscription_interval: subscriptionInterval || 'month',
        subscription_started_at: now,
      });
      return Response.json({ ok: false, reason: 'fraud_flagged', fraudScore, fraudReasons });
    }

    // ─── Mark event qualified or in manual review ──────────────────────────────
    await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
      status: manualReview ? 'activated' : 'qualified',
      fraud_score: fraudScore,
      fraud_reason: fraudReasons.join(', ') || null,
      manual_review_required: manualReview,
      subscription_id: subscriptionId,
      subscription_amount: subscriptionAmount,
      subscription_interval: subscriptionInterval || 'month',
      subscription_started_at: now,
    });

    if (manualReview) {
      return Response.json({ ok: true, qualified: false, manualReview: true, fraudScore, qualificationProvider });
    }

    // ─── Resolve REFERRER's billing provider (for reward fulfillment routing) ──
    const referrerContracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: referrerId,
      is_active: true,
    }).catch(() => []);
    const referrerSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: referrerId,
    }).catch(() => []);

    const referrerProvider = resolveProvider({}, referrerContracts, referrerSubs);

    // ─── Get ReferralProgram ──────────────────────────────────────────────────
    const programs = await base44.asServiceRole.entities.ReferralProgram.filter({ user_id: referrerId });
    if (!programs || programs.length === 0) {
      return Response.json({ ok: false, reason: 'referrer_program_not_found' });
    }

    const program = programs[0];

    // ─── Max 5 reward credits per referrer per month ──────────────────────────
    const MAX_REWARDS_PER_MONTH = 5;
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentRewards = await base44.asServiceRole.entities.ReferralReward.filter({ user_id: referrerId }).catch(() => []);
    const rewardsThisMonth = (recentRewards || []).filter(r => r.granted_at && r.granted_at >= oneMonthAgo).length;
    if (rewardsThisMonth >= MAX_REWARDS_PER_MONTH) {
      console.warn(`[processReferralQualification] Monthly reward cap hit for referrer ${referrerId}: ${rewardsThisMonth} rewards this month`);
      // Still mark as qualified but skip reward grant — log it
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'qualified',
        fraud_reason: (fraudReasons.join(', ') || '') + ` | monthly_reward_cap_hit (${rewardsThisMonth}/${MAX_REWARDS_PER_MONTH})`,
      });
      return Response.json({ ok: true, qualified: true, rewarded: false, reason: 'monthly_reward_cap', rewardsThisMonth });
    }

    const newQualifiedCount = (program.qualified_referrals || 0) + 1;
    const prevQualifiedCount = program.qualified_referrals || 0;

    const newTotalMonths = Math.floor(newQualifiedCount / REWARD_CONFIG.REFERRALS_PER_FREE_MONTH);
    const prevTotalMonths = Math.floor(prevQualifiedCount / REWARD_CONFIG.REFERRALS_PER_FREE_MONTH);
    const newTotalYears = Math.floor(newQualifiedCount / REWARD_CONFIG.MONTHS_PER_FREE_YEAR);
    const prevTotalYears = Math.floor(prevQualifiedCount / REWARD_CONFIG.MONTHS_PER_FREE_YEAR);

    const newMonthsGranted = newTotalMonths - prevTotalMonths;
    const newYearsGranted = newTotalYears - prevTotalYears;
    const rewardGranted = newMonthsGranted > 0 || newYearsGranted > 0;

    let creditId = null;
    let rewardId = null;

    if (rewardGranted) {
      const rewardType = newYearsGranted > 0 ? 'free_year' : 'free_month';
      const monthsGranted = newYearsGranted > 0 ? 12 * newYearsGranted : newMonthsGranted;

      // 1. SubscriptionCredit (audit ledger)
      const credit = await base44.asServiceRole.entities.SubscriptionCredit.create({
        user_id: referrerId,
        user_email: program.user_email,
        credit_type: rewardType,
        source: 'referral',
        source_referral_event_id: event.id,
        months_granted: monthsGranted,
        granted_at: now,
        status: 'pending',
        notes: `Earned for qualifying referral #${newQualifiedCount} (provider: ${qualificationProvider})`,
      });
      creditId = credit.id;

      // 2. ReferralReward (master fulfillment ledger)
      // billing_provider here is the REFERRER's provider — determines how the reward is fulfilled
      const reward = await base44.asServiceRole.entities.ReferralReward.create({
        user_id: referrerId,
        user_email: program.user_email,
        source_referral_event_id: event.id,
        source_subscription_credit_id: creditId,
        reward_type: rewardType,
        months_granted: monthsGranted,
        billing_provider: referrerProvider,
        status: 'pending',
        granted_at: now,
        fulfillment_attempts: 0,
        metadata: JSON.stringify({
          qualification_provider: qualificationProvider, // which provider the referrED used
          referrer_provider: referrerProvider,           // which provider the referrER uses
        }),
      });
      rewardId = reward.id;

      // 3. Update event
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'rewarded',
        reward_granted_at: now,
        subscription_credit_id: creditId,
      });

      // 4. Update ReferralProgram counters — only increment invites_sent-derived metrics, not here
      await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
        qualified_referrals: newQualifiedCount,
        earned_free_months: (program.earned_free_months || 0) + monthsGranted,
        earned_free_years: (program.earned_free_years || 0) + newYearsGranted,
        pending_rewards: (program.pending_rewards || 0) + 1,
        last_reward_at: now,
      });

      // 5. Trigger fulfillment (fire-and-forget)
      base44.asServiceRole.functions.invoke('fulfillReferralReward', { rewardId }).catch(() => {});

    } else {
      await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
        qualified_referrals: newQualifiedCount,
      });
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'qualified',
      });
    }

    return Response.json({
      ok: true,
      qualified: true,
      rewarded: rewardGranted,
      newQualifiedCount,
      newMonthsGranted,
      newYearsGranted,
      qualificationProvider,
      referrerProvider,
      creditId,
      rewardId,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});