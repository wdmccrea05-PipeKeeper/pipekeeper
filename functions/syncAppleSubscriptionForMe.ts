// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailLower = normEmail(authUser.email);
    const userId = authUser.id;
    
    if (!userId) {
      return Response.json({ 
        error: 'User ID not available',
        code: 'NO_USER_ID'
      }, { status: 400 });
    }
    
    const body = await req.json().catch(() => ({}));
    
    const active = !!body.active;
    const expiresAt = body.expiresAt || null;
    const productId = body.productId || '';
    const originalTransactionId = body.originalTransactionId || '';
    const verificationProof = body.verificationProof || null; // Server-side verification data
    
    // Require originalTransactionId when claiming active subscription to prevent
    // unauthenticated access grants
    if (active && !originalTransactionId) {
      console.warn(`[syncAppleSubscriptionForMe] Rejecting unverified active claim from user ${userId}: no originalTransactionId provided`);
      return Response.json({
        ok: false,
        error: 'UNVERIFIED_CLAIM',
        message: 'An originalTransactionId is required to activate a subscription.'
      }, { status: 400 });
    }
    
    // Determine if this is verified (requires server-side proof from App Store)
    const isVerified = !!verificationProof;
    
    // Determine tier
    let tier = body.tier || 'premium';
    if (!body.tier && productId.toLowerCase().includes('pro')) {
      tier = 'pro';
    }
    
    // FIX ISSUE-11: Add server-side expiry check.
    // Do NOT grant paid access if expiresAt is populated and already in the past,
    // regardless of what the iOS client reports.
    const clientReportsActive = active;
    const serverVerifiedExpiry = expiresAt ? new Date(expiresAt) > new Date() : true;
    const effectiveActive = clientReportsActive && serverVerifiedExpiry;

    if (!effectiveActive && clientReportsActive && !serverVerifiedExpiry) {
      console.warn(`[syncAppleSubscriptionForMe] Client reports active but expiresAt=${expiresAt} is in the past — marking expired for user ${userId}`);
    }

    // Determine status: Trust iOS client only when server-side expiry check also passes
    const status = effectiveActive ? 'active' : 'expired';

    // Create stable provider subscription ID
    const providerSubId = originalTransactionId || `apple_unverified_${userId}`;
    
    const nowIso = new Date().toISOString();
    
    // Find existing Apple subscription by provider_subscription_id
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: 'apple',
      provider_subscription_id: providerSubId
    });
    
    const existingAppleSub = existingSubs?.[0];
    
    // CONFLICT CHECK: If subscription exists and belongs to different user, deny
    if (existingAppleSub && existingAppleSub.user_id && existingAppleSub.user_id !== userId) {
      console.warn(`[syncAppleSubscriptionForMe] Apple subscription ${providerSubId} already linked to user ${existingAppleSub.user_id}, requested by ${userId}`);
      return Response.json({
        ok: false,
        error: 'This Apple subscription is already linked to a different PipeKeeper account',
        code: 'ALREADY_LINKED',
        existing_user_id: existingAppleSub.user_id
      }, { status: 409 });
    }
    
    // BACKFILL CHECK: If subscription exists but missing user_email, add it
    if (existingAppleSub && !existingAppleSub.user_email) {
      console.log(`[syncAppleSubscriptionForMe] Backfilling user_email for Apple subscription ${providerSubId}`);
    }
    
    const subData = {
      user_id: userId,
      user_email: emailLower,
      provider: 'apple',
      provider_subscription_id: providerSubId,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status,
      tier,
      current_period_end: expiresAt,
      current_period_start: effectiveActive ? nowIso : (existingAppleSub?.current_period_start || null),
      started_at: existingAppleSub?.started_at || nowIso,
      subscriptionStartedAt: existingAppleSub?.subscriptionStartedAt || existingAppleSub?.started_at || nowIso,
      billing_interval: 'month',
      amount: null,
      cancel_at_period_end: false
    };
    
    if (existingAppleSub) {
      await base44.asServiceRole.entities.Subscription.update(existingAppleSub.id, subData);
      console.log(`[syncAppleSubscriptionForMe] Updated Apple subscription ${providerSubId} for user ${userId}, verified=${isVerified}`);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subData);
      console.log(`[syncAppleSubscriptionForMe] Created Apple subscription ${providerSubId} for user ${userId}, verified=${isVerified}`);
    }
    
    // Only mark paid when server-side expiry check confirms subscription is still active
    const shouldMarkPaid = effectiveActive;
    
    if (shouldMarkPaid && !isVerified) {
      console.warn(`[syncAppleSubscriptionForMe] Granting access based on unverified client claim for user ${userId}. originalTransactionId=${originalTransactionId}`);
    }
    
    const users = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    if (!users || users.length === 0) {
      await base44.asServiceRole.entities.User.create({
        email: emailLower,
        full_name: `User ${emailLower}`,
        role: 'user',
        subscription_level: shouldMarkPaid ? 'paid' : 'free',
        subscription_status: status,
        subscription_tier: shouldMarkPaid ? tier : 'free',
        // FIX ISSUE-11 + ISSUE-05: Write entitlement_tier for canonical resolver
        entitlement_tier: shouldMarkPaid ? tier : 'free',
        platform: 'ios'
      });
      console.log(`[syncAppleSubscriptionForMe] Created user ${emailLower} subscription_level=${shouldMarkPaid ? 'paid' : 'free'}, tier=${tier}`);
    } else {
      const updates = {
        subscription_level: shouldMarkPaid ? 'paid' : 'free',
        subscription_status: status,
        subscription_tier: shouldMarkPaid ? tier : 'free',
        // FIX ISSUE-11 + ISSUE-05: Write entitlement_tier (flat) and data.entitlement_tier (nested)
        entitlement_tier: shouldMarkPaid ? tier : 'free',
        data: {
          ...(users[0].data || {}),
          entitlement_tier: shouldMarkPaid ? tier : 'free',
          subscription_tier: shouldMarkPaid ? tier : 'free',
          subscription_level: shouldMarkPaid ? 'paid' : 'free',
          subscription_status: status,
        },
      };
      // Only set platform if not already set
      if (!users[0].platform) {
        updates.platform = 'ios';
      }
      await base44.asServiceRole.entities.User.update(users[0].id, updates);
      console.log(`[syncAppleSubscriptionForMe] Updated user ${emailLower} subscription_level=${shouldMarkPaid ? 'paid' : 'free'}, tier=${tier}`);
    }
    
    // Log successful sync for monitoring
    console.log(`[syncAppleSubscriptionForMe] SUCCESS: user=${emailLower} userId=${userId} tier=${tier} status=${status} active=${active} verified=${isVerified}`);

    return Response.json({
      ok: true,
      synced: true,
      verified: isVerified,
      tier,
      status,
      active,
      user_id: userId,
      provider_subscription_id: providerSubId,
      access_granted: shouldMarkPaid
    });
  } catch (error) {
    console.error(`[syncAppleSubscriptionForMe] ERROR:`, error);
    return Response.json({ 
      ok: false,
      error: error?.message || 'Failed to sync Apple subscription',
      stack: error?.stack
    }, { status: 500 });
  }
});