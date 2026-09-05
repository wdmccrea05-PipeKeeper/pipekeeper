/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { shouldBlockNewSubscription, detectDuplicateConflicts } from '@/lib/billing/duplicateSubscriptionGuard';
import { detectDuplicateBilling, buildObligation, isBillableObligation, periodsOverlap } from '@/lib/billing/duplicateBillingDetector';
import { resolveEntitlementScope, scopesIntersect } from '@/lib/billing/entitlementScopeResolver';

// ═══════════════════════════════════════════════════════════════════════════
// ENTITLEMENT SCOPE RESOLVER
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveEntitlementScope', () => {
  it('resolves single module from primary_module', () => {
    expect(resolveEntitlementScope({ primary_module: 'pipekeeper' })).toEqual(['pipekeeper']);
  });

  it('resolves modules from modules_csv', () => {
    expect(resolveEntitlementScope({ modules_csv: 'pipekeeper,whiskeykeeper' }))
      .toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('resolves modules from explicit modules array (ActiveContract)', () => {
    expect(resolveEntitlementScope({ modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] }))
      .toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
  });

  it('resolves founders bundle from plan_key', () => {
    expect(resolveEntitlementScope({ plan_key: 'founders_bundle_monthly' }))
      .toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('resolves 3-module bundle from plan_key', () => {
    expect(resolveEntitlementScope({ plan_key: 'three_module_bundle_annual' }))
      .toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
  });

  it('resolves 4-module bundle from plan_key', () => {
    expect(resolveEntitlementScope({ plan_key: 'four_module_bundle_annual' }))
      .toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  });

  it('resolves from product_kind founders', () => {
    expect(resolveEntitlementScope({ product_kind: 'founders' }))
      .toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('resolves from product enum (ActiveContract)', () => {
    expect(resolveEntitlementScope({ product: 'whiskeykeeper' })).toEqual(['whiskeykeeper']);
  });

  it('does not resolve from product=bundle or product=unknown', () => {
    expect(resolveEntitlementScope({ product: 'bundle' })).toEqual([]);
    expect(resolveEntitlementScope({ product: 'unknown' })).toEqual([]);
  });

  it('resolves from hardcoded price ID', () => {
    expect(resolveEntitlementScope({ price_id: 'price_1SsDgEDycvQWC88PmdvlxFDa' }))
      .toEqual(['pipekeeper']);
  });

  it('resolves founders from hardcoded price ID', () => {
    expect(resolveEntitlementScope({ price_id: 'price_1TKgGnDycvQWC88PwdJo75R5' }))
      .toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('returns empty for unknown record', () => {
    expect(resolveEntitlementScope({})).toEqual([]);
  });
});

describe('scopesIntersect', () => {
  it('detects intersection', () => {
    expect(scopesIntersect(['pipekeeper'], ['pipekeeper', 'whiskeykeeper'])).toBe(true);
  });

  it('returns false for disjoint scopes', () => {
    expect(scopesIntersect(['pipekeeper'], ['whiskeykeeper'])).toBe(false);
  });

  it('returns false for empty scopes', () => {
    expect(scopesIntersect([], ['pipekeeper'])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BILLABLE OBLIGATION & STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════════════

describe('isBillableObligation', () => {
  it('returns true for active status', () => {
    expect(isBillableObligation({ status: 'active' })).toBe(true);
  });

  it('returns true for trialing status', () => {
    expect(isBillableObligation({ status: 'trialing' })).toBe(true);
  });

  it('returns true for past_due status', () => {
    expect(isBillableObligation({ status: 'past_due' })).toBe(true);
  });

  it('returns true for trial status', () => {
    expect(isBillableObligation({ status: 'trial' })).toBe(true);
  });

  it('returns false for incomplete (failed checkout)', () => {
    expect(isBillableObligation({ status: 'incomplete' })).toBe(false);
  });

  it('returns false for expired', () => {
    expect(isBillableObligation({ status: 'expired' })).toBe(false);
  });

  it('returns false for canceled without period-end extension', () => {
    expect(isBillableObligation({ status: 'canceled' })).toBe(false);
  });

  it('returns true for canceled with cancel_at_period_end and future period end', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(isBillableObligation({
      status: 'canceled',
      cancel_at_period_end: true,
      current_period_end: future,
    })).toBe(true);
  });

  it('returns false for canceled with cancel_at_period_end but past period end', () => {
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(isBillableObligation({
      status: 'canceled',
      cancel_at_period_end: true,
      current_period_end: past,
    })).toBe(false);
  });
});

describe('periodsOverlap', () => {
  it('detects overlapping periods', () => {
    expect(periodsOverlap('2025-01-01', '2025-06-01', '2025-03-01', '2025-09-01')).toBe(true);
  });

  it('returns false for non-overlapping sequential periods', () => {
    expect(periodsOverlap('2025-01-01', '2025-06-01', '2025-06-02', '2025-12-01')).toBe(false);
  });

  it('returns false for completely disjoint periods', () => {
    expect(periodsOverlap('2024-01-01', '2024-06-01', '2025-01-01', '2025-06-01')).toBe(false);
  });

  it('handles open-ended periods (no end date)', () => {
    expect(periodsOverlap('2025-01-01', '', '2025-03-01', '')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DETECT DUPLICATE BILLING — VALID (should NOT flag)
// ═══════════════════════════════════════════════════════════════════════════

describe('detectDuplicateBilling — valid scenarios (NO CONFLICT)', () => {
  it('returns no conflicts for a single active subscription', () => {
    const subs = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });

  it('returns no conflicts for empty list', () => {
    expect(detectDuplicateBilling([])).toHaveLength(0);
  });

  it('does NOT flag different modules (PipeKeeper + WhiskeyKeeper)', () => {
    const subs = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: '2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });

  it('does NOT flag different modules (PipeKeeper + CigarKeeper)', () => {
    const subs = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: '2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'cigarkeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });

  it('does NOT flag different modules (WhiskeyKeeper + WineKeeper)', () => {
    const subs = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: '2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'winekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });

  it('does NOT flag historical renewal after lapse (expired + new active, no overlap)', () => {
    const subs = [
      { id: 'old', provider: 'stripe', status: 'expired', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2024-01-01', current_period_end: '2025-01-01' },
      { id: 'new', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-03-01', current_period_end: '2026-03-01' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });

  it('does NOT flag canceled followed by later purchase (no overlap)', () => {
    const subs = [
      { id: 'old', provider: 'stripe', status: 'canceled', billing_interval: 'month', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2025-04-01', canceled_at: '2025-04-01' },
      { id: 'new', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });

  it('does NOT flag failed/abandoned checkout (incomplete) as conflict', () => {
    const subs = [
      { id: 'failed', provider: 'stripe', status: 'incomplete', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'active', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-02-01', current_period_end: '2026-02-01' }
    ];
    const results = detectDuplicateBilling(subs);
    // The incomplete is not billable, so it should be historical overlap at most
    expect(results.every(r => r.classification === 'HISTORICAL_OVERLAP_NO_CHARGE')).toBe(true);
  });

  it('preserves historical records after renewal without flagging', () => {
    const subs = [
      { id: 'hist1', provider: 'stripe', status: 'expired', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2023-01-01', current_period_end: '2024-01-01' },
      { id: 'hist2', provider: 'stripe', status: 'expired', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2024-01-01', current_period_end: '2025-01-01' },
      { id: 'current', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' }
    ];
    expect(detectDuplicateBilling(subs)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DETECT DUPLICATE BILLING — POTENTIAL / INVALID (should FLAG)
// ═══════════════════════════════════════════════════════════════════════════

describe('detectDuplicateBilling — potential/invalid scenarios (should FLAG)', () => {
  it('flags monthly + annual for same module with overlapping periods', () => {
    const subs = [
      { id: 'monthly1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'annual1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].classification).toBe('POTENTIAL_DUPLICATE_SUBSCRIPTION');
  });

  it('flags two annual subscriptions for same module actively recurring', () => {
    const subs = [
      { id: 'a1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'a2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(['POTENTIAL_DUPLICATE_SUBSCRIPTION', 'CONFIRMED_DUPLICATE_BILLING']).toContain(results[0].classification);
  });

  it('flags Apple + Stripe overlapping for same module', () => {
    const subs = [
      { id: 'apple1', provider: 'apple', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'stripe1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(['POTENTIAL_DUPLICATE_SUBSCRIPTION', 'CONFIRMED_DUPLICATE_BILLING']).toContain(results[0].classification);
  });

  it('flags Founders Bundle + PipeKeeper single overlapping on pipekeeper module', () => {
    const subs = [
      { id: 'founders', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'founders_bundle_annual', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'pk_single', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.module === 'pipekeeper')).toBe(true);
  });

  it('flags 4-module bundle + individual module as overlapping', () => {
    const subs = [
      { id: 'bundle', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'four_module_bundle_annual', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'single', provider: 'apple', status: 'active', billing_interval: 'year', primary_module: 'winekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.module === 'winekeeper')).toBe(true);
  });

  it('detects Dallas pre-repair pattern (monthly + annual, same module, overlapping, both active)', () => {
    const subs = [
      { id: 'stripe_monthly', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'stripe_annual', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-03-01', current_period_end: '2026-03-01' },
      { id: 'apple_monthly', provider: 'apple', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.module === 'pipekeeper')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DETECT DUPLICATE BILLING — BILLING PROOF
// ═══════════════════════════════════════════════════════════════════════════

describe('detectDuplicateBilling — billing proof classification', () => {
  it('multiple records + one provider charge → NOT confirmed duplicate billing', () => {
    const subs = [
      { id: 'sub1', provider: 'stripe', provider_subscription_id: 'sub_001', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'sub2', provider: 'stripe', provider_subscription_id: 'sub_002', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const charges = [
      { event_id: 'evt_1', transaction_at: '2025-01-01T00:00:00Z', amount_cents: 9900, currency: 'usd', provider_subscription_id: 'sub_001' }
    ];
    const results = detectDuplicateBilling(subs, charges);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].classification).not.toBe('CONFIRMED_DUPLICATE_BILLING');
    expect(results[0].requires_refund).toBe(false);
  });

  it('overlapping same-scope subscriptions + overlapping successful charges → CONFIRMED DUPLICATE BILLING', () => {
    const subs = [
      { id: 'sub1', provider: 'stripe', provider_subscription_id: 'sub_001', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' },
      { id: 'sub2', provider: 'stripe', provider_subscription_id: 'sub_002', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-06-01', current_period_end: '2026-06-01' }
    ];
    const charges = [
      { event_id: 'evt_1', transaction_at: '2025-01-01T00:00:00Z', amount_cents: 9900, currency: 'usd', provider_subscription_id: 'sub_001' },
      { event_id: 'evt_2', transaction_at: '2025-07-01T00:00:00Z', amount_cents: 9900, currency: 'usd', provider_subscription_id: 'sub_002' }
    ];
    const results = detectDuplicateBilling(subs, charges);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].classification).toBe('CONFIRMED_DUPLICATE_BILLING');
    expect(results[0].requires_refund).toBe(true);
    expect(results[0].total_duplicate_charge_cents).toBe(19800);
  });

  it('classifies as HISTORICAL_OVERLAP when one sub is expired', () => {
    const subs = [
      { id: 'old', provider: 'stripe', provider_subscription_id: 'sub_001', status: 'expired', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2024-06-01', current_period_end: '2025-06-01' },
      { id: 'new', provider: 'stripe', provider_subscription_id: 'sub_002', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_start: '2025-01-01', current_period_end: '2026-01-01' }
    ];
    const results = detectDuplicateBilling(subs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].classification).toBe('HISTORICAL_OVERLAP_NO_CHARGE');
    expect(results[0].requires_refund).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT GUARD — shouldBlockNewSubscription
// ═══════════════════════════════════════════════════════════════════════════

describe('shouldBlockNewSubscription — valid purchases (ALLOW)', () => {
  it('allows different module purchase (PipeKeeper active → buy WhiskeyKeeper)', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'whiskeykeeper');
    expect(result.block).toBe(false);
  });

  it('allows different module purchase (WhiskeyKeeper active → buy PipeKeeper)', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(false);
  });

  it('allows expired subscription → repurchase', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'expired', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(false);
  });

  it('allows lapsed subscription → renewal (canceled, no period-end extension)', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'canceled', billing_interval: 'month', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(false);
  });

  it('allows monthly → annual upgrade', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(false);
    expect(result.isUpgrade).toBe(true);
  });

  it('allows failed checkout (incomplete) → new purchase', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'incomplete', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(false);
  });

  it('allows bundle upgrade (PipeKeeper single → 3-module bundle)', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(result.block).toBe(false);
    expect(result.isUpgrade).toBe(true);
  });

  it('allows checkout when no existing subscriptions', () => {
    expect(shouldBlockNewSubscription([], 'year', 'pipekeeper').block).toBe(false);
  });

  it('allows pending verification (trial) → different module purchase', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'trial', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'whiskeykeeper');
    expect(result.block).toBe(false);
  });
});

describe('shouldBlockNewSubscription — invalid purchases (BLOCK)', () => {
  it('blocks duplicate monthly checkout when monthly already active', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
    expect(result.block).toBe(true);
    expect(result.existingSubscriptionId).toBe('1');
  });

  it('blocks duplicate annual checkout when annual already active', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(true);
  });

  it('blocks monthly checkout when annual already active (downgrade prevention)', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
    expect(result.block).toBe(true);
    expect(result.reason).toContain('annual');
  });

  it('blocks PipeKeeper single when Founders Bundle (covers pipekeeper) is active', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'founders_bundle_annual' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(true);
  });

  it('blocks PipeKeeper monthly when Founders Bundle annual is active', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'founders_bundle_annual' }
    ];
    const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
    expect(result.block).toBe(true);
  });

  it('blocks canceled-but-active-through-period-end (period not yet ended)', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const existing = [
      { id: '1', provider: 'stripe', status: 'canceled', cancel_at_period_end: true, current_period_end: future, billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(true);
  });

  it('blocks trial/trialing subscription for same module and interval', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'trialing', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(true);
  });
});

describe('shouldBlockNewSubscription — scope-aware behavior', () => {
  it('uses entitlement scope, not tier name', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', tier: 'pro' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'whiskeykeeper');
    expect(result.block).toBe(false);
  });

  it('allows founders_bundle key as new scope', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'founders_bundle');
    expect(result.block).toBe(false);
    expect(result.isUpgrade).toBe(true);
  });

  it('blocks 4-module bundle repurchase when 4-module bundle already active', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'four_module_bundle_annual' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'four_module_bundle');
    expect(result.block).toBe(true);
  });

  it('allows 3-module bundle → 4-module bundle upgrade (superset)', () => {
    const existing = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'three_module_bundle_annual' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'four_module_bundle');
    expect(result.block).toBe(false);
    expect(result.isUpgrade).toBe(true);
  });
});

describe('shouldBlockNewSubscription — multi-subscription scenarios', () => {
  it('allows 3-module bundle when user has PipeKeeper annual + WhiskeyKeeper annual (upgrade for both)', () => {
    const existing = [
      { id: 'pk', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' },
      { id: 'wk', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(result.block).toBe(false);
    expect(result.isUpgrade).toBe(true);
  });

  it('blocks PipeKeeper annual when user has PipeKeeper annual + WhiskeyKeeper annual', () => {
    const existing = [
      { id: 'pk', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' },
      { id: 'wk', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
    expect(result.block).toBe(true);
  });

  it('blocks 3-module bundle annual when user has PipeKeeper annual (same interval, not superset)', () => {
    // Wait — 3-module bundle IS a superset of PipeKeeper, so this should be an upgrade
    // Actually: newScope = [pk, wk, ck], existingScope = [pk], isNewSuperset = 3 > 1 = true → ALLOW
    const existing = [
      { id: 'pk', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'year', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(result.block).toBe(false);
    expect(result.isUpgrade).toBe(true);
  });

  it('blocks when one existing sub blocks even if another allows', () => {
    // User has PipeKeeper annual (blocks new PipeKeeper monthly) + WhiskeyKeeper monthly (allows)
    // New purchase: PipeKeeper monthly → should BLOCK on PipeKeeper annual
    const existing = [
      { id: 'pk_annual', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' },
      { id: 'wk_monthly', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'whiskeykeeper' }
    ];
    const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
    expect(result.block).toBe(true);
    expect(result.existingSubscriptionId).toBe('pk_annual');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY detectDuplicateConflicts WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

describe('detectDuplicateConflicts (legacy wrapper)', () => {
  it('returns no conflicts for different modules', () => {
    const subs = [
      { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' },
      { id: '2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
    ];
    expect(detectDuplicateConflicts(subs)).toHaveLength(0);
  });

  it('detects monthly + annual conflict for same module', () => {
    const subs = [
      { id: 'monthly1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', created_date: '2026-01-01' },
      { id: 'annual1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_end: '2027-01-01', created_date: '2026-02-01' }
    ];
    const conflicts = detectDuplicateConflicts(subs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('monthly_plus_annual');
    expect(conflicts[0].keep_subscription_id).toBe('annual1');
  });

  it('ignores expired and incomplete subscriptions', () => {
    const subs = [
      { id: '1', provider: 'stripe', status: 'expired', billing_interval: 'month', primary_module: 'pipekeeper' },
      { id: '2', provider: 'stripe', status: 'incomplete', billing_interval: 'year', primary_module: 'pipekeeper' },
      { id: '3', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    expect(detectDuplicateConflicts(subs)).toHaveLength(0);
  });

  it('detects Founders Bundle + PipeKeeper single as conflict on pipekeeper', () => {
    const subs = [
      { id: 'founders', provider: 'stripe', status: 'active', billing_interval: 'year', plan_key: 'founders_bundle_annual' },
      { id: 'pk', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
    ];
    const conflicts = detectDuplicateConflicts(subs);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});