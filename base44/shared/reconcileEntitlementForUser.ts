/**
 * Canonical Contract → Entitlement Reconciler
 *
 * The single authoritative service that determines a user's entitlement state
 * from authoritative sources. Used by all subscription lifecycle paths.
 *
 * INVARIANT: Every authoritative active paid contract grants exactly the
 * entitlement its product scope requires, and every paid entitlement can
 * identify the contract or other legitimate grant that justifies it.
 *
 * This is a PURE FUNCTION — no DB calls, no side effects. The backend wrapper
 * (reconcileEntitlementForUser function) fetches data and upserts the result.
 * This makes the reconciler fully testable and idempotent.
 *
 * Idempotency: Running this repeatedly with the same inputs produces the same
 * correct state. It never creates duplicate records — the wrapper upserts.
 *
 * Provider verification:
 * - Stripe: uses pre-fetched stripeVerification results (live API state)
 * - Apple: kept PROVISIONAL until App Store Server API is configured
 * - Never converts temporary provider failure into Free — preserves last
 *   known valid entitlement during transient verification failures
 */

import {
  resolveProductScope,
  buildPriceIdMap,
  type ProductScopeResult,
} from './productScopeResolver.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export type EntitlementSourceType =
  | 'paid_contract'
  | 'grandfathered'
  | 'promotional'
  | 'referral'
  | 'manual_admin'
  | 'trial'
  | 'provisional_apple'
  | 'unresolved'
  | 'none';

export type VerificationStatus =
  | 'verified_active'
  | 'verified_inactive'
  | 'provisional'
  | 'verification_unavailable'
  | 'manual_review';

export interface ActiveContractLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider: string;
  provider_subscription_id?: string;
  status: string;
  is_active?: boolean;
  product?: string;
  modules?: string[];
  bundle_name?: string;
  amount_cents?: number;
  billing_interval?: string;
  period_start?: string;
  period_end?: string;
  quality?: string;
  issues?: string[];
  pending_upgrade_product_id?: string;
  normalized_at?: string;
}

export interface SubscriptionLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider?: string;
  provider_subscription_id?: string;
  status?: string;
  product_id?: string;
  plan_key?: string;
  modules_csv?: string;
  primary_module?: string;
  product_kind?: string;
  checkout_type?: string;
  amount?: number;
  billing_interval?: string;
  current_period_start?: string;
  current_period_end?: string;
  started_at?: string;
  subscriptionStartedAt?: string;
}

export interface SubscriptionEventLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider?: string;
  provider_subscription_id?: string;
  normalized_event_type?: string;
  is_successful_payment?: boolean;
  transaction_at?: string;
  period_start?: string;
  period_end?: string;
}

export interface NonPaidGrantLike {
  id: string;
  user_id?: string;
  module?: string;
  source?: string;
  status?: string;
  start_at?: string;
  end_at?: string;
  reward_type?: string;
  access_source?: string;
}

export interface StripeVerificationResult {
  provider_subscription_id: string;
  exists: boolean;
  status?: string;           // active, canceled, past_due, etc.
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
  price_id?: string;
  product_id?: string;
  verification_available: boolean;  // false = API outage/error
  raw_error?: string;
}

export interface ReconcileInput {
  user_id: string;
  user_email: string;
  contracts: ActiveContractLike[];
  subscriptions: SubscriptionLike[];
  events?: SubscriptionEventLike[];
  nonPaidGrants?: NonPaidGrantLike[];
  priceIdMap: Record<string, string>;
  stripeVerification?: Record<string, StripeVerificationResult>; // keyed by provider_subscription_id
  previousEntitlement?: {
    has_access?: boolean;
    tier?: string;
    modules?: string[];
    source_type?: EntitlementSourceType;
    verification_status?: VerificationStatus;
  };
}

export interface ContractDetail {
  contract_id: string;
  provider: string;
  provider_subscription_id?: string;
  status: string;
  is_currently_active: boolean;
  scope: ProductScopeResult;
  verification: VerificationStatus;
  stripe_verified_state?: StripeVerificationResult;
  period_start?: string;
  period_end?: string;
  included: boolean;          // whether this contract contributes to entitlement
  exclusion_reason?: string;
}

