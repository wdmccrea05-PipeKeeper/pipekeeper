// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { reconcileUserEntitlements } from './_utils/reconcileEntitlements.js';

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
      const existing = existingUsers[0];
      
      // Run entitlement reconciliation on every login
      try {
        const reconciled = await reconcileUserEntitlements(base44, existing, platformFromBody);
        
        if (reconciled.changed) {
          // Update user with reconciled entitlements
          await base44.asServiceRole.entities.User.update(existing.id, {
            entitlement_tier: reconciled.tier,
            subscription_tier: reconciled.level,
            subscription_status: reconciled.status,
            stripe_customer_id: reconciled.stripeCustomerId || existing.stripe_customer_id,
            platform: platformFromBody,
            last_login: new Date().toISOString()
          });
        } else {
          // Just update last login
          await base44.asServiceRole.entities.User.update(existing.id, {
            last_login: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('[ensureUserRecord] Reconciliation failed (non-fatal):', e);
      }
      
      // Re-fetch user to get updated entitlements
      const updatedUsers = await base44.asServiceRole.entities.User.filter({ email: emailLower });
      
      return Response.json({ 
        ok: true, 
        user: updatedUsers?.[0] || existing,
        user_id: userId, 
        reconciled: true 
      });
    }

    // User doesn't exist - create with service role
    const newUser = await base44.asServiceRole.entities.User.create({
      email: emailLower,
      full_name: authUser.full_name || authUser.name || null,
      platform: platformFromBody || 'web',
      role: authUser.role || 'user',
      entitlement_tier: 'free',
      subscription_tier: 'free',
      subscription_status: 'free',
      last_login: new Date().toISOString()
    });

    // Run entitlement reconciliation immediately after creation
    try {
      const reconciled = await reconcileUserEntitlements(base44, newUser, platformFromBody);
      
      if (reconciled.changed) {
        // Update user with reconciled entitlements
        await base44.asServiceRole.entities.User.update(newUser.id, {
          entitlement_tier: reconciled.tier,
          subscription_tier: reconciled.level,
          subscription_status: reconciled.status,
          stripe_customer_id: reconciled.stripeCustomerId || null
        });
        
        // Fetch updated user
        const updated = await base44.asServiceRole.entities.User.filter({ email: emailLower });
        return Response.json({ 
          ok: true, 
          user: updated?.[0] || newUser,
          user_id: userId, 
          created: true,
          reconciled: true
        });
      }
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