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
    // The built-in User entity may exist from auth, but we need to ensure entitlement fields
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    
    console.log('[ensureUserRecord] Found existing users:', existingUsers?.length || 0);
    
    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0];
      console.log('[ensureUserRecord] User exists, reconciling entitlements...');
      
      // Ensure entitlement fields exist in user.data
      const hasEntitlementFields = existing.data?.entitlement_tier || 
                                     existing.data?.subscription_tier || 
                                     existing.data?.subscription_status;
      
      if (!hasEntitlementFields) {
        console.log('[ensureUserRecord] Adding missing entitlement fields to existing user');
        await base44.asServiceRole.entities.User.update(existing.id, {
          data: {
            ...existing.data,
            entitlement_tier: 'free',
            subscription_tier: 'free',
            subscription_status: 'free',
            platform: platformFromBody,
            last_login: new Date().toISOString()
          }
        });
      }
      
      // Run entitlement reconciliation on every login
      try {
        const reconciled = await reconcileUserEntitlements(base44, existing, { req });
        
        if (reconciled.changed) {
          console.log('[ensureUserRecord] Entitlements changed, updating user');
          // Clean existing.data to prevent nested structures
          const cleanData = { ...(existing.data || {}) };
          delete cleanData.data; // Remove any nested data object
          
          // Update user with reconciled entitlements
          await base44.asServiceRole.entities.User.update(existing.id, {
            data: {
              ...cleanData,
              entitlement_tier: reconciled.finalTier,
              subscription_tier: reconciled.finalTier,
              subscription_level: reconciled.finalLevel,
              subscription_status: reconciled.finalStatus,
              stripe_customer_id: reconciled.stripeCustomerId || cleanData.stripe_customer_id,
              subscription_provider: reconciled.providerUsed === 'stripe' || reconciled.providerUsed === 'apple' ? reconciled.providerUsed : cleanData.subscription_provider,
              platform: platformFromBody,
              last_login: new Date().toISOString()
            }
          });
        } else {
          // Just update last login
          const cleanData = { ...(existing.data || {}) };
          delete cleanData.data;
          
          await base44.asServiceRole.entities.User.update(existing.id, {
            data: {
              ...cleanData,
              last_login: new Date().toISOString()
            }
          });
        }
      } catch (e) {
        console.warn('[ensureUserRecord] Reconciliation failed (non-fatal):', e.message);
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

    // User doesn't exist in User entity - create with service role
    console.log('[ensureUserRecord] Creating new User entity for:', emailLower);
    const newUser = await base44.asServiceRole.entities.User.create({
      email: emailLower,
      full_name: authUser.full_name || authUser.name || null,
      data: {
        entitlement_tier: 'free',
        subscription_tier: 'free',
        subscription_status: 'free',
        platform: platformFromBody || 'web',
        last_login: new Date().toISOString()
      },
      role: authUser.role || 'user'
    });

    // Run entitlement reconciliation immediately after creation
    try {
      const reconciled = await reconcileUserEntitlements(base44, newUser, { req });
      
      if (reconciled.changed) {
        console.log('[ensureUserRecord] Updating new user with reconciled entitlements');
        // Update user with reconciled entitlements
        await base44.asServiceRole.entities.User.update(newUser.id, {
          data: {
            ...newUser.data,
            entitlement_tier: reconciled.finalTier,
            subscription_tier: reconciled.finalTier,
            subscription_level: reconciled.finalLevel,
            subscription_status: reconciled.finalStatus,
            subscription_provider: reconciled.providerUsed === 'stripe' || reconciled.providerUsed === 'apple' ? reconciled.providerUsed : null,
            stripe_customer_id: reconciled.stripeCustomerId || null
          }
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
      console.warn('[ensureUserRecord] Reconciliation failed for new user (non-fatal):', e.message);
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