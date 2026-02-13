// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, tier } = body;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    if (!tier || !['premium', 'pro', 'free'].includes(tier.toLowerCase())) {
      return Response.json({ error: 'Invalid tier. Must be premium, pro, or free' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedTier = tier.toLowerCase();

    console.log(`[updateEntitlement] Updating ${normalizedEmail} to ${normalizedTier}`);

    // Get user
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const beforeTier = targetUser.data?.entitlement_tier || targetUser.data?.subscription_tier || 'free';

    // Clean and update user data
    const cleanData = { ...(targetUser.data || {}) };
    delete cleanData.data; // Remove any nested structure

    cleanData.entitlement_tier = normalizedTier;
    cleanData.subscription_tier = normalizedTier;
    cleanData.subscription_level = normalizedTier === 'free' ? 'free' : 'paid';
    cleanData.subscription_status = normalizedTier === 'free' ? 'inactive' : 'active';

    await base44.asServiceRole.entities.User.update(targetUser.id, {
      data: cleanData
    });

    // Force browser cache refresh
    try {
      localStorage?.setItem('pk_force_entitlement_refresh', Date.now().toString());
    } catch {}

    console.log(`[updateEntitlement] Updated ${normalizedEmail}: ${beforeTier} → ${normalizedTier}`);

    return Response.json({
      ok: true,
      email: normalizedEmail,
      before: beforeTier,
      after: normalizedTier,
      message: `User entitlement updated successfully. User must log out and back in to see changes.`
    });

  } catch (error) {
    console.error('[updateEntitlement] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
});