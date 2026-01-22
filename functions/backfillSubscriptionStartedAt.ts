import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backfills started_at for existing paid subscribers.
 * Sets to a date before PRO_LAUNCH_CUTOFF_ISO to grandfather them as legacy premium.
 * 
 * This is an admin-only function.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Date before PRO launch to grandfather existing users
    const legacyDate = '2026-01-31T23:59:59.000Z';
    
    // Get all subscriptions
    const subscriptions = await base44.asServiceRole.entities.Subscription.list();
    
    const updates = [];
    
    for (const sub of subscriptions) {
      // Only update if:
      // 1. No started_at is set yet
      // 2. User has an active or trialing subscription
      if (!sub.started_at && (sub.status === 'active' || sub.status === 'trialing')) {
        try {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            started_at: legacyDate,
          });
          updates.push({
            user_email: sub.user_email,
            status: 'updated',
            started_at: legacyDate,
          });
        } catch (err) {
          updates.push({
            user_email: sub.user_email,
            status: 'failed',
            error: err.message,
          });
        }
      }
    }
    
    return Response.json({
      success: true,
      total_subscriptions: subscriptions.length,
      updated: updates.filter(u => u.status === 'updated').length,
      failed: updates.filter(u => u.status === 'failed').length,
      details: updates,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});