export interface ReconcileOutput {
  user_id: string;
  user_email: string;
  has_access: boolean;
  tier: 'free' | 'pro';
  modules: string[];
  pipekeeper: boolean;
  whiskeykeeper: boolean;
  cigarkeeper: boolean;
  winekeeper: boolean;
  active_contract_ids: string[];
  backing_subscription_ids: string[];
  mrr_cents: number;
  contract_count: number;
  primary_product: string;
  primary_provider: string;
  primary_billing_interval: string;
  next_renewal_at: string | null;
  source_type: EntitlementSourceType;
  verification_status: VerificationStatus;
  granted_at: string | null;
  effective_start: string | null;
  effective_end: string | null;
  non_paid_grants: NonPaidGrantLike[];
  contracts_detail: ContractDetail[];
  anomalies: string[];
  reconciler_version: string;
}

export const RECONCILER_VERSION = 'canonical_v1';

// ── Helpers ──────────────────────────────────────────────────────────────────

const normEmail = (e: unknown) => String(e || '').trim().toLowerCase();
const now = () => new Date();

function isActiveStatus(status: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'trial';
}

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) <= now();
  } catch {
    return false;
  }
}

function isContractCurrentlyActive(c: ActiveContractLike): boolean {
  if (!isActiveStatus(c.status)) return false;
  if (isExpired(c.period_end)) return false;
  return true;
}

// ── Main reconciler ──────────────────────────────────────────────────────────

