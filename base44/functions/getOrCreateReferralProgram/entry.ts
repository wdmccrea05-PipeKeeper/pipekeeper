/**
 * getOrCreateReferralProgram
 * Returns the ReferralProgram for the calling user, creating one if it doesn't exist.
 * Also handles referral link click attribution (pass referralCode param to attribute).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = (Deno.env.get('APP_URL') || 'https://collectionkeeper.base44.app').replace(/\/$/, '');

function generateCode(userId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CK-';
  const seed = userId.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
  for (let i = 0; i < 6; i++) {
    const charSeed = seed.charCodeAt(i % seed.length) + i;
    code += chars[charSeed % chars.length];
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { module } = body; // optional: pipekeeper, whiskeykeeper, cigarkeeper

    const userId = user.id || user.auth_user_id;
    const userEmail = String(user.email || '').toLowerCase();

    // Find existing referral program
    let programs = await base44.entities.ReferralProgram.filter({ user_id: userId });
    if (!programs || programs.length === 0) {
      programs = await base44.entities.ReferralProgram.filter({ user_email: userEmail });
    }

    let program = programs?.[0] || null;

    if (!program) {
      // Create new program
      const code = generateCode(userId);
      const link = `${APP_URL}?ref=${code}${module ? `&m=${module}` : ''}`;
      program = await base44.entities.ReferralProgram.create({
        user_id: userId,
        user_email: userEmail,
        referral_code: code,
        referral_link: link,
        is_active: true,
        total_referrals: 0,
        qualified_referrals: 0,
        earned_free_months: 0,
        earned_free_years: 0,
        pending_rewards: 0,
      });
    }

    // Build module-aware link
    const baseLink = `${APP_URL}?ref=${program.referral_code}`;
    const moduleLink = module ? `${baseLink}&m=${module}` : baseLink;

    return Response.json({
      ok: true,
      program,
      shareLink: moduleLink,
      code: program.referral_code,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});