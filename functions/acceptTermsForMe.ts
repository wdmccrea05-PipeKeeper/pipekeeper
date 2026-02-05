import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    
    if (!me?.id || !me?.email) {
      return Response.json({ ok: false, error: 'Missing auth identity' }, { status: 401 });
    }

    const userId = me.id;
    const email = (me.email || '').trim().toLowerCase();
    const srv = base44.asServiceRole;

    // Find canonical profile: prefer user_id, fallback to email
    let profile = null;
    if (userId) {
      const byId = await srv.entities.UserProfile.filter({ user_id: userId });
      profile = Array.isArray(byId) ? byId[0] : null;
    }

    if (!profile) {
      const byEmail = await srv.entities.UserProfile.filter({ user_email: email });
      profile = Array.isArray(byEmail) ? byEmail[0] : null;
    }

    // Create if missing
    if (!profile) {
      profile = await srv.entities.UserProfile.create({
        user_id: userId,
        user_email: email,
        subscription_tier: 'free',
        tos_accepted: true,
        tos_accepted_at: new Date().toISOString(),
      });
    } else {
      // Update existing: backfill user_id if missing, always set ToS
      await srv.entities.UserProfile.update(profile.id, {
        user_id: userId,
        user_email: email,
        tos_accepted: true,
        tos_accepted_at: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[acceptTermsForMe]', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});