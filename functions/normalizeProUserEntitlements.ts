import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Normalize Pro/Premium users' entitlement_tier to top-level field
 * Scans all active pro/premium subscriptions and ensures user.entitlement_tier matches
 * Run once to backfill, then periodically to catch edge cases
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active pro/premium subscriptions
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      status: 'active',
      tier: 'pro'
    });

    const proSubsByUserId = new Map();
    const proSubsByEmail = new Map();

    for (const sub of subs) {
      if (sub.user_id) proSubsByUserId.set(sub.user_id, sub);
      if (sub.user_email) proSubsByEmail.set(sub.user_email.toLowerCase(), sub);
    }

    // Also fetch premium (legacy)
    const premiumSubs = await base44.asServiceRole.entities.Subscription.filter({
      status: 'active',
      tier: 'premium'
    });

    for (const sub of premiumSubs) {
      if (sub.user_id && !proSubsByUserId.has(sub.user_id)) proSubsByUserId.set(sub.user_id, sub);
      if (sub.user_email && !proSubsByEmail.has(sub.user_email.toLowerCase())) proSubsByEmail.set(sub.user_email.toLowerCase(), sub);
    }

    const normalized = [];
    const skipped = [];

    // Scan all users (admin only)
    const allUsers = await base44.asServiceRole.entities.User.list();

    for (const u of allUsers) {
      const userId = u.id || u.auth_user_id;
      const email = u.email ? u.email.toLowerCase() : null;

      // Find matching subscription
      const sub = proSubsByUserId.get(userId) || (email ? proSubsByEmail.get(email) : null);
      if (!sub) {
        skipped.push({ user_id: userId, email: u.email, reason: 'No active pro/premium subscription' });
        continue;
      }

      // Check current entitlement
      const current = u.entitlement_tier || u.data?.entitlement_tier || 'free';
      const expected = (sub.tier || 'premium').toLowerCase();

      if (current === expected) {
        skipped.push({ user_id: userId, email: u.email, reason: 'Already correct' });
        continue;
      }

      // Update to expected tier
      try {
        await base44.asServiceRole.entities.User.update(userId, {
          entitlement_tier: expected
        });
        normalized.push({
          user_id: userId,
          email: u.email,
          old_tier: current,
          new_tier: expected,
          subscription_id: sub.id
        });
      } catch (err) {
        console.error(`Failed to update user ${userId}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      normalized: normalized.length,
      skipped: skipped.length,
      details: {
        normalized,
        skipped: skipped.slice(0, 10) // Just show first 10
      }
    });
  } catch (error) {
    console.error('[normalizeProUserEntitlements] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});