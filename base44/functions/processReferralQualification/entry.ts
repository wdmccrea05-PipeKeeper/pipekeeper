/**
 * processReferralQualification
 * Called when a referred user converts to a paid subscriber.
 * Handles fraud checks, qualification, and reward granting.
 * 
 * Reward config (treat as soft config):
 *   REFERRALS_PER_FREE_MONTH = 1
 *   MONTHS_PER_FREE_YEAR = 12
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REFERRALS_PER_FREE_MONTH = 1;
const MONTHS_PER_FREE_YEAR = 12;
const MIN_SUBSCRIPTION_AMOUNT_CENTS = 100; // at least $1 to qualify

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This can be called by the webhook handler or an admin
    const body = await req.json().catch(() => ({}));
    const { referredUserId, referredEmail, subscriptionId, subscriptionAmount, subscriptionInterval } = body;

    if (!referredUserId && !referredEmail) {
      return Response.json({ error: 'referredUserId or referredEmail required' }, { status: 400 });
    }

    // Find the referred user's attribution
    let referredUser = null;
    if (referredUserId) {
      const users = await base44.asServiceRole.entities.User.filter({ id: referredUserId });
      referredUser = users?.[0] || null;
    }
    if (!referredUser && referredEmail) {
      const users = await base44.asServiceRole.entities.User.filter({ email: referredEmail });
      referredUser = users?.[0] || null;
    }

    if (!referredUser) {
      return Response.json({ ok: false, reason: 'referred_user_not_found' });
    }

    if (!referredUser.referred_by_code || !referredUser.referred_by_user_id) {
      return Response.json({ ok: false, reason: 'no_referral_attribution' });
    }

    const now = new Date().toISOString();
    const referrerId = referredUser.referred_by_user_id;
    const referralCode = referredUser.referred_by_code;

    // Find the ReferralEvent
    const events = await base44.asServiceRole.entities.ReferralEvent.filter({
      referral_code: referralCode,
      referred_user_id: referredUserId || referredUser.id,
    });

    if (!events || events.length === 0) {
      return Response.json({ ok: false, reason: 'no_referral_event' });
    }

    const event = events[0];

    // Already processed?
    if (['qualified', 'rewarded', 'rejected', 'fraud_flagged'].includes(event.status)) {
      return Response.json({ ok: false, reason: 'already_processed', status: event.status });
    }

    // ─── Fraud checks ────────────────────────────────────────────────────────
    let fraudScore = 0;
    const fraudReasons = [];

    // Self-referral double-check
    if (referrerId === (referredUserId || referredUser.id)) {
      fraudScore += 100;
      fraudReasons.push('self_referral');
    }

    // Same email domain as referrer (weak signal)
    const referrerEmail = event.referrer_email || '';
    const referredEmailVal = referredUser.email || '';
    const referrerDomain = referrerEmail.split('@')[1];
    const referredDomain = referredEmailVal.split('@')[1];
    if (referrerDomain && referrerDomain === referredDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com'].includes(referrerDomain)) {
      fraudScore += 30;
      fraudReasons.push('same_email_domain');
    }

    // Very fast signup after invite (< 2 minutes = suspicious bot)
    if (event.invite_sent_at && event.signup_at) {
      const delta = new Date(event.signup_at) - new Date(event.invite_sent_at);
      if (delta < 2 * 60 * 1000) {
        fraudScore += 40;
        fraudReasons.push('suspiciously_fast_signup');
      }
    }

    // Check for duplicate referrals (same referred user already rewarded elsewhere)
    const existingQualified = await base44.asServiceRole.entities.ReferralEvent.filter({
      referred_user_id: referredUserId || referredUser.id,
      status: 'qualified',
    });
    if (existingQualified && existingQualified.length > 0) {
      fraudScore += 100;
      fraudReasons.push('duplicate_referral_already_qualified');
    }

    // Subscription amount too low
    const amountCents = Math.round((subscriptionAmount || 0) * 100);
    if (amountCents < MIN_SUBSCRIPTION_AMOUNT_CENTS) {
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

    // ─── Mark as qualified ────────────────────────────────────────────────────
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

    // ─── Grant reward to referrer ──────────────────────────────────────────────
    // Get/update referrer's ReferralProgram
    const programs = await base44.asServiceRole.entities.ReferralProgram.filter({ user_id: referrerId });
    if (!programs || programs.length === 0) {
      return Response.json({ ok: false, reason: 'referrer_program_not_found' });
    }

    const program = programs[0];
    const newQualifiedCount = (program.qualified_referrals || 0) + 1;
    const newTotalMonths = Math.floor(newQualifiedCount / REFERRALS_PER_FREE_MONTH);
    const newTotalYears = Math.floor(newQualifiedCount / MONTHS_PER_FREE_YEAR);
    const prevTotalMonths = Math.floor((program.qualified_referrals || 0) / REFERRALS_PER_FREE_MONTH);
    const prevTotalYears = Math.floor((program.qualified_referrals || 0) / MONTHS_PER_FREE_YEAR);

    const newMonthsGranted = newTotalMonths - prevTotalMonths;
    const newYearsGranted = newTotalYears - prevTotalYears;

    // Create SubscriptionCredit(s)
    let creditId = null;
    if (newYearsGranted > 0) {
      const credit = await base44.asServiceRole.entities.SubscriptionCredit.create({
        user_id: referrerId,
        user_email: program.user_email,
        credit_type: 'free_year',
        source: 'referral',
        source_referral_event_id: event.id,
        months_granted: 12 * newYearsGranted,
        granted_at: now,
        status: 'pending',
        notes: `Earned via ${newQualifiedCount} qualified referrals`,
      });
      creditId = credit.id;
    } else if (newMonthsGranted > 0) {
      const credit = await base44.asServiceRole.entities.SubscriptionCredit.create({
        user_id: referrerId,
        user_email: program.user_email,
        credit_type: 'free_month',
        source: 'referral',
        source_referral_event_id: event.id,
        months_granted: newMonthsGranted,
        granted_at: now,
        status: 'pending',
        notes: `Earned for qualifying referral #${newQualifiedCount}`,
      });
      creditId = credit.id;
    }

    // Update ReferralProgram
    await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
      qualified_referrals: newQualifiedCount,
      earned_free_months: (program.earned_free_months || 0) + newMonthsGranted + (newYearsGranted * 12),
      earned_free_years: (program.earned_free_years || 0) + newYearsGranted,
      pending_rewards: (program.pending_rewards || 0) + (newMonthsGranted > 0 || newYearsGranted > 0 ? 1 : 0),
      last_reward_at: newMonthsGranted > 0 || newYearsGranted > 0 ? now : program.last_reward_at,
    });

    // Mark event as rewarded
    await base44.asServiceRole.entities.ReferralEvent.update(event.id, {
      status: 'rewarded',
      reward_granted_at: now,
      subscription_credit_id: creditId,
    });

    return Response.json({
      ok: true,
      qualified: true,
      rewarded: newMonthsGranted > 0 || newYearsGranted > 0,
      newQualifiedCount,
      newMonthsGranted,
      newYearsGranted,
      creditId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});