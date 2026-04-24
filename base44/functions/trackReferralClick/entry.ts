/**
 * trackReferralClick
 *
 * Records referrer-side sharing actions (copy, share, native share open)
 * and recipient-side URL clicks as distinct, semantically correct event types.
 *
 * channel values and their meaning:
 *   'link'   — recipient clicked a shared referral URL (opens the app)
 *   'copy'   — referrer copied their link to clipboard
 *   'share'  — referrer opened native share sheet
 *
 * IMPORTANT: 'link' = recipient_clicked (external, anonymous, no auth required)
 *            'copy' and 'share' = referrer action (internal, authenticated preferred)
 *
 * Does NOT use ReferralEvent.status = 'clicked' for copy/share — those are
 * internal referrer actions, not funnel steps.
 *
 * Payload: { referralCode, module?, channel }
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

    // ─── Recipient-side link click (anonymous, funnel step) ───────────────────
    if (channel === 'link') {
      // Debounce: don't spam on page reloads — 5-min window
      const recentCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const recentClicks = await base44.asServiceRole.entities.ReferralEvent.filter({
        referral_code: referralCode,
        status: 'clicked',
      });
      const veryRecent = recentClicks.find(e => !e.referred_user_id && e.link_clicked_at > recentCutoff);

      if (!veryRecent) {
        await base44.asServiceRole.entities.ReferralEvent.create({
          referrer_user_id: program.user_id,
          referrer_email: program.user_email,
          referral_code: referralCode,
          invite_channel: 'link',
          link_clicked_at: now,
          status: 'clicked',
          fraud_score: 0,
          manual_review_required: false,
        });

        // Increment recipient_clicks on the program
        await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
          recipient_clicks: (program.recipient_clicks || 0) + 1,
        });
      }

      return Response.json({ ok: true, tracked: !veryRecent, debounced: !!veryRecent, channel: 'link' });
    }

    // ─── Referrer-side share actions (copy / share) ──────────────────────────
    // These are internal actions by the referrer, NOT funnel steps.
    // We update program-level counters only — no ReferralEvent row created.
    if (channel === 'copy') {
      await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
        links_copied: (program.links_copied || 0) + 1,
      });
      return Response.json({ ok: true, tracked: true, channel: 'copy' });
    }

    if (channel === 'share') {
      await base44.asServiceRole.entities.ReferralProgram.update(program.id, {
        shares_opened: (program.shares_opened || 0) + 1,
      });
      return Response.json({ ok: true, tracked: true, channel: 'share' });
    }

    return Response.json({ ok: false, reason: 'unknown_channel', channel });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});