export function reconcileEntitlementForUser(input: ReconcileInput): ReconcileOutput {
  const { user_id, user_email, contracts, subscriptions, events = [], nonPaidGrants = [], priceIdMap, stripeVerification = {}, previousEntitlement } = input;
  const email = normEmail(user_email);

  const anomalies: string[] = [];
  const contractsDetail: ContractDetail[] = [];
  const includedContractIds: string[] = [];
  const includedSubscriptionIds: string[] = [];
  const includedModules = new Set<string>();
  let totalMrrCents = 0;
  let earliestStart: string | null = null;
  let latestEnd: string | null = null;
  let nextRenewal: string | null = null;
  let primaryProvider = 'unknown';
  let primaryBillingInterval = 'unknown';
  let primaryProduct = 'unknown';
  let hasVerifiedActive = false;
  let hasProvisional = false;
  let hasVerificationUnavailable = false;
  let hasUnresolvedScope = false;

  // ── Process each contract ──────────────────────────────────────────────────
  for (const c of contracts) {
    const provider = String(c.provider || 'unknown').toLowerCase();
    const subId = c.provider_subscription_id || '';

    // Resolve product scope
    const matchingSub = subscriptions.find(
      (s) =>
        (s.provider_subscription_id && s.provider_subscription_id === subId) ||
        normEmail(s.user_email) === email
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

    // Determine verification status
    let verification: VerificationStatus;
    let stripeState: StripeVerificationResult | undefined;

    if (provider === 'stripe') {
      if (subId && stripeVerification[subId]) {
        stripeState = stripeVerification[subId];
        if (!stripeState.verification_available) {
          // API outage — preserve last known state, do NOT downgrade
          verification = 'verification_unavailable';
          hasVerificationUnavailable = true;
        } else if (stripeState.exists && isActiveStatus(stripeState.status || '')) {
          verification = 'verified_active';
          hasVerifiedActive = true;
        } else {
          verification = 'verified_inactive';
        }
      } else {
        // No Stripe verification fetched — treat as verification_unavailable
        // to avoid downgrading a previously verified user on a transient miss
        verification = 'verification_unavailable';
        hasVerificationUnavailable = true;
      }
    } else if (provider === 'apple') {
      // Apple stays provisional until App Store Server API is configured
      verification = 'provisional';
      hasProvisional = true;
    } else if (provider === 'manual') {
      verification = 'verified_active'; // admin-verified
      hasVerifiedActive = true;
    } else {
      verification = 'provisional';
      hasProvisional = true;
    }

    const currentlyActive = isContractCurrentlyActive(c);
    let included = false;
    let exclusionReason: string | undefined;

    if (scope.confidence === 'unresolved') {
      hasUnresolvedScope = true;
      anomalies.push(`unresolved_product_scope: contract ${c.id}`);
    }

    // Decide inclusion:
    // - verified_active + currently active → include
    // - provisional (Apple) + currently active → include (provisional)
    // - verification_unavailable → preserve if previously had access (don't downgrade on outage)
    // - verified_inactive → exclude
    if (verification === 'verified_active' && currentlyActive) {
      included = true;
    } else if (verification === 'provisional' && currentlyActive) {
      included = true;
    } else if (verification === 'verification_unavailable') {
      // Transient failure: preserve previous access if user had it
      if (previousEntitlement?.has_access === true) {
        included = true;
        anomalies.push(`verification_unavailable_preserved: contract ${c.id} — access preserved during transient provider failure`);
      } else {
        // No previous access — don't grant on unverifiable data
        included = false;
        exclusionReason = 'verification_unavailable_no_prior_access';
      }
    } else if (verification === 'verified_inactive') {
      included = false;
      exclusionReason = `verified_inactive_at_provider (stripe status: ${stripeState?.status || 'unknown'})`;
      anomalies.push(`stale_local_contract: contract ${c.id} is active locally but ${exclusionReason}`);
    } else if (verification === 'verified_active' && !currentlyActive) {
      // Provider says active but local contract period is expired — needs contract repair
      included = false;
      exclusionReason = `provider_active_but_local_contract_expired (period_end: ${c.period_end || 'null'})`;
      anomalies.push(`stale_local_contract: contract ${c.id} — provider active but local contract expired, needs repair`);
    } else {
      included = false;
      exclusionReason = `contract_not_currently_active (status: ${c.status})`;
    }

    contractsDetail.push({
      contract_id: c.id,
      provider,
      provider_subscription_id: subId || undefined,
      status: c.status,
      is_currently_active: currentlyActive,
      scope,
      verification,
      stripe_verified_state: stripeState,
      period_start: c.period_start,
      period_end: c.period_end,
      included,
      exclusion_reason: exclusionReason,
    });

    if (included) {
      includedContractIds.push(c.id);
      if (matchingSub?.id) includedSubscriptionIds.push(matchingSub.id);

      // Add modules from scope
      for (const m of scope.modules) {
        includedModules.add(String(m).toLowerCase());
      }

      // MRR calculation
      const amountCents = c.amount_cents ?? 0;
      const interval = String(c.billing_interval || '').toLowerCase();
      if (interval === 'annual' && amountCents > 0) {
        totalMrrCents += Math.round(amountCents / 12);
      } else if (interval === 'monthly' && amountCents > 0) {
        totalMrrCents += amountCents;
      }

      // Track dates
      if (c.period_start) {
        if (!earliestStart || new Date(c.period_start) < new Date(earliestStart)) {
          earliestStart = c.period_start;
        }
      }
      if (c.period_end) {
        if (!latestEnd || new Date(c.period_end) > new Date(latestEnd)) {
          latestEnd = c.period_end;
        }
        if (!nextRenewal || new Date(c.period_end) < new Date(nextRenewal)) {
          nextRenewal = c.period_end;
        }
      }

      // Primary = highest value
      if (primaryProvider === 'unknown' || (amountCents || 0) > 0) {
        primaryProvider = provider;
        primaryBillingInterval = interval === 'annual' ? 'annual' : interval === 'monthly' ? 'monthly' : 'unknown';
        primaryProduct = scope.product;
      }
    }
  }

  // ── Process non-paid grants (referral, grandfathered, etc.) ──────────────────
  const activeNonPaidGrants: NonPaidGrantLike[] = [];
  for (const grant of nonPaidGrants) {
    if (grant.status === 'active' && !isExpired(grant.end_at)) {
      activeNonPaidGrants.push(grant);
      if (grant.module) {
        includedModules.add(String(grant.module).toLowerCase());
      }
    }
  }

  // ── Determine source_type ────────────────────────────────────────────────────
  let sourceType: EntitlementSourceType = 'none';
  if (includedContractIds.length > 0) {
    if (hasVerifiedActive) {
      sourceType = 'paid_contract';
    } else if (hasProvisional && !hasVerifiedActive) {
      sourceType = 'provisional_apple';
    } else if (hasVerificationUnavailable && !hasVerifiedActive) {
      sourceType = previousEntitlement?.source_type || 'paid_contract'; // preserve
    }
  } else if (activeNonPaidGrants.length > 0) {
    // Determine grant type
    const grant = activeNonPaidGrants[0];
    const src = String(grant.source || grant.access_source || '').toLowerCase();
    if (src === 'referral' || grant.reward_type) {
      sourceType = 'referral';
    } else if (src === 'grandfathered' || src === 'legacy') {
      sourceType = 'grandfathered';
    } else if (src === 'promotional' || src === 'promotion') {
      sourceType = 'promotional';
    } else if (src === 'manual' || src === 'admin') {
      sourceType = 'manual_admin';
    } else if (src === 'trial') {
      sourceType = 'trial';
    } else {
      sourceType = 'manual_admin'; // default for non-paid grants
    }
  } else if (hasUnresolvedScope && includedContractIds.length === 0) {
    sourceType = 'unresolved';
  }

  // ── Determine verification status (highest priority wins) ───────────────────
  let verificationStatus: VerificationStatus = 'manual_review';
  if (hasVerifiedActive) {
    verificationStatus = 'verified_active';
  } else if (hasProvisional) {
    verificationStatus = 'provisional';
  } else if (hasVerificationUnavailable) {
    verificationStatus = 'verification_unavailable';
  } else if (includedContractIds.length === 0 && activeNonPaidGrants.length === 0) {
    verificationStatus = 'verified_inactive';
  }

  // ── Determine has_access and tier ───────────────────────────────────────────
  const hasAccess = includedContractIds.length > 0 || activeNonPaidGrants.length > 0;
  const tier: 'free' | 'pro' = hasAccess ? 'pro' : 'free';

  // ── Module booleans ─────────────────────────────────────────────────────────
  const modules = [...includedModules].sort();
  const pipekeeper = modules.includes('pipekeeper');
  const whiskeykeeper = modules.includes('whiskeykeeper');
  const cigarkeeper = modules.includes('cigarkeeper');
  const winekeeper = modules.includes('winekeeper');

  // ── Primary product ──────────────────────────────────────────────────────────
  if (modules.length > 1) {
    primaryProduct = 'bundle';
  } else if (modules.length === 1) {
    primaryProduct = modules[0];
  }

  // ── Granted at: earliest subscription start ─────────────────────────────────
  let grantedAt = earliestStart;
  for (const s of subscriptions) {
    const start = s.started_at || s.subscriptionStartedAt || s.current_period_start;
    if (start && (!grantedAt || new Date(start) < new Date(grantedAt))) {
      grantedAt = start;
    }
  }

  // ── Build output ─────────────────────────────────────────────────────────────
  return {
    user_id,
    user_email: email,
    has_access: hasAccess,
    tier,
    modules,
    pipekeeper,
    whiskeykeeper,
    cigarkeeper,
    winekeeper,
    active_contract_ids: includedContractIds,
    backing_subscription_ids: includedSubscriptionIds,
    mrr_cents: totalMrrCents,
    contract_count: includedContractIds.length,
    primary_product: primaryProduct,
    primary_provider: primaryProvider as any,
    primary_billing_interval: primaryBillingInterval as any,
    next_renewal_at: nextRenewal,
    source_type: sourceType,
    verification_status: verificationStatus,
    granted_at: grantedAt,
    effective_start: earliestStart,
    effective_end: latestEnd,
    non_paid_grants: activeNonPaidGrants,
    contracts_detail: contractsDetail,
    anomalies,
    reconciler_version: RECONCILER_VERSION,
  };
}

// ── Convenience: build price ID map from Deno.env (for backend functions) ─────

export function buildPriceIdMapFromEnv(envGetter: (key: string) => string | undefined): Record<string, string> {
  return buildPriceIdMap({
    VITE_STRIPE_PIPEKEEPER_MONTHLY: envGetter('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
    VITE_STRIPE_PIPEKEEPER_ANNUAL: envGetter('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
    VITE_STRIPE_WHISKEYKEEPER_MONTHLY: envGetter('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
    VITE_STRIPE_WHISKEYKEEPER_ANNUAL: envGetter('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
    VITE_STRIPE_CIGARKEEPER_MONTHLY: envGetter('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
    VITE_STRIPE_CIGARKEEPER_ANNUAL: envGetter('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
    VITE_STRIPE_WINEKEEPER_MONTHLY: envGetter('VITE_STRIPE_WINEKEEPER_MONTHLY'),
    VITE_STRIPE_WINEKEEPER_ANNUAL: envGetter('VITE_STRIPE_WINEKEEPER_ANNUAL'),
    VITE_STRIPE_FOUNDERS_MONTHLY: envGetter('VITE_STRIPE_FOUNDERS_MONTHLY'),
    VITE_STRIPE_FOUNDERS_ANNUAL: envGetter('VITE_STRIPE_FOUNDERS_ANNUAL'),
    VITE_STRIPE_THREE_BUNDLE_MONTHLY: envGetter('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
    VITE_STRIPE_THREE_BUNDLE_ANNUAL: envGetter('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
    VITE_STRIPE_FOUR_BUNDLE_MONTHLY: envGetter('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
    VITE_STRIPE_FOUR_BUNDLE_ANNUAL: envGetter('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),
  });
}