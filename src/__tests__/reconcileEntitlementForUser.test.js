/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  reconcileEntitlementForUser,
  RECONCILER_VERSION,
  buildPriceIdMap,
} from '../lib/billing/reconcileEntitlementForUser';

// ── Test price ID map (simulates env vars) ──────────────────────────────────
const PRICE_ID_MAP = buildPriceIdMap({
  VITE_STRIPE_PIPEKEEPER_MONTHLY: 'price_pk_m',
  VITE_STRIPE_PIPEKEEPER_ANNUAL: 'price_pk_a',
  VITE_STRIPE_WHISKEYKEEPER_ANNUAL: 'price_wk_a',
  VITE_STRIPE_FOUNDERS_MONTHLY: 'price_founders_m',
  VITE_STRIPE_FOUR_BUNDLE_ANNUAL: 'price_4bundle_a',
});

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

function makeContract(overrides = {}) {
  return {
    id: 'contract_1',
    user_id: 'user_1',
    user_email: 'test@example.com',
    provider: 'stripe',
    provider_subscription_id: 'sub_1',
    status: 'active',
    is_active: true,
    amount_cents: 2999,
    billing_interval: 'annual',
    period_start: PAST,
    period_end: FUTURE,
    ...overrides,
  };
}

describe('reconcileEntitlementForUser — Contract → Entitlement', () => {

  // ── Verified Stripe PipeKeeper annual → PipeKeeper Pro ────────────────────
  it('verified Stripe PipeKeeper annual → PipeKeeper Pro entitlement', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_pk' })],
      subscriptions: [{ id: 'sub_1', user_id: 'user_1', user_email: 'test@example.com', provider: 'stripe', provider_subscription_id: 'sub_pk', product_id: 'price_pk_a', status: 'active' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_pk: { provider_subscription_id: 'sub_pk', exists: true, status: 'active', verification_available: true },
      },
    });

    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.modules).toEqual(['pipekeeper']);
    expect(result.pipekeeper).toBe(true);
    expect(result.whiskeykeeper).toBe(false);
    expect(result.source_type).toBe('paid_contract');
    expect(result.verification_status).toBe('verified_active');
  });

  // ── Verified Stripe WhiskeyKeeper annual → WhiskeyKeeper only ──────────────
  it('verified Stripe WhiskeyKeeper annual → WhiskeyKeeper entitlement only', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_wk' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_wk', product_id: 'price_wk_a', status: 'active' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_wk: { provider_subscription_id: 'sub_wk', exists: true, status: 'active', verification_available: true },
      },
    });

    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.modules).toEqual(['whiskeykeeper']);
    expect(result.whiskeykeeper).toBe(true);
    expect(result.pipekeeper).toBe(false);
    expect(result.source_type).toBe('paid_contract');
  });

  // ── Multi-module plan → exact included scopes ──────────────────────────────
  it('4-module bundle → all four modules granted', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_4b' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_4b', product_id: 'price_4bundle_a', status: 'active' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_4b: { provider_subscription_id: 'sub_4b', exists: true, status: 'active', verification_available: true },
      },
    });

    expect(result.has_access).toBe(true);
    expect(result.modules).toEqual(expect.arrayContaining(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']));
    expect(result.modules.length).toBe(4);
    expect(result.primary_product).toBe('bundle');
  });

  // ── Missing entitlement: verified active contract + no UserEntitlement ────
  it('verified active contract + no UserEntitlement → entitlement repaired', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_pk' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_pk', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_pk: { provider_subscription_id: 'sub_pk', exists: true, status: 'active', verification_available: true },
      },
      previousEntitlement: undefined,
    });

    expect(result.has_access).toBe(true);
    expect(result.source_type).toBe('paid_contract');
    expect(result.active_contract_ids).toEqual(['contract_1']);
  });

  // ── Idempotency: run reconciler twice → same result ────────────────────────
  it('running reconciler twice produces identical results (idempotent)', () => {
    const input = {
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_pk' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_pk', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_pk: { provider_subscription_id: 'sub_pk', exists: true, status: 'active', verification_available: true },
      },
    };

    const result1 = reconcileEntitlementForUser(input);
    const result2 = reconcileEntitlementForUser(input);

    expect(result1.has_access).toBe(result2.has_access);
    expect(result1.tier).toBe(result2.tier);
    expect(result1.modules).toEqual(result2.modules);
    expect(result1.active_contract_ids).toEqual(result2.active_contract_ids);
    expect(result1.source_type).toBe(result2.source_type);
  });

  // ── Stale contract: local active + Stripe expired → no paid entitlement ──
  it('local active + Stripe expired → no new paid entitlement', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_stale' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_stale', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_stale: { provider_subscription_id: 'sub_stale', exists: true, status: 'canceled', verification_available: true },
      },
    });

    expect(result.has_access).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.source_type).toBe('none');
    expect(result.verification_status).toBe('verified_inactive');
    expect(result.anomalies.some(a => a.includes('stale_local_contract'))).toBe(true);
  });

  // ── Local expired + Stripe active → contract needs repair ──────────────────
  it('local expired contract + Stripe active → flagged as stale, needs contract repair', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_renewed', period_end: PAST })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_renewed', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_renewed: {
          provider_subscription_id: 'sub_renewed', exists: true, status: 'active',
          current_period_end: FUTURE, verification_available: true,
        },
      },
    });

    // Conservative: contract needs repair first. Reconciler flags it.
    expect(result.has_access).toBe(false);
    expect(result.anomalies.some(a => a.includes('stale_local_contract'))).toBe(true);
  });

  // ── Renewal: existing entitlement + renewal → preserved and dates updated ──
  it('renewal preserves entitlement and updates dates', () => {
    const renewedContract = makeContract({
      period_start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date(Date.now() + 364 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [renewedContract],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_1', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_1: { provider_subscription_id: 'sub_1', exists: true, status: 'active', verification_available: true },
      },
      previousEntitlement: { has_access: true, tier: 'pro', modules: ['pipekeeper'], source_type: 'paid_contract', verification_status: 'verified_active' },
    });

    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.modules).toEqual(['pipekeeper']);
    expect(result.source_type).toBe('paid_contract');
    expect(result.effective_end).toBe(renewedContract.period_end);
  });

  // ── Cancellation: canceled but paid through future → access remains ────────
  it('canceled but paid through future date → access remains until period end', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ status: 'active', period_end: FUTURE })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_1', product_id: 'price_pk_a', cancel_at_period_end: true }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_1: { provider_subscription_id: 'sub_1', exists: true, status: 'active', cancel_at_period_end: true, verification_available: true },
      },
    });

    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.effective_end).toBe(FUTURE);
  });

  // ── Expiration: authoritatively expired → paid entitlement ends ───────────
  it('authoritatively expired → no paid entitlement', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ status: 'expired', period_end: PAST })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_1', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_1: { provider_subscription_id: 'sub_1', exists: true, status: 'canceled', verification_available: true },
      },
    });

    expect(result.has_access).toBe(false);
    expect(result.tier).toBe('free');
  });

  // ── Provider outage: previously verified Pro + Stripe unavailable → NOT Free
  it('previously verified Pro + Stripe temporarily unavailable → does NOT become Free', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_outage' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_outage', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_outage: { provider_subscription_id: 'sub_outage', exists: false, verification_available: false, raw_error: 'API timeout' },
      },
      previousEntitlement: { has_access: true, tier: 'pro', modules: ['pipekeeper'], source_type: 'paid_contract', verification_status: 'verified_active' },
    });

    // CRITICAL: must NOT downgrade to Free during provider outage
    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.verification_status).toBe('verification_unavailable');
    expect(result.anomalies.some(a => a.includes('verification_unavailable_preserved'))).toBe(true);
  });

  // ── Apple: provisional Apple → provisional access preserved ──────────────────
  it('provisional Apple → provisional access preserved', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'apple', provider_subscription_id: 'apple_orig_1' })],
      subscriptions: [{ id: 'sub_1', provider: 'apple', provider_subscription_id: 'apple_orig_1', product_id: 'com.collectionkeeper.pipekeeper.annual' }],
      priceIdMap: PRICE_ID_MAP,
    });

    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.source_type).toBe('provisional_apple');
    expect(result.verification_status).toBe('provisional');
  });

  // ── Apple with resolved scope → entitlement reconciled ─────────────────────
  it('Apple with resolved scope → entitlement reconciled', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'apple', provider_subscription_id: 'apple_orig_2', modules: ['pipekeeper'] })],
      subscriptions: [{ id: 'sub_1', provider: 'apple', provider_subscription_id: 'apple_orig_2' }],
      priceIdMap: PRICE_ID_MAP,
    });

    expect(result.has_access).toBe(true);
    expect(result.modules).toEqual(['pipekeeper']);
    expect(result.verification_status).toBe('provisional');
  });

  // ── Apple inactive → lifecycle reconciled (no entitlement) ─────────────────
  it('Apple contract with expired period → no entitlement', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'apple', provider_subscription_id: 'apple_orig_3', status: 'expired', period_end: PAST })],
      subscriptions: [{ id: 'sub_1', provider: 'apple', provider_subscription_id: 'apple_orig_3' }],
      priceIdMap: PRICE_ID_MAP,
    });

    expect(result.has_access).toBe(false);
    expect(result.tier).toBe('free');
  });

  // ── Provenance: every active entitlement has a valid source ─────────────────
  it('every active entitlement has a valid source_type', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_1' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_1', product_id: 'price_pk_a' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_1: { provider_subscription_id: 'sub_1', exists: true, status: 'active', verification_available: true },
      },
    });

    expect(result.has_access).toBe(true);
    expect(result.source_type).not.toBe('none');
    expect(['paid_contract', 'provisional_apple', 'grandfathered', 'promotional', 'referral', 'manual_admin', 'trial']).toContain(result.source_type);
  });

  // ── Referral grant → referral source type ───────────────────────────────────
  it('referral grant without contract → referral source type', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [],
      subscriptions: [],
      nonPaidGrants: [{ id: 'grant_1', user_id: 'user_1', module: 'pipekeeper', source: 'referral', status: 'active', start_at: PAST, end_at: FUTURE, reward_type: 'free_month' }],
      priceIdMap: PRICE_ID_MAP,
    });

    expect(result.has_access).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.source_type).toBe('referral');
    expect(result.modules).toEqual(['pipekeeper']);
  });

  // ── No contract, no grant → Free ─────────────────────────────────────────────
  it('no contracts and no grants → Free', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [],
      subscriptions: [],
      priceIdMap: PRICE_ID_MAP,
    });

    expect(result.has_access).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.source_type).toBe('none');
  });

  // ── Unresolved scope → flagged, not granted blindly ─────────────────────────
  it('unresolved product scope → flagged as anomaly', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [makeContract({ provider: 'stripe', provider_subscription_id: 'sub_unknown', amount_cents: 0, billing_interval: 'unknown' })],
      subscriptions: [{ id: 'sub_1', provider: 'stripe', provider_subscription_id: 'sub_unknown' }],
      priceIdMap: PRICE_ID_MAP,
      stripeVerification: {
        sub_unknown: { provider_subscription_id: 'sub_unknown', exists: true, status: 'active', verification_available: true },
      },
    });

    expect(result.has_access).toBe(true);
    expect(result.anomalies.some(a => a.includes('unresolved_product_scope'))).toBe(true);
  });

  // ── Reconciler version ──────────────────────────────────────────────────────
  it('returns reconciler version', () => {
    const result = reconcileEntitlementForUser({
      user_id: 'user_1',
      user_email: 'test@example.com',
      contracts: [],
      subscriptions: [],
      priceIdMap: PRICE_ID_MAP,
    });

    expect(result.reconciler_version).toBe(RECONCILER_VERSION);
  });
});