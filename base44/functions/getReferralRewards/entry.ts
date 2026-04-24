/**
 * getReferralRewards
 * Returns the calling user's ReferralReward rows and ReferralEarnedAccess records.
 * Available to all authenticated users (not gated to paid subscribers).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id || user.auth_user_id;

    const [rewards, earnedAccess] = await Promise.all([
      base44.entities.ReferralReward.filter({ user_id: userId }, '-granted_at', 50),
      base44.entities.ReferralEarnedAccess.filter({ user_id: userId }, '-granted_at', 20).catch(() => []),
    ]);

    return Response.json({ ok: true, rewards, earnedAccess });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});