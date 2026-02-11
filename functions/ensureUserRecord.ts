// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be callable by any authenticated user (including new users)
    // Don't require email check here - auth.me() will throw if not authenticated
    let authUser;
    try {
      authUser = await base44.auth.me();
    } catch (error) {
      console.error('[ensureUserRecord] Auth failed:', error);
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authUser?.email) {
      return Response.json({ error: 'No email found in auth user' }, { status: 401 });
    }

    const emailLower = normEmail(authUser.email);
    const userId = authUser.id;
    
    const body = await req.json().catch(() => ({}));
    const platformFromBody = body.platform || 'web';

    // Check if User entity exists by email
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    
    if (existingUsers && existingUsers.length > 0) {
      // User exists - run entitlement reconciliation on every login
      try {
        await base44.functions.invoke('reconcileEntitlementsOnLogin', { 
          platform: platformFromBody 
        });
      } catch (e) {
        console.warn('[ensureUserRecord] Reconciliation failed for existing user (non-fatal):', e);
      }
      
      // Re-fetch user to get updated entitlements
      const updatedUsers = await base44.asServiceRole.entities.User.filter({ email: emailLower });
      const existing = updatedUsers?.[0] || existingUsers[0];
      
      return Response.json({ 
        ok: true, 
        user: existing,
        user_id: userId, 
        reconciled: true 
      });
    }

    // User doesn't exist - create with service role
    // IMPORTANT: Don't set subscription fields to defaults - let reconciliation handle it
    const newUser = await base44.asServiceRole.entities.User.create({
      email: emailLower,
      full_name: authUser.full_name || authUser.name || null,
      platform: platformFromBody || 'web',
      role: authUser.role || 'user'
    });

    // Run entitlement reconciliation immediately after creation
    try {
      const reconReq = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify({ platform: platformFromBody })
      });
      await base44.functions.invoke('reconcileEntitlementsOnLogin', { 
        platform: platformFromBody 
      });
    } catch (e) {
      console.warn('[ensureUserRecord] Reconciliation failed for new user (non-fatal):', e);
    }

    return Response.json({ 
      ok: true, 
      user: newUser,
      user_id: userId, 
      created: true 
    });
  } catch (error) {
    console.error('[ensureUserRecord] error:', error);
    return Response.json({ 
      error: error?.message || 'Failed to ensure user record',
      stack: error?.stack
    }, { status: 500 });
  }
});