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
    // The built-in User entity may exist from auth, but we need to ensure entitlement fields
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    
    console.log('[ensureUserRecord] Found existing users:', existingUsers?.length || 0);
    
    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0];
      console.log('[ensureUserRecord] User exists, updating last_login...');

      // Only set entitlement fields if not already set — never downgrade
      const existingTier = existing.entitlement_tier || null;
      const patch = { last_login: new Date().toISOString() };
      if (!existingTier) {
        patch.entitlement_tier = 'free';
        patch.pipekeeper_paid = false;
        patch.whiskeykeeper_paid = false;
      }

      // Single update — no double-write
      await base44.asServiceRole.entities.User.update(existing.id, patch);
      
      // Ensure UserProfile exists for existing user
      try {
        const existingProfile = await base44.asServiceRole.entities.UserProfile.filter({ user_email: emailLower });
        if (!existingProfile || existingProfile.length === 0) {
          await base44.asServiceRole.entities.UserProfile.create({
            user_email: emailLower,
            pipekeeper_enabled: false,
            whiskeykeeper_enabled: false,
            winekeeper_enabled: false,
            cigarkeeper_enabled: false,
            module_preferences_set: false
          });
          console.log('[ensureUserRecord] UserProfile created for existing user');
        }
      } catch (profileError) {
        // Non-fatal: if profile creation fails, continue
        console.warn('[ensureUserRecord] Failed to ensure UserProfile (non-fatal):', profileError?.message);
      }
      
      return Response.json({ 
        ok: true, 
        user: { ...existing, ...patch },
        user_id: userId, 
        reconciled: true 
      });
    }

    // User doesn't exist in User entity - create with service role
    console.log('[ensureUserRecord] Creating new User entity for:', emailLower);
    const newUser = await base44.asServiceRole.entities.User.create({
      email: emailLower,
      full_name: authUser.full_name || authUser.name || null,
      entitlement_tier: 'free',
      has_paid_access: false,
      pipekeeper_paid: false,
      whiskeykeeper_paid: false,
      last_login: new Date().toISOString(),
      role: authUser.role || 'user'
    });

    // Also create UserProfile for module preferences
    console.log('[ensureUserRecord] Creating UserProfile for new user');
    try {
      const existingProfile = await base44.asServiceRole.entities.UserProfile.filter({ user_email: emailLower });
      if (!existingProfile || existingProfile.length === 0) {
        await base44.asServiceRole.entities.UserProfile.create({
          user_email: emailLower,
          pipekeeper_enabled: false,
          whiskeykeeper_enabled: false,
          winekeeper_enabled: false,
          cigarkeeper_enabled: false,
          module_preferences_set: false
        });
        console.log('[ensureUserRecord] UserProfile created with default module preferences');
      }
    } catch (profileError) {
      // Non-fatal: if profile creation fails, continue
      console.warn('[ensureUserRecord] Failed to create UserProfile (non-fatal):', profileError?.message);
    }

    console.log('[ensureUserRecord] New user created successfully');
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