/**
 * Canonical Contract → Entitlement Reconciler (JS frontend/test copy)
 *
 * Mirrors base44/shared/reconcileEntitlementForUser.ts.
 * Tests import from here; backend functions import from the TS shared module.
 * Keep in sync — the TS version is the canonical source.
 */

import { resolveProductScope, buildPriceIdMap } from './productScopeResolver.js';

export const RECONCILER_VERSION = 'canonical_v1';

export function reconcileEntitlementForUser(input) {
  const { user_id, user_email, contracts, subscriptions, events = [], nonPaidGrants = [], priceIdMap, stripeVerification = {}, previousEntitlement } = input;
  const email = String(user_email || '').trim().toLowerCase();

  const anomalies = [];
  const contractsDetail = [];
  const includedContractIds = [];
  const includedSubscriptionIds = [];
  const includedModules = new Set();
  let totalMrrCents = 0;
  let earliestStart = null;
  let latestEnd = null;
  let nextRenewal = null;
  let primaryProvider = 'unknown';
  let primaryBillingInterval = 'unknown';
  let primaryProduct = 'unknown';
  let hasVerifiedActive = false;
  let hasProvisional = false;
  let hasVerificationUnavailable = false;
  let hasUnresolvedScope = false;

  const isActiveStatus = (s) => {
    const v = String(s || '').toLowerCase();
    return v === 'active' || v === 'trialing' || v === 'past_due' || v === 'trial';
  };
  const isExpired = (d) => {
    if (!d) return false;
    try { return new Date(d) <= new Date(); } catch { return false; }
  };
  const isContractCurrentlyActive = (c) => isActiveStatus(c.status) && !isExpired(c.period_end);

  for (const c of contracts) {
    const provider = String(c.provider || 'unknown').toLowerCase();
    const subId = c.provider_subscription_id || '';

    const matchingSub = subscriptions.find(
      (s) =>
        (s.provider_subscription_id && s.provider_subscription_id === subId) ||
        (String(s.user_email || '').trim().toLowerCase() === email)
    );

    const scope = resolveProductScope({
      price_id: matchingSub?.product_id || null,
      plan_key: matchingSub?.plan_key || null,
      modules_csv: matchingSub?.modules_csv || null,
      modules: Array.isArray(c.modules) ? c.modules : null,
      primary_module: matchingSub?.primary_module || null,
      product_kind: matchingSub?.product_kind || null,
      checkout_type: matchingSub?.checkout_type || null,
      amount_cents: c.amount_cents ?? null,
      amount: matchingSub?.amount ?? null,
      billing_interval: c.billing_interval || matchingSub?.billing_interval || null,
      product: c.product || null,
      bundle_name: c.bundle_name || null,
    }, priceIdMap);

    let verification;
    let stripeState;

    if (provider === 'stripe') {
      if (subId && stripeVerification[subId]) {
        stripeState = stripeVerification[subId];
        if (!stripeState.verification_available) {
          verification = 'verification_unavailable';
          hasVerificationUnavailable = true;
        } else if (stripeState.exists && isActiveStatus(stripeState.status || '')) {
          verification = 'verified_active';
          hasVerifiedActive = true;
        } else {
          verification = 'verified_inactive';
        }
      } else {
        verification = 'verification_unavailable';
        hasVerificationUnavailable = true;
      }
    } else if (provider === 'apple') {
      verification = 'provisional';
      hasProvisional = true;
    } else if (provider === 'manual') {
      verification = 'verified_active';
      hasVerifiedActive = true;
    } else {
      verification = 'provisional';
      hasProvisional = true;
    }

    const currentlyActive = isContractCurrentlyActive(c);
    let included = false;
    let exclusionReason;

    if (scope.confidence === 'unresolved') {
      hasUnresolvedScope = true;
      anomalies.push(`unresolved_product_scope: contract ${c.id}`);
    }

    if (verification === 'verified_active' && currentlyActive) {
      included = true;
    } else if (verification === 'provisional' && currentlyActive) {
      included = true;
    } else if (verification === 'verification_unavailable') {
      if (previousEntitlement?.has_access === true) {
        included = true;
        anomalies.push(`verification_unavailable_preserved: contract ${c.id} — access preserved during transient provider failure`);
      } else {
        included = false;
        exclusionReason = 'verification_unavailable_no_prior_access';
      }
    } else if (verification === 'verified_inactive') {
      included = false;
      exclusionReason = `verified_inactive_at_provider (stripe status: ${stripeState?.status || 'unknown'})`;
      anomalies.push(`stale_local_contract: contract ${c.id} is active locally but ${exclusionReason}`);
    } else if (verification === 'verified_active' && !currentlyActive) {
      included = false;
      exclusionReason = `provider_active_but_local_contract_expired (period_end: ${c.period_end || 'null'})`;
      anomalies.push(`stale_local_contract: contract ${c.id} — provider active but local contract expired, needs repair`);
    } else {
      included = false;
      exclusionReason = `contract_not_currently_active (status: ${c.status})`;
    }

    contractsDetail.push({
      contract_id: c.id, provider, provider_subscription_id: subId || undefined,
      status: c.status, is_currently_active: currentlyActive, scope, verification,
      stripe_verified_state: stripeState, period_start: c.period_start, period_end: c.period_end,
      included, exclusion_reason: exclusionReason,
    });

    if (included) {
      includedContractIds.push(c.id);
      if (matchingSub?.id) includedSubscriptionIds.push(matchingSub.id);
      for (const m of scope.modules) includedModules.add(String(m).toLowerCase());

      const amountCents = c.amount_cents ?? 0;
      const interval = String(c.billing_interval || '').toLowerCase();
      if (interval === 'annual' && amountCents > 0) totalMrrCents += Math.round(amountCents / 12);
      else if (interval === 'monthly' && amountCents > 0) totalMrrCents += amountCents;

      if (c.period_start && (!earliestStart || new Date(c.period_start) < new Date(earliestStart))) earliestStart = c.period_start;
      if (c.period_end) {
        if (!latestEnd || new Date(c.period_end) > new Date(latestEnd)) latestEnd = c.period_end;
        if (!nextRenewal || new Date(c.period_end) < new Date(nextRenewal)) nextRenewal = c.period_end;
      }
      if (primaryProvider === 'unknown' || (amountCents || 0) > 0) {
        primaryProvider = provider;
        primaryBillingInterval = interval === 'annual' ? 'annual' : interval === 'monthly' ? 'monthly' : 'unknown';
        primaryProduct = scope.product;
      }
    }
  }

  const activeNonPaidGrants = [];
  for (const grant of nonPaidGrants) {
    const isExp = (d) => { if (!d) return false; try { return new Date(d) <= new Date(); } catch { return false; } };
    if (grant.status === 'active' && !isExp(grant.end_at)) {
      activeNonPaidGrants.push(grant);
      if (grant.module) includedModules.add(String(grant.module).toLowerCase());
    }
  }

  let sourceType = 'none';
  if (includedContractIds.length > 0) {
    if (hasVerifiedActive) sourceType = 'paid_contract';
    else if (hasProvisional && !hasVerifiedActive) sourceType = 'provisional_apple';
    else if (hasVerificationUnavailable && !hasVerifiedActive) sourceType = previousEntitlement?.source_type || 'paid_contract';
  } else if (activeNonPaidGrants.length > 0) {
    const grant = activeNonPaidGrants[0];
    const src = String(grant.source || grant.access_source || '').toLowerCase();
    if (src === 'referral' || grant.reward_type) sourceType = 'referral';
    else if (src === 'grandfathered' || src === 'legacy') sourceType = 'grandfathered';
    else if (src === 'promotional' || src === 'promotion') sourceType = 'promotional';
    else if (src === 'manual' || src === 'admin') sourceType = 'manual_admin';
    else if (src === 'trial') sourceType = 'trial';
    else sourceType = 'manual_admin';
  } else if (hasUnresolvedScope && includedContractIds.length === 0) {
    sourceType = 'unresolved';
  }

  let verificationStatus = 'manual_review';
  if (hasVerifiedActive) verificationStatus = 'verified_active';
  else if (hasProvisional) verificationStatus = 'provisional';
  else if (hasVerificationUnavailable) verificationStatus = 'verification_unavailable';
  else if (includedContractIds.length === 0 && activeNonPaidGrants.length === 0) verificationStatus = 'verified_inactive';

  const hasAccess = includedContractIds.length > 0 || activeNonPaidGrants.length > 0;
  const tier = hasAccess ? 'pro' : 'free';
  const modules = [...includedModules].sort();
  const pipekeeper = modules.includes('pipekeeper');
  const whiskeykeeper = modules.includes('whiskeykeeper');
  const cigarkeeper = modules.includes('cigarkeeper');
  const winekeeper = modules.includes('winekeeper');

  if (modules.length > 1) primaryProduct = 'bundle';
  else if (modules.length === 1) primaryProduct = modules[0];

  let grantedAt = earliestStart;
  for (const s of subscriptions) {
    const start = s.started_at || s.subscriptionStartedAt || s.current_period_start;
    if (start && (!grantedAt || new Date(start) < new Date(grantedAt))) grantedAt = start;
  }

  return {
    user_id, user_email: email, has_access: hasAccess, tier, modules,
    pipekeeper, whiskeykeeper, cigarkeeper, winekeeper,
    active_contract_ids: includedContractIds, backing_subscription_ids: includedSubscriptionIds,
    mrr_cents: totalMrrCents, contract_count: includedContractIds.length,
    primary_product: primaryProduct, primary_provider: primaryProvider,
    primary_billing_interval: primaryBillingInterval, next_renewal_at: nextRenewal,
    source_type: sourceType, verification_status: verificationStatus,
    granted_at: grantedAt, effective_start: earliestStart, effective_end: latestEnd,
    non_paid_grants: activeNonPaidGrants, contracts_detail: contractsDetail,
    anomalies, reconciler_version: RECONCILER_VERSION,
  };
}

export { buildPriceIdMap };