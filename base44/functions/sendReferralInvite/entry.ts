/**
 * sendReferralInvite
 * Sends visually polished, brand-consistent referral invite emails.
 * Includes HTML + plain text, module-aware copy, and ReferralEvent audit logging.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = (Deno.env.get('APP_URL') || 'https://collectionkeeper.base44.app').replace(/\/$/, '');

const MODULE_LABELS = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

// Escape HTML special characters to prevent injection
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Module-aware body copy
function getModuleCopy(inviterName, module) {
  const safe = esc(inviterName);
  switch (module) {
    case 'pipekeeper':
      return `${safe} invited you to check out CollectionKeeper's PipeKeeper tools — built for tracking pipes, tobacco, cellar details, and smoking sessions.`;
    case 'whiskeykeeper':
      return `${safe} invited you to check out CollectionKeeper's WhiskeyKeeper tools — built for bottles, tasting notes, and collection insights.`;
    case 'cigarkeeper':
      return `${safe} invited you to check out CollectionKeeper's CigarKeeper tools — built for cigar tracking, humidor management, and session logs.`;
    case 'winekeeper':
      return `${safe} invited you to check out CollectionKeeper's WineKeeper tools — built for tracking your wine collection and cellar.`;
    default:
      return `${safe} thought you might like CollectionKeeper — a better way to organize and enjoy your collections.`;
  }
}

function buildHtmlEmail({ inviterName, referralLink, module, personalMessage }) {
  const safeName = esc(inviterName);
  const safeLink = esc(referralLink);
  const moduleLabel = module ? esc(MODULE_LABELS[module] || '') : null;
  const introCopy = getModuleCopy(inviterName, module);

  // Sanitize and truncate personal message
  const safeNote = personalMessage
    ? esc(String(personalMessage).slice(0, 400))
    : null;

  const personalNoteSection = safeNote ? `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <div style="background: #f8f5f1; border-left: 3px solid #c8a97e; border-radius: 4px; padding: 16px 20px;">
          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #8a6c4a; text-transform: uppercase; letter-spacing: 0.05em;">Personal note from ${safeName}</p>
          <p style="margin: 0; font-size: 15px; color: #3d2e20; line-height: 1.6; font-style: italic;">&ldquo;${safeNote}&rdquo;</p>
        </div>
      </td>
    </tr>` : '';

  const moduleChip = moduleLabel ? `
    <tr>
      <td style="padding: 0 0 20px 0;">
        <span style="display: inline-block; background: #f0ebe4; color: #7a5c38; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.04em;">${moduleLabel}</span>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>You've been invited to CollectionKeeper</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f0eb; font-family: Georgia, 'Times New Roman', serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f0eb;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Email card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background-color: #1e1410; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-family: Georgia, serif; font-size: 18px; font-weight: normal; color: #c8a97e; letter-spacing: 0.08em;">COLLECTIONKEEPER</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: rgba(200,169,126,0.6); letter-spacing: 0.12em; font-family: Arial, sans-serif; text-transform: uppercase;">One App. Every Collection.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

                <!-- Headline -->
                <tr>
                  <td style="padding: 0 0 20px 0;">
                    <h1 style="margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: normal; color: #1e1410; line-height: 1.3;">You've been invited to CollectionKeeper</h1>
                  </td>
                </tr>

                ${moduleChip}

                <!-- Intro -->
                <tr>
                  <td style="padding: 0 0 20px 0;">
                    <p style="margin: 0; font-size: 16px; color: #3d2e20; line-height: 1.7; font-family: Arial, sans-serif;">${introCopy}</p>
                  </td>
                </tr>

                ${personalNoteSection}

                <!-- Product explanation -->
                <tr>
                  <td style="padding: 0 0 28px 0;">
                    <p style="margin: 0; font-size: 15px; color: #5a4535; line-height: 1.7; font-family: Arial, sans-serif;">CollectionKeeper includes dedicated tools like PipeKeeper, WhiskeyKeeper, and CigarKeeper, built to help collectors track what they own, log notes and sessions, and better understand their collections over time.</p>
                  </td>
                </tr>

                <!-- CTA button -->
                <tr>
                  <td style="padding: 0 0 16px 0;" align="center">
                    <a href="${safeLink}"
                       style="display: inline-block; background-color: #1e1410; color: #c8a97e; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 6px; letter-spacing: 0.04em;"
                       target="_blank" rel="noopener noreferrer">
                      Accept Invite
                    </a>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding: 0 0 32px 0;" align="center">
                    <p style="margin: 0; font-size: 12px; color: #9a8070; font-family: Arial, sans-serif;">If the button does not work, use this link:</p>
                    <p style="margin: 6px 0 0 0;">
                      <a href="${safeLink}" style="color: #7a5c38; font-size: 12px; font-family: Arial, sans-serif; word-break: break-all;">${safeLink}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #ede8e2; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #9a8070; font-family: Arial, sans-serif; line-height: 1.6;">This invitation was sent by <strong style="color: #5a4535;">${safeName}</strong> through CollectionKeeper.</p>
              <p style="margin: 0; font-size: 12px; color: #b0a090; font-family: Arial, sans-serif;">If you did not expect this invitation, you can safely ignore this email.</p>
            </td>
          </tr>

        </table>
        <!-- End email card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainTextEmail({ inviterName, referralLink, module, personalMessage }) {
  const moduleLabel = module ? (MODULE_LABELS[module] || '') : null;
  const introCopy = module
    ? `${inviterName} invited you to check out CollectionKeeper${moduleLabel ? `'s ${moduleLabel} tools` : ''}.`
    : `${inviterName} thought you might like CollectionKeeper — a better way to organize and enjoy your collections.`;

  const noteSection = personalMessage
    ? `\nPersonal note from ${inviterName}:\n"${String(personalMessage).slice(0, 400)}"\n`
    : '';

  return `You've been invited to CollectionKeeper
${'─'.repeat(40)}

${introCopy}
${noteSection}
CollectionKeeper includes dedicated tools like PipeKeeper, WhiskeyKeeper, and CigarKeeper, built to help collectors track what they own, log notes and sessions, and better understand their collections over time.

Accept your invite:
${referralLink}

${'─'.repeat(40)}
This invitation was sent by ${inviterName} through CollectionKeeper.
One App. Every Collection.

If you did not expect this invitation, you can safely ignore this email.`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      emails = [],
      personalMessage = '',
      module = null,
      referralCode,
      preview = false,  // preview mode: return rendered email without sending
    } = body;

    if (!referralCode) return Response.json({ error: 'referralCode required' }, { status: 400 });

    const userId = user.id || user.auth_user_id;
    const userEmail = String(user.email || '').toLowerCase();
    const inviterName = user.full_name || 'A CollectionKeeper member';
    const now = new Date().toISOString();

    const referralLink = `${APP_URL}?ref=${referralCode}${module ? `&m=${module}` : ''}`;

    const emailData = { inviterName, referralLink, module, personalMessage };
    const htmlBody = buildHtmlEmail(emailData);
    const plainText = buildPlainTextEmail(emailData);
    const subject = `${inviterName} invited you to CollectionKeeper`;

    // Preview mode — return rendered templates without sending
    if (preview) {
      return Response.json({ ok: true, preview: true, subject, html: htmlBody, text: plainText });
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: 'emails array required' }, { status: 400 });
    }

    const results = [];

    for (const rawEmail of emails) {
      const email = String(rawEmail || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email, ok: false, error: 'invalid email' });
        continue;
      }

      if (email === userEmail) {
        results.push({ email, ok: false, error: 'self_referral' });
        continue;
      }

      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers && existingUsers.length > 0) {
        results.push({ email, ok: false, error: 'already_user' });
        continue;
      }

      let sendStatus = 'failed';
      let sendError = null;

      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject,
          body: htmlBody,
          from_name: 'CollectionKeeper Invitations',
        });

        sendStatus = 'sent';

        // Audit log: ReferralEvent
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
        sendError = err.message;
        results.push({ email, ok: false, error: err.message });
      }

      // Log send attempt regardless of outcome
      if (import.meta?.env?.DEV) {
        console.log(`[sendReferralInvite] to=${email} status=${sendStatus} module=${module || 'general'} error=${sendError || 'none'}`);
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