import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

// TODO: PRODUCTION VERIFICATION
// This is a TEMPORARY admin-assisted verification stopgap.
// 
// For production, implement server-side verification using:
// 1. Apple App Store Server API (StoreKit 2)
//    - POST /inApps/v1/transactions/{transactionId}
//    - Verify signedTransaction JWT using Apple's public keys
//    - Extract originalTransactionId, expiresDate, productId from verified payload
// 
// 2. App Store Server Notifications V2
//    - Register notification endpoint
//    - Receive SUBSCRIBED, DID_RENEW, EXPIRED, DID_FAIL_TO_RENEW events
//    - Automatically sync verified subscription status
// 
// Reference:
// - https://developer.apple.com/documentation/appstoreserverapi
// - https://developer.apple.com/documentation/appstoreservernotifications

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    // Admin-only for now (manual verification)
    if (authUser?.role !== 'admin') {
      return Response.json({ 
        ok: false,
        error: 'FORBIDDEN',
        message: 'Admin access required for manual verification'
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || '');
    const originalTransactionId = body.originalTransactionId || '';
    const expiresAt = body.expiresAt || null;
    const productId = body.productId || '';
    
    if (!email || !originalTransactionId) {
      return Response.json({
        ok: false,
        error: 'MISSING_PARAMS',
        message: 'email and originalTransactionId required'
      }, { status: 400 });
    }
    
    // Find user
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = users?.[0];
    
    if (!userRow) {
      return Response.json({
        ok: false,
        error: 'USER_NOT_FOUND',
        message: `No user found with email ${email}`
      }, { status: 404 });
    }
    
    // Determine tier
    let tier = 'premium';
    if (productId.toLowerCase().includes('pro')) {
      tier = 'pro';
    }
    
    // Check if subscription expires in future
    const isActive = !expiresAt || new Date(expiresAt) > new Date();
    const status = isActive ? 'active' : 'expired';
    
    // Find existing Apple subscription
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: 'apple',
      provider_subscription_id: originalTransactionId
    });
    
    const existingAppleSub = existingSubs?.[0];
    
    const nowIso = new Date().toISOString();
    
    const subData = {
      user_id: userRow.id,
      user_email: email,
      provider: 'apple',
      provider_subscription_id: originalTransactionId,
      status,
      tier,
      current_period_end: expiresAt,
      current_period_start: existingAppleSub?.current_period_start || nowIso,
      started_at: existingAppleSub?.started_at || nowIso,
      subscriptionStartedAt: existingAppleSub?.subscriptionStartedAt || existingAppleSub?.started_at || nowIso,
      billing_interval: 'month',
      amount: null,
      cancel_at_period_end: false
    };
    
    if (existingAppleSub) {
      await base44.asServiceRole.entities.Subscription.update(existingAppleSub.id, subData);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subData);
    }
    
    // Update user to paid if active
    await base44.asServiceRole.entities.User.update(userRow.id, {
      subscription_level: isActive ? 'paid' : 'free',
      subscription_status: status,
      subscription_tier: tier,
      platform: 'ios'
    });
    
    return Response.json({
      ok: true,
      verified: true,
      email,
      originalTransactionId,
      tier,
      status,
      isActive,
      message: 'Apple subscription manually verified by admin',
      todo: 'Implement automated verification via App Store Server API (StoreKit 2) for production'
    });
  } catch (error) {
    console.error('[verifyAppleEntitlement] error:', error);
    return Response.json({ 
      ok: false,
      error: 'VERIFICATION_FAILED',
      message: error?.message || 'Failed to verify Apple entitlement'
    }, { status: 500 });
  }
});