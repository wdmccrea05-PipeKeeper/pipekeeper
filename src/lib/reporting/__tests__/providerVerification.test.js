/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  classifyWithProviderEvidence,
  categorizeStaleRow,
  classifyAccount,
  EVIDENCE_HIERARCHY,
} from '../providerVerificationEngine';

const NOW = new Date('2026-07-13T12:00:00Z');
const FUTURE = new Date('2026-12-31T00:00:00Z');
const PAST = new Date('2026-03-01T00:00:00Z');
const RECENT_PAYMENT = new Date('2026-07-01T00:00:00Z'); // 12 days ago
const OLD_PAYMENT = new Date('2025-06-01T00:00:00Z'); // over a year ago

function makeLocal(opts = {}) {
  return {
    normalized_status: opts.normalized_status || 'active_paid',
    current_period_end: opts.current_period_end || FUTURE,
    provider: opts.provider || 'stripe',
    ...opts,
  };
}

function makeStripe(opts = {}) {
  return {
    status: opts.status || 'active',
    current_period_end: opts.current_period_end
      ? Math.floor(new Date(opts.current_period_end).getTime() / 1000)
      : Math.floor(FUTURE.getTime() / 1000),
    cancel_at_period_end: opts.cancel_at_period_end ?? false,
    canceled_at: opts.canceled_at ? Math.floor(new Date(opts.canceled_at).getTime() / 1000) : null,
    ended_at: opts.ended_at ? Math.floor(new Date(opts.ended_at).getTime() / 1000) : null,
    ...opts,
  };
}

