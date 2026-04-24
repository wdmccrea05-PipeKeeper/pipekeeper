/**
 * sendReferralInvite
 * Sends referral-tracked invite emails and creates ReferralEvent rows.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = (Deno.env.get('APP_URL') || 'https://collectionkeeper.base44.app').replace(/\/$/, '');

const MODULE_LABELS = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { emails = [], personalMessage = '', module = null, referralCode } = body;

    if (!referralCode) return Response.json({ error: 'referralCode required' }, { status: 400 });
    if (!Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: 'emails array required' }, { status: 400 });
    }

    const userId = user.id || user.auth_user_id;
    const userEmail = String(user.email || '').toLowerCase();
    const inviterName = user.full_name || 'A CollectionKeeper member';
    const moduleLabel = module ? MODULE_LABELS[module] : null;
    const now = new Date().toISOString();

    const referralLink = `${APP_URL}?ref=${referralCode}${module ? `&m=${module}` : ''}`;

    const results = [];

    for (const rawEmail of emails) {
      const email = String(rawEmail || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email, ok: false, error: 'invalid email' });
        continue;
      }

      // Self-referral guard
      if (email === userEmail) {
        results.push({ email, ok: false, error: 'self_referral' });
        continue;
      }

      // Check if already a user
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers && existingUsers.length > 0) {
        results.push({ email, ok: false, error: 'already_user' });
        continue;
      }

      // Build email body
      const moduleSection = moduleLabel
        ? `\nThis invite is specifically for ${moduleLabel} — the ${moduleLabel} module lets you:\n- Track and manage your collection with precision\n- Log sessions and tasting notes\n- Get intelligent recommendations based on your actual collection\n`
        : '';

      const personalSection = personalMessage
        ? `\n"${personalMessage}"\n— ${inviterName}\n`
        : '';

      const emailBody = `Hello,

${inviterName} has invited you to join CollectionKeeper — a purpose-built app for managing and understanding your pipe, tobacco, and whiskey collection.
${personalSection}
${moduleSection}
CollectionKeeper helps you:
- Track your collection with precision
- Log sessions and tasting notes that inform future choices
- Get intelligent pairing and session recommendations

Join using ${inviterName}'s personal referral link:
${referralLink}

Welcome aboard,
The CollectionKeeper Team

If you didn't expect this invitation, you can safely ignore this email.`;

      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `${inviterName} invited you to CollectionKeeper`,
          body: emailBody,
          from_name: 'CollectionKeeper',
        });

        // Create ReferralEvent
        await base44.asServiceRole.entities.ReferralEvent.create({
          referrer_user_id: userId,
          referrer_email: userEmail,
          referred_email: email,
          referral_code: referralCode,
          invite_channel: 'email',
          invite_sent_at: now,
          status: 'invited',
          fraud_score: 0,
          manual_review_required: false,
        });

        results.push({ email, ok: true });
      } catch (err) {
        results.push({ email, ok: false, error: err.message });
      }
    }

    // Update total_referrals count on ReferralProgram
    const sentCount = results.filter(r => r.ok).length;
    if (sentCount > 0) {
      const programs = await base44.entities.ReferralProgram.filter({ user_id: userId });
      if (programs && programs.length > 0) {
        const prog = programs[0];
        await base44.entities.ReferralProgram.update(prog.id, {
          total_referrals: (prog.total_referrals || 0) + sentCount,
        });
      }
    }

    return Response.json({ ok: true, results, sent: sentCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});