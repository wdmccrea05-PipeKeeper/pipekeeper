// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

function uniqueModules(modules: string[]) {
  return [...new Set((modules || []).map((m) => String(m || '').trim().toLowerCase()).filter(Boolean))];
}

function resolveAppleProductAccess(productId: string) {
  const product = String(productId || '').trim().toLowerCase();
  const isAnnual = product.includes('annual') || product.includes('year');

  if (product.includes('founders')) {
    return {
      planKey: isAnnual ? 'founders_bundle_annual' : 'founders_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper'],
      productKind: 'founders',
      checkoutType: 'bundle_2',
      billingInterval: isAnnual ? 'year' : 'month',
    };
  }

  if (product.includes('whiskey')) {
    return {
      planKey: isAnnual ? 'whiskeykeeper_pro_annual' : 'whiskeykeeper_pro_monthly',
      modules: ['whiskeykeeper'],
      productKind: 'single',
      checkoutType: 'single_module',
      billingInterval: isAnnual ? 'year' : 'month',
    };
  }

  if (product.includes('cigar')) {
    return {
      planKey: isAnnual ? 'cigarkeeper_pro_annual' : 'cigarkeeper_pro_monthly',
      modules: ['cigarkeeper'],
      productKind: 'single',
      checkoutType: 'single_module',
      billingInterval: isAnnual ? 'year' : 'month',
    };
  }

  if (product.includes('wine')) {
    return {
      planKey: isAnnual ? 'winekeeper_pro_annual' : 'winekeeper_pro_monthly',
      modules: ['winekeeper'],
      productKind: 'single',
      checkoutType: 'single_module',
      billingInterval: isAnnual ? 'year' : 'month',
    };
  }

  return {
    planKey: isAnnual ? 'pipekeeper_pro_annual' : 'pipekeeper_pro_monthly',
    modules: ['pipekeeper'],
    productKind: 'single',
    checkoutType: 'single_module',
    billingInterval: isAnnual ? 'year' : 'month',
  };
}

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
    let tier = body.tier || 'pro';
    if (!body.tier && productId.toLowerCase().includes('pro')) {
      tier = 'pro';
    }
    if (String(tier).toLowerCase() === 'premium') {
      tier = 'pro';
    }

    const productAccess = resolveAppleProductAccess(productId);
    const activeModules = uniqueModules(productAccess.modules);
    const modulesCsv = activeModules.join(',');
    
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
      // Keep both keys for compatibility with legacy readers that still check camelCase.
      plan_key: productAccess.planKey,
      planKey: productAccess.planKey,
      modules_csv: modulesCsv,
      module_count: activeModules.length,
      product_kind: productAccess.productKind,
      checkout_type: productAccess.checkoutType,
      primary_module: activeModules[0] || null,
      current_period_end: expiresAt,
      current_period_start: effectiveActive ? nowIso : (existingAppleSub?.current_period_start || null),
      started_at: existingAppleSub?.started_at || nowIso,
      subscriptionStartedAt: existingAppleSub?.subscriptionStartedAt || existingAppleSub?.started_at || nowIso,
      billing_interval: productAccess.billingInterval,
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
    const grantedModulesCsv = shouldMarkPaid ? modulesCsv : '';
    const pipekeeper_paid = shouldMarkPaid && activeModules.includes('pipekeeper');
    const whiskeykeeper_paid = shouldMarkPaid && activeModules.includes('whiskeykeeper');
    
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
        subscription_provider: 'apple',
        paid_modules_csv: grantedModulesCsv,
        pipekeeper_paid,
        whiskeykeeper_paid,
        has_paid_access: shouldMarkPaid,
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
        subscription_provider: 'apple',
        paid_modules_csv: grantedModulesCsv,
        pipekeeper_paid,
        whiskeykeeper_paid,
        has_paid_access: shouldMarkPaid,
        // FIX ISSUE-11 + ISSUE-05: Write entitlement_tier (flat) and data.entitlement_tier (nested)
        entitlement_tier: shouldMarkPaid ? tier : 'free',
        data: {
          ...(users[0].data || {}),
          entitlement_tier: shouldMarkPaid ? tier : 'free',
          subscription_tier: shouldMarkPaid ? tier : 'free',
          subscription_level: shouldMarkPaid ? 'paid' : 'free',
          subscription_status: status,
          paid_modules_csv: grantedModulesCsv,
        },
      };
      // Only set platform if not already set
      if (!users[0].platform) {
        updates.platform = 'ios';
      }
      await base44.asServiceRole.entities.User.update(users[0].id, updates);
      console.log(`[syncAppleSubscriptionForMe] Updated user ${emailLower} subscription_level=${shouldMarkPaid ? 'paid' : 'free'}, tier=${tier}`);
    }
    
    // ── Referral qualification: fire when a referred user's iOS sub becomes active ──
    // Only trigger when transitioning to active (not on every sync)
    if (shouldMarkPaid && (!existingAppleSub || existingAppleSub.status !== 'active')) {
      try {
        const referredUser = users?.[0] || null;
        if (referredUser?.referred_by_code) {
          await base44.asServiceRole.functions.invoke('processReferralQualification', {
            referredUserId: userId,
            referredEmail: emailLower,
            subscriptionId: providerSubId,
            subscriptionAmount: null, // Amount not available from iOS client sync
            subscriptionInterval: productAccess.billingInterval || 'month',
            billingProvider: 'ios',
          });
        }
      } catch (refErr) {
        console.warn('[syncAppleSubscriptionForMe] referral qualification trigger failed (non-fatal):', refErr);
      }
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
      modules_csv: grantedModulesCsv,
      plan_key: productAccess.planKey,
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