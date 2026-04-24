/**
 * trackReferralClick
 *
 * Called when a visitor opens a ?ref=... URL.
 * Creates or updates a ReferralEvent row with link_clicked_at and status = clicked.
 * Does NOT require authentication — visitor may not be signed in yet.
 * Also increments total_referrals on the ReferralProgram when first click is recorded.
 *
 * Payload: { referralCode, module?, channel? }
 * channel: 'link' | 'copy' | 'share' | 'email'
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { referralCode, module: moduleKey, channel = 'link' } = body;

    if (!referralCode) {
      return Response.json({ error: 'referralCode required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Look up the referral program
    const programs = await base44.asServiceRole.entities.ReferralProgram.filter({
      referral_code: referralCode,
    });
    const program = programs?.[0];

    if (!program) {
      return Response.json({ ok: false, reason: 'invalid_code' });
    }

    // Look for an existing "clicked" or "invited" event with no referred_user_id yet
    // (an anonymous pre-signup click)
    const existingClicks = await base44.asServiceRole.entities.ReferralEvent.filter({
      referral_code: referralCode,
      status: 'clicked',
    });

    // Only create a new anonymous click event if there isn't a very recent one
    // (debounce: avoid spamming on page reloads)
    const recentCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min
    const veryRecent = existingClicks.find(e => !e.referred_user_id && e.link_clicked_at > recentCutoff);

    if (!veryRecent) {
      await base44.asServiceRole.entities.ReferralEvent.create({
        referrer_user_id: program.user_id,
        referrer_email: program.user_email,
        referral_code: referralCode,
        invite_channel: channel,
        link_clicked_at: now,
        status: 'clicked',
        fraud_score: 0,
        manual_review_required: false,
      });

      // Increment total_referrals on program for copy/share channel events
      // (email invites already increment total_referrals when sendReferralInvite is called)
      if (channel === 'copy' || channel === 'share' || channel === 'link') {
        await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
          total_referrals: (program.total_referrals || 0) + 1,
        });
      }
    }

    return Response.json({ ok: true, tracked: !veryRecent, debounced: !!veryRecent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});