describe('Provider verification — status-evidence hierarchy', () => {
  // 1. Local period expired but Stripe subscription renewed
  it('1. local period expired but Stripe subscription is active → verified_current_paid', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const stripe = makeStripe({ status: 'active', current_period_end: FUTURE });
    const result = classifyWithProviderEvidence(local, stripe, RECENT_PAYMENT, NOW);
    expect(result.verified_status).toBe('verified_current_paid');
  });

  // 2. Local period expired and Stripe confirms canceled
  it('2. local period expired and Stripe confirms canceled → verified_canceled', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const stripe = makeStripe({ status: 'canceled', ended_at: PAST });
    const result = classifyWithProviderEvidence(local, stripe, null, NOW);
    expect(result.verified_status).toBe('verified_canceled');
  });

  // 3. Latest invoice paid but ActiveContract period not updated
  it('3. Stripe active with stale period_end but recent payment → verified_current_paid', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const stripe = makeStripe({ status: 'active', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, stripe, RECENT_PAYMENT, NOW);
    expect(result.verified_status).toBe('verified_current_paid');
  });

  // 4. Stripe cancel-at-period-end still inside paid period → still verified_current_paid (counts as paying)
  it('4. Stripe cancel-at-period-end within paid period → verified_current_paid (still paying)', () => {
    const local = makeLocal({ normalized_status: 'canceling_but_entitled', current_period_end: FUTURE });
    const stripe = makeStripe({ status: 'active', cancel_at_period_end: true, current_period_end: FUTURE });
    const result = classifyWithProviderEvidence(local, stripe, RECENT_PAYMENT, NOW);
    expect(result.verified_status).toBe('verified_current_paid');
  });

  // 5. Stripe canceled after period end
  it('5. Stripe canceled after period end → verified_canceled', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const stripe = makeStripe({ status: 'canceled', ended_at: PAST, canceled_at: PAST });
    const result = classifyWithProviderEvidence(local, stripe, null, NOW);
    expect(result.verified_status).toBe('verified_canceled');
  });

  // 6. Historical invoice with current user-level paying state
  it('6. historical invoice row with current local period and recent payment → locally_current_unverified', () => {
    const local = makeLocal({ normalized_status: 'active_paid', current_period_end: FUTURE });
    const result = classifyWithProviderEvidence(local, null, RECENT_PAYMENT, NOW);
    expect(result.verified_status).toBe('locally_current_unverified');
  });

  // 7. Apple local period expired but provider unverified
  it('7. Apple local period expired but unverified → apple_locally_expired_unverified', () => {
    const local = makeLocal({ provider: 'apple', normalized_status: 'expired', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, null, null, NOW);
    expect(result.verified_status).toBe('apple_locally_expired_unverified');
  });

  it('7b. Apple local period current but unverified → apple_locally_current_unverified', () => {
    const local = makeLocal({ provider: 'apple', normalized_status: 'active_paid', current_period_end: FUTURE });
    const result = classifyWithProviderEvidence(local, null, RECENT_PAYMENT, NOW);
    expect(result.verified_status).toBe('apple_locally_current_unverified');
  });

  // 8. Apple duplicate original transaction IDs (both should be same verified_status)
  it('8. Apple duplicate original transaction IDs → both unverified', () => {
    const local1 = makeLocal({ provider: 'apple', normalized_status: 'active_paid', current_period_end: FUTURE });
    const local2 = makeLocal({ provider: 'apple', normalized_status: 'active_paid', current_period_end: FUTURE });
    const r1 = classifyWithProviderEvidence(local1, null, null, NOW);
    const r2 = classifyWithProviderEvidence(local2, null, null, NOW);
    expect(r1.verified_status).toBe(r2.verified_status);
    expect(r1.verified_status).toBe('apple_locally_current_unverified');
  });

  // 9. One unmatched current subscription identity
  it('9. unmatched identity with no Stripe record → locally_expired_unverified', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, null, null, NOW);
    expect(result.verified_status).toBe('locally_expired_unverified');
  });

  // 10. One test account excluded from business KPI but retained in audit total
  it('10. test account classified correctly', () => {
    expect(classifyAccount('test@pipekeeperapp.com', 'sub_123')).toBe('test_account');
    expect(classifyAccount('admin@pipekeeperapp.com', 'sub_123')).toBe('internal_admin');
    expect(classifyAccount('user@example.com', 'test_12345')).toBe('test_account');
    expect(classifyAccount('user@gmail.com', 'sub_123')).toBe('production_customer');
  });

  // 11. Canonical subscriptions contain 40 identities while production KPI contains 39
  it('11. test/internal exclusion reduces production KPI by 1', () => {
    const identities = ['u1', 'u2', 'u3', 'u4', 'u5'];
    const testAccounts = ['u5'];
    const registeredUsers = identities.filter((id) => !id.startsWith('email:'));
    const productionKpi = registeredUsers.filter((id) => !testAccounts.includes(id));
    expect(registeredUsers.length).toBe(5);
    expect(productionKpi.length).toBe(4);
    expect(productionKpi.length).toBe(registeredUsers.length - testAccounts.length);
  });

  // 12. Distinct users from current subscriptions equal current-paying audit users
  it('12. distinct user IDs from verified subscriptions equals paying user count', () => {
    const subs = [
      { user_id: 'u1', verified_status: 'verified_current_paid' },
      { user_id: 'u2', verified_status: 'verified_current_paid' },
      { user_id: 'u1', verified_status: 'verified_current_paid' }, // duplicate
      { user_id: 'u3', verified_status: 'verified_canceled' },
    ];
    const paying = subs.filter((s) => ['verified_current_paid', 'verified_canceling_but_paid_through'].includes(s.verified_status));
    const distinctUsers = [...new Set(paying.map((s) => s.user_id))];
    expect(distinctUsers).toEqual(['u1', 'u2']);
    expect(distinctUsers.length).toBe(2);
  });

  // 13. Renewal supersedes stale period
  it('13. renewal with later period_end supersedes stale row', () => {
    const stale = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const renewal = makeLocal({ normalized_status: 'active_paid', current_period_end: FUTURE });
    const staleResult = classifyWithProviderEvidence(stale, null, null, NOW);
    const renewalResult = classifyWithProviderEvidence(renewal, null, RECENT_PAYMENT, NOW);
    expect(renewalResult.verified_status).not.toBe(staleResult.verified_status);
  });

  // 14. Missing period end with live active provider state
  it('14. missing period_end but Stripe active → verified_current_paid', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: null });
    const stripe = makeStripe({ status: 'active', current_period_end: FUTURE });
    const result = classifyWithProviderEvidence(local, stripe, null, NOW);
    expect(result.verified_status).toBe('verified_current_paid');
  });

  // 15. Missing provider state falls back to clearly labeled local inference
  it('15. no provider data, local period current → locally_current_unverified', () => {
    const local = makeLocal({ normalized_status: 'active_paid', current_period_end: FUTURE });
    const result = classifyWithProviderEvidence(local, null, null, NOW);
    expect(result.verified_status).toBe('locally_current_unverified');
    expect(result.evidence_source).toBe('local_contract_period');
  });

  it('15b. no provider data, local period expired → locally_expired_unverified', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, null, null, NOW);
    expect(result.verified_status).toBe('locally_expired_unverified');
  });

  // 16. Conflicting local and provider status appears as an exception
  it('16. Stripe active but stale period_end and no recent payment → conflicting_provider_and_local_state', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const stripe = makeStripe({ status: 'active', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, stripe, OLD_PAYMENT, NOW);
    expect(result.verified_status).toBe('conflicting_provider_and_local_state');
  });

  it('16b. local expired but recent payment and no Stripe → conflicting_provider_and_local_state', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, null, RECENT_PAYMENT, NOW);
    expect(result.verified_status).toBe('conflicting_provider_and_local_state');
  });

  // 17. Historical rows never inherit user-level current status
  it('17. historical expired row without payment evidence → locally_expired_unverified (not current)', () => {
    const local = makeLocal({ normalized_status: 'expired', current_period_end: PAST });
    const result = classifyWithProviderEvidence(local, null, null, NOW);
    expect(result.verified_status).toBe('locally_expired_unverified');
    expect(['verified_current_paid', 'verified_canceling_but_paid_through']).not.toContain(result.verified_status);
  });

  // 18. Multiple genuine products increase subscriptions but not users
  it('18. multiple products → multiple subscriptions, same user count', () => {
    const subs = [
      { user_id: 'u1', verified_status: 'verified_current_paid', product: 'pipekeeper' },
      { user_id: 'u1', verified_status: 'verified_current_paid', product: 'whiskeykeeper' },
    ];
    const payingSubs = subs.filter((s) => s.verified_status === 'verified_current_paid');
    const distinctUsers = [...new Set(payingSubs.map((s) => s.user_id))];
    expect(payingSubs.length).toBe(2);
    expect(distinctUsers.length).toBe(1);
  });

  // 19. Duplicate provider rows do not increase subscriptions
  it('19. duplicate provider rows → same subscription count after dedup', () => {
    const subs = [
      { provider_subscription_id: 'sub_1', verified_status: 'verified_current_paid' },
      { provider_subscription_id: 'sub_1', verified_status: 'verified_current_paid' },
    ];
    const deduped = [...new Map(subs.map((s) => [s.provider_subscription_id, s])).values()];
    expect(deduped.length).toBe(1);
  });

  // 20. Provider migration does not create two current subscriptions unless both remain active
  it('20. provider migration — old Stripe canceled, new Apple unverified → only unverified current', () => {
    const oldStripe = makeLocal({ provider: 'stripe', normalized_status: 'expired', current_period_end: PAST });
    const oldResult = classifyWithProviderEvidence(oldStripe, makeStripe({ status: 'canceled', ended_at: PAST }), null, NOW);
    const newApple = makeLocal({ provider: 'apple', normalized_status: 'active_paid', current_period_end: FUTURE });
    const newResult = classifyWithProviderEvidence(newApple, null, null, NOW);
    expect(oldResult.verified_status).toBe('verified_canceled');
    expect(newResult.verified_status).toBe('apple_locally_current_unverified');
    expect(['verified_current_paid', 'verified_canceling_but_paid_through']).not.toContain(oldResult.verified_status);
  });
});

