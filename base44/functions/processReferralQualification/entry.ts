/**
 * processReferralQualification
 *
 * Called when a referred user converts to a paid subscriber.
 * Handles fraud checks, qualification, SubscriptionCredit creation,
 * ReferralReward creation, and routes fulfillment by billing provider.
 *
 * Reward config — single source of truth:
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REWARD_CONFIG = {
  REFERRALS_PER_FREE_MONTH: 1,
  MONTHS_PER_FREE_YEAR: 12,
  MIN_SUBSCRIPTION_AMOUNT_CENTS: 100,
};

/** Resolve billing provider from any available source */
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
      subscriptionAmount,
      subscriptionInterval,
      billingProvider, // stripe | ios | google — caller should pass this
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

    // ─── Fraud checks ─────────────────────────────────────────────────────────
    let fraudScore = 0;
    const fraudReasons = [];

    if (referrerId === referredId) {
      fraudScore += 100;
      fraudReasons.push('self_referral');
    }

    const referrerEmail = event.referrer_email || '';
    const referredEmailVal = referredUser.email || '';
    const referrerDomain = referrerEmail.split('@')[1];
    const referredDomain = referredEmailVal.split('@')[1];
    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com'];
    if (referrerDomain && referrerDomain === referredDomain && !publicDomains.includes(referrerDomain)) {
      fraudScore += 30;
      fraudReasons.push('same_email_domain');
    }

    if (event.invite_sent_at && event.signup_at) {
      const delta = new Date(event.signup_at) - new Date(event.invite_sent_at);
      if (delta < 2 * 60 * 1000) {
        fraudScore += 40;
        fraudReasons.push('suspiciously_fast_signup');
      }
    }

    const existingQualified = await base44.asServiceRole.entities.ReferralEvent.filter({
      referred_user_id: referredId,
      status: 'qualified',
    });
    if (existingQualified && existingQualified.length > 0) {
      fraudScore += 100;
      fraudReasons.push('duplicate_referral_already_qualified');
    }

    const amountCents = Math.round((subscriptionAmount || 0) * 100);
    if (amountCents < REWARD_CONFIG.MIN_SUBSCRIPTION_AMOUNT_CENTS) {
      fraudScore += 50;
      fraudReasons.push('subscription_amount_too_low');
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

    // ─── Mark event qualified ─────────────────────────────────────────────────
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
      return Response.json({ ok: true, qualified: false, manualReview: true, fraudScore });
    }

    // ─── Resolve referrer's billing provider ──────────────────────────────────
    const referrerContracts = await base44.asServiceRole.entities.ActiveContract.filter({
      user_id: referrerId,
      is_active: true,
    }).catch(() => []);

    const referrerSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_id: referrerId,
    }).catch(() => []);

    const detectedProvider = resolveProvider({ billingProvider }, referrerContracts, referrerSubs);

    // ─── Get ReferralProgram ──────────────────────────────────────────────────
    const programs = await base44.asServiceRole.entities.ReferralProgram.filter({ user_id: referrerId });
    if (!programs || programs.length === 0) {
      return Response.json({ ok: false, reason: 'referrer_program_not_found' });
    }

    const program = programs[0];
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

      // 1. Create SubscriptionCredit (audit ledger)
      const credit = await base44.asServiceRole.entities.SubscriptionCredit.create({
        user_id: referrerId,
        user_email: program.user_email,
        credit_type: rewardType,
        source: 'referral',
        source_referral_event_id: event.id,
        months_granted: monthsGranted,
        granted_at: now,
        status: 'pending',
        notes: `Earned for qualifying referral #${newQualifiedCount}`,
      });
      creditId = credit.id;

      // 2. Create ReferralReward (master fulfillment ledger)
      const reward = await base44.asServiceRole.entities.ReferralReward.create({
        user_id: referrerId,
        user_email: program.user_email,
        source_referral_event_id: event.id,
        source_subscription_credit_id: creditId,
        reward_type: rewardType,
        months_granted: monthsGranted,
        billing_provider: detectedProvider,
        status: 'pending',
        granted_at: now,
        fulfillment_attempts: 0,
      });
      rewardId = reward.id;

      // 3. Update event with credit ref
      await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
        status: 'rewarded',
        reward_granted_at: now,
        subscription_credit_id: creditId,
      });

      // 4. Update ReferralProgram counters
      await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
        qualified_referrals: newQualifiedCount,
        earned_free_months: (program.earned_free_months || 0) + monthsGranted,
        earned_free_years: (program.earned_free_years || 0) + newYearsGranted,
        pending_rewards: (program.pending_rewards || 0) + 1,
        last_reward_at: now,
      });

      // 5. Trigger fulfillment (fire-and-forget — don't block response)
      base44.asServiceRole.functions.invoke('fulfillReferralReward', { rewardId }).catch(() => {});

    } else {
      // Qualified but no new reward milestone yet — just update counters
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
      detectedProvider,
      creditId,
      rewardId,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});