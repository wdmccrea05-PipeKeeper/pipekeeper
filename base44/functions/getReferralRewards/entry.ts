/**
 * getReferralRewards
 * Returns the calling user's ReferralReward rows for display in the dashboard.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id || user.auth_user_id;

    const rewards = await base44.entities.ReferralReward.filter({ user_id: userId }, '-granted_at', 50);

    return Response.json({ ok: true, rewards });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});