/**
 * attributeReferral
 * Called on signup / first login to attach referral attribution to the new user.
 * Pass: referralCode (from URL param captured before signup)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { referralCode, referralSource } = body;

    if (!referralCode) return Response.json({ error: 'referralCode required' }, { status: 400 });

    const userId = user.id || user.auth_user_id;
    const userEmail = String(user.email || '').toLowerCase();

    // Already attributed?
    if (user.referred_by_code) {
      return Response.json({ ok: true, alreadyAttributed: true });
    }

    // Find the referral program with this code
    const programs = await base44.asServiceRole.entities.ReferralProgram.filter({ referral_code: referralCode });
    if (!programs || programs.length === 0) {
      return Response.json({ ok: false, error: 'invalid_code' });
    }

    const program = programs[0];

    // Self-referral guard
    if (program.user_id === userId || program.user_email === userEmail) {
      return Response.json({ ok: false, error: 'self_referral' });
    }

    // Attach attribution to user
    const now = new Date().toISOString();
    await base44.auth.updateMe({
      referred_by_user_id: program.user_id,
      referred_by_code: referralCode,
      referral_attributed_at: now,
      referral_source: referralSource || 'link',
      is_referral_signup: true,
    });

    // Find existing ReferralEvent for this referred email and update it
    const events = await base44.asServiceRole.entities.ReferralEvent.filter({
      referral_code: referralCode,
      referred_email: userEmail,
    });

    if (events && events.length > 0) {
      await base44.asServiceRole.entities.ReferralEvent.update(events[0].id, {
        referred_user_id: userId,
        signup_at: now,
        status: 'signed_up',
      });
    } else {
      // Create event (link-click signup without prior email invite)
      await base44.asServiceRole.entities.ReferralEvent.create({
        referrer_user_id: program.user_id,
        referrer_email: program.user_email,
        referred_user_id: userId,
        referred_email: userEmail,
        referral_code: referralCode,
        invite_channel: 'link',
        signup_at: now,
        status: 'signed_up',
        fraud_score: 0,
        manual_review_required: false,
      });
    }

    return Response.json({ ok: true, attributed: true, referrerId: program.user_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});