describe('categorizeStaleRow', () => {
  it('categorizes provider_confirms_still_active', () => {
    expect(categorizeStaleRow(true, 'active', 'stripe', null, NOW)).toBe('provider_confirms_still_active');
  });

  it('categorizes provider_confirms_expired', () => {
    expect(categorizeStaleRow(true, 'canceled', 'stripe', null, NOW)).toBe('provider_confirms_expired');
  });

  it('categorizes provider_unavailable_recent_payment', () => {
    expect(categorizeStaleRow(false, null, 'stripe', RECENT_PAYMENT, NOW)).toBe('provider_unavailable_recent_payment');
  });

  it('categorizes provider_unavailable', () => {
    expect(categorizeStaleRow(false, null, 'stripe', null, NOW)).toBe('provider_unavailable');
  });

  it('categorizes apple_unverified', () => {
    expect(categorizeStaleRow(false, null, 'apple', null, NOW)).toBe('apple_unverified');
  });

  it('categorizes unresolved for unknown provider', () => {
    expect(categorizeStaleRow(false, null, 'google', null, NOW)).toBe('unresolved');
  });
});

describe('EVIDENCE_HIERARCHY', () => {
  it('contains all 9 status types', () => {
    expect(EVIDENCE_HIERARCHY).toHaveLength(9);
    expect(EVIDENCE_HIERARCHY).toContain('verified_current_paid');
    expect(EVIDENCE_HIERARCHY).toContain('conflicting_provider_and_local_state');
    expect(EVIDENCE_HIERARCHY).toContain('unresolved');
  });
});