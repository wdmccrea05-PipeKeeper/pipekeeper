// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  verifyAppleJws,
  isTransactionActive,
  appleDateToIso,
  type VerifiedAppleTransaction,
} from '../../shared/appleJwsVerifier.ts';

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

function uniqueModules(modules: string[]) {
  return [...new Set((modules || []).map((m) => String(m || '').trim().toLowerCase()).filter(Boolean))];
}

function resolveAppleProductAccess(productId: string) {
  const product = String(productId || '').trim().toLowerCase();
  const isAnnual = product.includes('annual') || product.includes('year');

  // ── Bundles (check FIRST — bundle IDs may contain single-module keywords) ──
  if (product.includes('all_module') || product.includes('allmodule') ||
      product.includes('four_module') || product.includes('fourmodule') ||
      product.includes('4_module') || product.includes('4module') ||
      (product.includes('bundle') && product.includes('wine'))) {
    return {
      planKey: isAnnual ? 'four_module_bundle_annual' : 'four_module_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      productKind: 'bundle_4',
      checkoutType: 'bundle_4',
      billingInterval: isAnnual ? 'year' : 'month',
    };
  }

  if (product.includes('three_module') || product.includes('threemodule') ||
      product.includes('3_module') || product.includes('3module') ||
      (product.includes('bundle') && !product.includes('wine') && !product.includes('founders'))) {
    return {
      planKey: isAnnual ? 'three_module_bundle_annual' : 'three_module_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      productKind: 'bundle_3',
      checkoutType: 'bundle_3',
      billingInterval: isAnnual ? 'year' : 'month',
    };
  }

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
    return { planKey: isAnnual ? 'whiskeykeeper_pro_annual' : 'whiskeykeeper_pro_monthly', modules: ['whiskeykeeper'], productKind: 'single', checkoutType: 'single_module', billingInterval: isAnnual ? 'year' : 'month' };
  }
  if (product.includes('cigar')) {
    return { planKey: isAnnual ? 'cigarkeeper_pro_annual' : 'cigarkeeper_pro_monthly', modules: ['cigarkeeper'], productKind: 'single', checkoutType: 'single_module', billingInterval: isAnnual ? 'year' : 'month' };
  }
  if (product.includes('wine')) {
    return { planKey: isAnnual ? 'winekeeper_pro_annual' : 'winekeeper_pro_monthly', modules: ['winekeeper'], productKind: 'single', checkoutType: 'single_module', billingInterval: isAnnual ? 'year' : 'month' };
  }

  return { planKey: isAnnual ? 'pipekeeper_pro_annual' : 'pipekeeper_pro_monthly', modules: ['pipekeeper'], productKind: 'single', checkoutType: 'single_module', billingInterval: isAnnual ? 'year' : 'month' };
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
      return Response.json({ error: 'User ID not available', code: 'NO_USER_ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const clientActive = !!body.active;
    const clientExpiresAt = body.expiresAt || null;
    const clientProductId = body.productId || '';
    const pendingProductId = body.pendingProductId || '';
    const pendingUpgradeEffectiveDate = body.pendingUpgradeEffectiveDate || null;
    const clientOriginalTransactionId = body.originalTransactionId || '';
    const verificationProof = body.verificationProof || null;

    // ── AUTHORITATIVE SERVER-SIDE VERIFICATION ──────────────────────────────
    // The client may tell us "I have transaction X." We must independently
    // determine what transaction X means before granting durable entitlement.
    //
    // verificationProof is the JWS token from StoreKit 2's
    // Transaction.jsonRepresentation. We verify it server-side using Apple's
    // certificate chain. Only a VERIFIED transaction can grant durable paid
    // access. Unverified client assertions are stored as
    // pending_verification and do NOT grant paid access.

    let verifiedTx: VerifiedAppleTransaction | null = null;
    let verificationStatus: 'verified' | 'pending_verification' | 'unverified' = 'unverified';
    let verificationError: string | null = null;

    if (verificationProof) {
      try {
        verifiedTx = await verifyAppleJws(verificationProof);
        if (verifiedTx) {
          verificationStatus = 'verified';
        } else {
          verificationStatus = 'pending_verification';
          verificationError = 'JWS signature verification failed';
          console.warn(`[syncAppleSubscriptionForMe] JWS verification FAILED for user ${userId}`);
        }
      } catch (verifyErr) {
        verificationStatus = 'pending_verification';
        verificationError = verifyErr?.message || 'Verification error';
        console.warn(`[syncAppleSubscriptionForMe] JWS verification error for user ${userId}:`, verifyErr);
      }
    } else {
      verificationStatus = 'pending_verification';
      verificationError = 'No verificationProof provided';
      console.warn(`[syncAppleSubscriptionForMe] No verificationProof from user ${userId} — storing as pending_verification`);
    }

    // ── DETERMINE AUTHORITATIVE ACTIVE STATE ────────────────────────────────
    // CRITICAL PRECEDENCE RULE:
    //   A verified server-side negative state must NEVER be overwritten by an
    //   unverified positive client assertion.
    //
    // If we have a verified transaction:
    //   - Use the VERIFIED expiration, revocation, and product ID
    //   - Ignore client-supplied active/expiresAt/productId
    //
    // If we do NOT have a verified transaction (pending_verification):
    //   - Do NOT grant durable paid access
    //   - Store the subscription record as pending_verification
    //   - Preserve existing access for migration safety (see below)

    let authoritativeActive = false;
    let authoritativeProductId = clientProductId;
    let authoritativeExpiresAt: string | null = clientExpiresAt;
    let authoritativeOriginalTransactionId = clientOriginalTransactionId;

    if (verifiedTx) {
      // Use VERIFIED transaction data — ignore client assertions
      authoritativeActive = isTransactionActive(verifiedTx);
      authoritativeProductId = verifiedTx.productId;
      authoritativeExpiresAt = appleDateToIso(verifiedTx.expiresDate);
      authoritativeOriginalTransactionId = verifiedTx.originalTransactionId || verifiedTx.transactionId;

      // Log if client state contradicts verified state
      if (clientActive && !authoritativeActive) {
        console.warn(`[syncAppleSubscriptionForMe] Client reports active=true but VERIFIED state is inactive for user ${userId}. Verified state takes precedence.`);
      }
      if (clientProductId && clientProductId !== authoritativeProductId) {
        console.warn(`[syncAppleSubscriptionForMe] Client productId=${clientProductId} differs from VERIFIED productId=${authoritativeProductId} for user ${userId}. Verified state takes precedence.`);
      }
    } else {
      // No verified transaction — do NOT grant durable paid access
      authoritativeActive = false;
    }

    // Determine tier
    let tier = body.tier || 'pro';
    if (String(tier).toLowerCase() === 'premium') tier = 'pro';

    // ── Deferred upgrade handling ──────────────────────────────────────────
    const now = new Date();
    const pendingEffective = pendingUpgradeEffectiveDate ? new Date(pendingUpgradeEffectiveDate) : null;
    const upgradeHasTakenEffect = pendingProductId && pendingEffective && pendingEffective <= now;
    const effectiveProductId = upgradeHasTakenEffect ? pendingProductId : authoritativeProductId;

    const productAccess = resolveAppleProductAccess(effectiveProductId);
    const activeModules = uniqueModules(productAccess.modules);
    const modulesCsv = activeModules.join(',');

    // Status: only 'active' if VERIFIED and not expired
    const status = authoritativeActive ? 'active' : 'expired';

    // Create stable provider subscription ID
    const providerSubId = authoritativeOriginalTransactionId || `apple_unverified_${userId}`;

    const nowIso = new Date().toISOString();

    // Find existing Apple subscription
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: 'apple',
      provider_subscription_id: providerSubId,
    });

    const existingAppleSub = existingSubs?.[0];

    // CONFLICT CHECK
    if (existingAppleSub && existingAppleSub.user_id && existingAppleSub.user_id !== userId) {
      console.warn(`[syncAppleSubscriptionForMe] Apple subscription ${providerSubId} already linked to user ${existingAppleSub.user_id}, requested by ${userId}`);
      return Response.json({
        ok: false,
        error: 'This Apple subscription is already linked to a different account',
        code: 'ALREADY_LINKED',
      }, { status: 409 });
    }

    // ── MIGRATION SAFETY ────────────────────────────────────────────────────
    // Do NOT revoke legitimate existing Apple subscribers during the transition
    // to authoritative verification.
    //
    // If this is the first time we see a client without verificationProof, but
    // they already have an ACTIVE Apple subscription record, preserve their
    // access temporarily while we attempt verification.
    //
    // The subscription is marked with verification_status='pending_verification'
    // so it can be distinguished from verified subscriptions. A scheduled
    // retry should attempt re-verification. If verification consistently fails,
    // admin review is required before revoking.
    //
    // A temporary Apple/API/network failure must NOT immediately remove a
    // legitimate user's access.

    let migrationGraceActive = false;
    if (!verifiedTx && existingAppleSub && existingAppleSub.status === 'active') {
      // Existing active subscriber — preserve access during migration
      migrationGraceActive = true;
      console.warn(`[syncAppleSubscriptionForMe] MIGRATION GRACE: Preserving existing active Apple subscription ${providerSubId} for user ${userId} while verification is pending. verification_status=${verificationStatus}`);
    }

    const subData: Record<string, any> = {
      user_id: userId,
      user_email: emailLower,
      provider: 'apple',
      provider_subscription_id: providerSubId,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      status,
      tier,
      product_id: authoritativeProductId || null,
      pending_upgrade_product_id: pendingProductId || null,
      pending_upgrade_effective_date: pendingUpgradeEffectiveDate || null,
      plan_key: productAccess.planKey,
      planKey: productAccess.planKey,
      modules_csv: modulesCsv,
      module_count: activeModules.length,
      product_kind: productAccess.productKind,
      checkout_type: productAccess.checkoutType,
      primary_module: activeModules[0] || null,
      current_period_end: authoritativeExpiresAt,
      current_period_start: authoritativeActive ? nowIso : (existingAppleSub?.current_period_start || null),
      started_at: existingAppleSub?.started_at || nowIso,
      subscriptionStartedAt: existingAppleSub?.subscriptionStartedAt || existingAppleSub?.started_at || nowIso,
      billing_interval: productAccess.billingInterval,
      amount: null,
      cancel_at_period_end: false,
    };

    if (existingAppleSub) {
      await base44.asServiceRole.entities.Subscription.update(existingAppleSub.id, subData);
      console.log(`[syncAppleSubscriptionForMe] Updated Apple subscription ${providerSubId} for user ${userId}, verified=${verificationStatus === 'verified'}, migrationGrace=${migrationGraceActive}`);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subData);
      console.log(`[syncAppleSubscriptionForMe] Created Apple subscription ${providerSubId} for user ${userId}, verified=${verificationStatus === 'verified'}`);
    }

    // ── DETERMINE PAID ACCESS ───────────────────────────────────────────────
    // Only grant durable paid access when:
    //   1. Transaction is VERIFIED and active, OR
    //   2. Migration grace period is active (existing subscriber, verification pending)
    //
    // An unverified client assertion alone CANNOT grant durable paid access.
    const shouldMarkPaid = authoritativeActive || migrationGraceActive;

    if (shouldMarkPaid && !verifiedTx && migrationGraceActive) {
      console.warn(`[syncAppleSubscriptionForMe] Granting access via MIGRATION GRACE for user ${userId}. This is temporary — verification must succeed on subsequent syncs or admin review is required.`);
    }

    // ── Merge earned-access modules ──────────────────────────────────────────
    const nowTs = new Date();
    let earnedRecords: any[] = [];
    let earnedModules: string[] = [];
    try {
      earnedRecords = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
        user_id: userId,
        status: 'active',
      }) || [];
      const stillActive = earnedRecords.filter(
        (r: any) => r.end_at && new Date(r.end_at) > nowTs && r.module
      );
      earnedModules = [...new Set(stillActive.map((r: any) => String(r.module).toLowerCase()))];
    } catch (earnedErr) {
      console.warn('[syncAppleSubscriptionForMe] Could not fetch earned-access records (non-fatal):', earnedErr);
    }

    const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
    const iosModules: string[] = shouldMarkPaid ? activeModules : [];
    const allActiveModules: string[] = [...new Set([...iosModules, ...earnedModules])];

    const grantedModulesCsv = allActiveModules.join(',') || '';
    const hasAnyAccess = allActiveModules.length > 0 || shouldMarkPaid;

    const modulePaidFlags: Record<string, boolean> = {};
    for (const mod of ALL_MODULES) {
      modulePaidFlags[`${mod}_paid`] = allActiveModules.includes(mod);
    }

    // Earned-access canonical fields
    let referralEarnedAccess = false;
    let referralEarnedModule: string | null = null;
    let referralEarnedExpiresAt: string | null = null;
    {
      const stillActive = earnedRecords.filter(
        (r: any) => r.end_at && new Date(r.end_at) > nowTs
      );
      if (stillActive.length > 0) {
        referralEarnedAccess = true;
        const sorted = [...stillActive].sort(
          (a: any, b: any) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime()
        );
        referralEarnedModule = sorted[0].module || null;
        referralEarnedExpiresAt = sorted[0].end_at || null;
      }
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
        ...modulePaidFlags,
        has_paid_access: hasAnyAccess,
        entitlement_tier: hasAnyAccess ? tier : 'free',
        referral_earned_access: referralEarnedAccess,
        referral_earned_module: referralEarnedModule,
        referral_earned_expires_at: referralEarnedExpiresAt,
        platform: 'ios',
      });
    } else {
      const updates: Record<string, any> = {
        subscription_level: shouldMarkPaid ? 'paid' : 'free',
        subscription_status: status,
        subscription_tier: shouldMarkPaid ? tier : 'free',
        subscription_provider: 'apple',
        paid_modules_csv: grantedModulesCsv,
        ...modulePaidFlags,
        has_paid_access: hasAnyAccess,
        entitlement_tier: hasAnyAccess ? tier : 'free',
        referral_earned_access: referralEarnedAccess,
        referral_earned_module: referralEarnedModule,
        referral_earned_expires_at: referralEarnedExpiresAt,
        data: {
          ...(users[0].data || {}),
          entitlement_tier: hasAnyAccess ? tier : 'free',
          subscription_tier: shouldMarkPaid ? tier : 'free',
          subscription_level: shouldMarkPaid ? 'paid' : 'free',
          subscription_status: status,
          paid_modules_csv: grantedModulesCsv,
          apple_verification_status: verificationStatus,
        },
      };
      if (!users[0].platform) updates.platform = 'ios';
      await base44.asServiceRole.entities.User.update(users[0].id, updates);
    }

    // ── Upsert UserEntitlement ────────────────────────────────────────────────
    try {
      const existingEnt = await base44.asServiceRole.entities.UserEntitlement.filter({ user_id: userId });
      const entData = {
        user_id: userId,
        user_email: emailLower,
        has_access: hasAnyAccess,
        modules: allActiveModules,
        pipekeeper: allActiveModules.includes('pipekeeper'),
        whiskeykeeper: allActiveModules.includes('whiskeykeeper'),
        cigarkeeper: allActiveModules.includes('cigarkeeper'),
        winekeeper: allActiveModules.includes('winekeeper'),
        primary_product: allActiveModules[0] || null,
        primary_provider: shouldMarkPaid ? 'apple' : (referralEarnedAccess ? 'referral' : null),
        computed_at: nowTs.toISOString(),
      };
      if (existingEnt?.length > 0) {
        await base44.asServiceRole.entities.UserEntitlement.update(existingEnt[0].id, entData);
      } else {
        await base44.asServiceRole.entities.UserEntitlement.create(entData);
      }
    } catch (entErr) {
      console.warn('[syncAppleSubscriptionForMe] Could not upsert UserEntitlement (non-fatal):', entErr);
    }

    // ── Referral qualification ──────────────────────────────────────────────────
    if (shouldMarkPaid && (!existingAppleSub || existingAppleSub.status !== 'active')) {
      try {
        const referredUser = users?.[0] || null;
        if (referredUser?.referred_by_code) {
          await base44.asServiceRole.functions.invoke('processReferralQualification', {
            referredUserId: userId,
            referredEmail: emailLower,
            subscriptionId: providerSubId,
            subscriptionAmount: null,
            subscriptionInterval: productAccess.billingInterval || 'month',
            billingProvider: 'ios',
          });
        }
      } catch (refErr) {
        console.warn('[syncAppleSubscriptionForMe] referral qualification trigger failed (non-fatal):', refErr);
      }
    }

    console.log(`[syncAppleSubscriptionForMe] SUCCESS: user=${emailLower} userId=${userId} tier=${tier} status=${status} verified=${verificationStatus === 'verified'} migrationGrace=${migrationGraceActive} productId=${authoritativeProductId} modules=${grantedModulesCsv}`);

    return Response.json({
      ok: true,
      synced: true,
      verified: verificationStatus === 'verified',
      verification_status: verificationStatus,
      verification_error: verificationError,
      migration_grace: migrationGraceActive,
      tier,
      status,
      active: authoritativeActive,
      modules_csv: grantedModulesCsv,
      ios_modules_csv: modulesCsv,
      earned_modules: earnedModules,
      plan_key: productAccess.planKey,
      user_id: userId,
      provider_subscription_id: providerSubId,
      access_granted: hasAnyAccess,
    });
  } catch (error) {
    console.error(`[syncAppleSubscriptionForMe] ERROR:`, error);
    return Response.json({
      ok: false,
      error: error?.message || 'Failed to sync Apple subscription',
    }, { status: 500 });
  }
});