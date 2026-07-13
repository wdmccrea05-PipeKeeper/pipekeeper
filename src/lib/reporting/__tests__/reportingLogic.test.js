import { describe, test, expect } from 'vitest';
import {
  classifyStatus,
  isPaymentEvent,
  isCancelEvent,
  isExpireEvent,
  resolveFirstPaidAt,
  resolveDateRange,
  resolveUserIdentity,
  dedupeKey,
  deduplicateContracts,
  buildActivityIndex,
  hasRealActivity,
  computeMetrics,
  inDateRange,
  parseMetricDate,
  norm,
} from '../reportingLogic';

const NOW = new Date('2026-07-13T12:00:00Z');

// Helpers
function mkUser(overrides = {}) {
  return { id: 'u1', email: 'test@example.com', created_date: '2026-01-01T00:00:00Z', is_disabled: false, merged_into_user_id: null, ...overrides };
}
function mkSubEvent(overrides = {}) {
  return { event_type: 'invoice.payment_succeeded', provider: 'stripe', user_id: 'u1', ingested_at: '2026-07-01T00:00:00Z', amount_cents: 999, ...overrides };
}
function mkContract(overrides = {}) {
  return {
    canonical_subscription_id: 'sub_1',
    userId: 'u1',
    email: 'test@example.com',
    matched_to_user: true,
    has_user_id: true,
    provider: 'stripe',
    provider_subscription_id: 'sub_1',
    product: 'pipekeeper',
    modules: ['pipekeeper'],
    normalized_status: 'active_paid',
    is_currently_entitled: true,
    is_currently_paying: true,
    has_successful_payment: true,
    has_ever_paid: true,
    first_paid_at: parseMetricDate('2026-07-01'),
    first_paid_source: 'subscription_event',
    first_paid_confidence: 'confirmed',
    latest_payment_at: parseMetricDate('2026-07-01'),
    current_period_start: parseMetricDate('2026-07-01'),
    current_period_end: parseMetricDate('2026-08-01'),
    canceled_at: null,
    expired_at: null,
    amount: 9.99,
    billing_interval: 'month',
    reconciliation_issues: [],
    ...overrides,
  };
}
function mkUserRecord(overrides = {}) {
  return {
    user_id: 'u1', email: 'test@example.com',
    created_at: parseMetricDate('2026-01-01'),
    is_currently_entitled: true, is_currently_paying: true, has_ever_paid: true,
    first_paid_at: parseMetricDate('2026-07-01'), first_paid_source: 'subscription_event',
    reactivated_at: null, current_provider: 'stripe', current_products: ['pipekeeper'],
    is_trial: false, is_past_due: false, is_synthetic: false,
    has_canceling_but_entitled: false, has_expired: false, has_conflicting_status: false,
    active_1d: false, active_7d: false, active_30d: true, active_90d: true,
    data_quality_status: 'clean', reconciliation_issues: [],
    ...overrides,
  };
}

describe('Status classification', () => {
  test('active maps to active_paid', () => {
    expect(classifyStatus('active', null, NOW)).toBe('active_paid');
  });
  test('trial maps to trial', () => {
    expect(classifyStatus('trial', null, NOW)).toBe('trial');
    expect(classifyStatus('trialing', null, NOW)).toBe('trial');
  });
  test('past_due maps to past_due (not active_paid)', () => {
    expect(classifyStatus('past_due', null, NOW)).toBe('past_due');
  });
  test('canceled within period → canceling_but_entitled', () => {
    const futureEnd = '2026-08-01';
    expect(classifyStatus('canceled', futureEnd, NOW)).toBe('canceling_but_entitled');
  });
  test('canceled past period → canceled', () => {
    const pastEnd = '2026-06-01';
    expect(classifyStatus('canceled', pastEnd, NOW)).toBe('canceled');
  });
  test('expired maps to expired', () => {
    expect(classifyStatus('expired', null, NOW)).toBe('expired');
  });
});

describe('First paid date resolution', () => {
  test('1. New Stripe customer pays today — first_paid_at from event', () => {
    const events = [mkSubEvent({ user_id: 'u1', ingested_at: '2026-07-13T00:00:00Z', event_type: 'invoice.payment_succeeded', amount_cents: 999 })];
    const result = resolveFirstPaidAt(events, null, null);
    expect(result.date).toBeTruthy();
    expect(result.confidence).toBe('confirmed');
    expect(result.source).toBe('subscription_event');
  });

  test('3. New Google Play customer pays today — from event with amount', () => {
    const events = [mkSubEvent({ provider: 'google', event_type: 'product_purchase', amount_cents: 1999, ingested_at: '2026-07-13T00:00:00Z' })];
    const result = resolveFirstPaidAt(events, null, null);
    expect(result.date).toBeTruthy();
    expect(result.confidence).toBe('confirmed');
  });

  test('14. Subscription has period_start but no started_at — uses period_start as inferred', () => {
    const acRow = { period_start: '2026-07-01' };
    const result = resolveFirstPaidAt([], null, acRow);
    expect(result.date).toBeTruthy();
    expect(result.confidence).toBe('inferred');
    expect(result.source).toBe('period_start_inferred');
  });

  test('15. Subscription fallback populates canonical_started_at from best source', () => {
    const sub = { started_at: '2026-06-15', subscriptionStartedAt: '2026-06-15', created_date: '2026-06-14' };
    const result = resolveFirstPaidAt([], sub, null);
    expect(result.date).toEqual(parseMetricDate('2026-06-15'));
    expect(result.confidence).toBe('confirmed');
  });

  test('21. A renewal does not overwrite first_paid_at', () => {
    const firstEvent = mkSubEvent({ ingested_at: '2026-01-01T00:00:00Z', period_start: '2026-01-01', amount_cents: 999 });
    const renewalEvent = mkSubEvent({ ingested_at: '2026-07-01T00:00:00Z', period_start: '2026-07-01', amount_cents: 999, event_type: 'invoice.payment_succeeded' });
    const result = resolveFirstPaidAt([renewalEvent, firstEvent], null, null);
    expect(result.date).toEqual(parseMetricDate('2026-01-01'));
  });

  test('12. Successful payment but missing amount — still counts as payment event by type', () => {
    const event = { event_type: 'invoice.payment_succeeded', amount_cents: 0, ingested_at: '2026-07-01', period_start: '2026-07-01' };
    expect(isPaymentEvent(event)).toBe(true);
  });

  test('13. Successful payment but missing interval — event still resolves first_paid_at', () => {
    const events = [{ event_type: 'invoice.payment_succeeded', amount_cents: 999, period_start: '2026-07-01', ingested_at: '2026-07-01' }];
    const result = resolveFirstPaidAt(events, {}, {});
    expect(result.date).toBeTruthy();
    // interval missing is a data-quality issue, not a reason to exclude
  });
});

describe('Identity resolution', () => {
  test('6. Matched by user_id', () => {
    const usersByEmail = new Map([['test@example.com', mkUser()]]);
    const usersById = new Map([['u1', mkUser()]]);
    const result = resolveUserIdentity({ user_id: 'u1', user_email: 'test@example.com' }, usersByEmail, usersById);
    expect(result.matched).toBe(true);
    expect(result.synthetic).toBe(false);
  });

  test('16. Unmatched subscription — synthetic identity', () => {
    const usersByEmail = new Map();
    const usersById = new Map();
    const result = resolveUserIdentity({ user_email: 'unknown@example.com' }, usersByEmail, usersById);
    expect(result.matched).toBe(false);
    expect(result.synthetic).toBe(true);
    expect(result.userId).toBe('email:unknown@example.com');
  });

  test('25. Synthetic identities do not inflate registered user counts', () => {
    const syntheticUser = mkUserRecord({ user_id: 'email:unknown@example.com', is_synthetic: true });
    const realUser = mkUserRecord({ user_id: 'u1', is_synthetic: false });
    const users = [mkUser()];
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([realUser, syntheticUser], [mkContract()], users, range, NOW, 0);
    expect(metrics.userActivity.totalRegisteredUsers).toBe(1);
    expect(metrics.dataQuality.syntheticIdentities).toBe(1);
  });
});

describe('Deduplication', () => {
  test('17. Duplicate provider records represent one contract', () => {
    const c1 = mkContract({ canonical_subscription_id: 'sub_1', provider_subscription_id: 'sub_1' });
    const c2 = mkContract({ canonical_subscription_id: 'sub_1_dup', provider_subscription_id: 'sub_1', first_paid_at: null });
    const { deduped, duplicatesMerged } = deduplicateContracts([c1, c2]);
    expect(deduped.length).toBe(1);
    expect(duplicatesMerged).toBe(1);
  });

  test('18. One user with subscriptions from two providers — not deduped', () => {
    const c1 = mkContract({ provider: 'stripe', provider_subscription_id: 'sub_stripe' });
    const c2 = mkContract({ provider: 'apple', provider_subscription_id: 'sub_apple', original_transaction_id: 'txn_123' });
    const { deduped } = deduplicateContracts([c1, c2]);
    expect(deduped.length).toBe(2);
  });
});

describe('Activity detection', () => {
  test('23. DailyUserMetrics activity correctly counts user as active', () => {
    const usersByEmail = new Map([['test@example.com', mkUser()]]);
    const metrics = [{ user_email: 'test@example.com', date: '2026-07-12', items_added: 1 }];
    const index = buildActivityIndex(metrics, usersByEmail);
    expect(index.has('u1')).toBe(true);
    const entry = index.get('u1');
    expect(entry.lastActivityAt).toBeTruthy();
  });

  test('22. Background updates do not count as real user activity', () => {
    // A metrics row with all zeros → not active
    expect(hasRealActivity({ curator_sessions: 0, items_added: 0, exports_generated: 0 })).toBe(false);
    // User.updated_date is never used; only DailyUserMetrics with real activity counts
    const usersByEmail = new Map([['test@example.com', mkUser()]]);
    const metrics = [{ user_email: 'test@example.com', date: '2026-07-12', curator_sessions: 0, items_added: 0 }];
    const index = buildActivityIndex(metrics, usersByEmail);
    expect(index.has('u1')).toBe(false);
  });
});

describe('Metric computation', () => {
  test('24. Free users calculated only from registered user accounts', () => {
    const freeUser = mkUserRecord({ user_id: 'u1', is_currently_paying: false, is_currently_entitled: false });
    const payingUser = mkUserRecord({ user_id: 'u2', is_currently_paying: true, is_currently_entitled: true });
    const users = [mkUser({ id: 'u1' }), mkUser({ id: 'u2', email: 'u2@example.com' })];
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([freeUser, payingUser], [mkContract({ userId: 'u2' })], users, range, NOW, 0);
    expect(metrics.userActivity.totalRegisteredUsers).toBe(2);
    expect(metrics.subscriptionStatus.currentPayingUsers).toBe(1);
  });

  test('4. User purchases two modules — one new paid user, two new subscriptions', () => {
    const user = mkUserRecord({ user_id: 'u1', first_paid_at: parseMetricDate('2026-07-10'), current_products: ['pipekeeper', 'whiskeykeeper'] });
    const c1 = mkContract({ canonical_subscription_id: 'sub_pk', userId: 'u1', first_paid_at: parseMetricDate('2026-07-10'), product: 'pipekeeper' });
    const c2 = mkContract({ canonical_subscription_id: 'sub_wk', userId: 'u1', first_paid_at: parseMetricDate('2026-07-10'), product: 'whiskeykeeper' });
    const users = [mkUser()];
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [c1, c2], users, range, NOW, 0);
    expect(metrics.acquisition.newFirstTimePaidUsers).toBe(1);
    expect(metrics.acquisition.newPaidSubscriptions).toBe(2);
  });

  test('5. User paid 60 days ago and canceled yesterday — still counted as historical new paid', () => {
    const user = mkUserRecord({
      user_id: 'u1',
      first_paid_at: parseMetricDate('2026-05-15'),
      is_currently_paying: false,
      is_currently_entitled: false,
      has_expired: true,
    });
    const range = resolveDateRange('90d', null, null, NOW);
    const metrics = computeMetrics([user], [mkContract({ userId: 'u1', first_paid_at: parseMetricDate('2026-05-15'), is_currently_paying: false, normalized_status: 'expired' })], [mkUser()], range, NOW, 0);
    expect(metrics.acquisition.newFirstTimePaidUsers).toBe(1);
    expect(metrics.subscriptionStatus.currentPayingUsers).toBe(0);
  });

  test('6. Monthly renewal does not count as newly paid again', () => {
    // first_paid_at is the original, not the renewal period_start
    const user = mkUserRecord({ user_id: 'u1', first_paid_at: parseMetricDate('2026-01-01') });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [mkContract({ userId: 'u1', first_paid_at: parseMetricDate('2026-01-01'), current_period_start: parseMetricDate('2026-07-01') })], [mkUser()], range, NOW, 0);
    // first_paid_at is Jan, not in last 30d → not a new paid user
    expect(metrics.acquisition.newFirstTimePaidUsers).toBe(0);
  });

  test('20. Canceled user remains in historical new-paid count', () => {
    const user = mkUserRecord({ user_id: 'u1', first_paid_at: parseMetricDate('2026-07-10'), is_currently_paying: false, has_expired: true });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [mkContract({ userId: 'u1', first_paid_at: parseMetricDate('2026-07-10'), is_currently_paying: false, normalized_status: 'canceled' })], [mkUser()], range, NOW, 0);
    expect(metrics.acquisition.newFirstTimePaidUsers).toBe(1);
  });

  test('8. Currently trialing without payment — not a paying user', () => {
    const user = mkUserRecord({ user_id: 'u1', is_currently_paying: false, is_trial: true, is_currently_entitled: true, has_ever_paid: false });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [mkContract({ userId: 'u1', normalized_status: 'trial', is_currently_paying: false, is_currently_entitled: true })], [mkUser()], range, NOW, 0);
    expect(metrics.subscriptionStatus.currentPayingUsers).toBe(0);
    expect(metrics.subscriptionStatus.currentTrials).toBe(1);
  });

  test('9. Past due — not counted as paying', () => {
    const user = mkUserRecord({ user_id: 'u1', is_currently_paying: false, is_past_due: true, is_currently_entitled: true });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [mkContract({ userId: 'u1', normalized_status: 'past_due', is_currently_paying: false })], [mkUser()], range, NOW, 0);
    expect(metrics.subscriptionStatus.currentPayingUsers).toBe(0);
    expect(metrics.subscriptionStatus.currentPastDue).toBe(1);
  });

  test('11. Referral-earned access — entitled but not paying', () => {
    const user = mkUserRecord({ user_id: 'u1', is_currently_paying: false, is_currently_entitled: true, is_referral_access: true, has_ever_paid: false });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [], [mkUser()], range, NOW, 0);
    expect(metrics.subscriptionStatus.currentPayingUsers).toBe(0);
    expect(metrics.subscriptionStatus.currentEntitledUsers).toBe(1);
  });

  test('2. New Apple customer pays today', () => {
    const events = [{ event_type: 'SUBSCRIBED', provider: 'apple', amount_cents: 999, original_transaction_id: 'orig_1', ingested_at: '2026-07-13T00:00:00Z', period_start: '2026-07-13' }];
    const result = resolveFirstPaidAt(events, { original_transaction_id: 'orig_1' }, null);
    expect(result.date).toBeTruthy();
    expect(result.confidence).toBe('confirmed');
  });

  test('7. Reactivation after expiration', () => {
    const user = mkUserRecord({
      user_id: 'u1',
      first_paid_at: parseMetricDate('2026-01-01'),
      reactivated_at: parseMetricDate('2026-07-10'),
      has_ever_paid: true,
      is_currently_paying: true,
    });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [], [mkUser()], range, NOW, 0);
    expect(metrics.acquisition.reactivatedPaidUsers).toBe(1);
    // reactivation is not a first-time paid user (their first_paid_at is earlier)
    const range90d = resolveDateRange('90d', null, null, NOW);
    const metrics90 = computeMetrics([user], [], [mkUser()], range90d, NOW, 0);
    expect(metrics90.acquisition.newFirstTimePaidUsers).toBe(0);
  });

  test('19. Account created months before first payment', () => {
    const user = mkUserRecord({ user_id: 'u1', created_at: parseMetricDate('2025-06-01'), first_paid_at: parseMetricDate('2026-07-10') });
    const range = resolveDateRange('30d', null, null, NOW);
    const metrics = computeMetrics([user], [mkContract({ userId: 'u1', first_paid_at: parseMetricDate('2026-07-10') })], [mkUser({ created_date: '2025-06-01' })], range, NOW, 0);
    expect(metrics.userActivity.totalRegisteredUsers).toBe(1);
    // newRegisteredUsers uses created_date, not first_paid_at
    expect(metrics.userActivity.newRegisteredUsers).toBe(0);
    expect(metrics.acquisition.newFirstTimePaidUsers).toBe(1);
  });
});

describe('Date range resolution', () => {
  test('prior_month resolves correctly', () => {
    const range = resolveDateRange('prior_month', null, null, NOW);
    expect(range.start.getUTCMonth()).toBe(5); // June
    expect(range.end.getUTCMonth()).toBe(5);
  });

  test('custom range uses provided dates', () => {
    const range = resolveDateRange('custom', '2026-06-01', '2026-06-30', NOW);
    expect(range.start.getUTCMonth()).toBe(5);
    expect(range.end.getUTCMonth()).toBe(5);
  });
});

describe('Event classification', () => {
  test('cancel events detected', () => {
    expect(isCancelEvent({ event_type: 'customer.subscription.deleted' })).toBe(true);
    expect(isCancelEvent({ event_type: 'invoice.payment_succeeded' })).toBe(false);
  });

  test('expire events detected', () => {
    expect(isExpireEvent({ event_type: 'subscription_expired' })).toBe(true);
  });

  test('refund events excluded from payment', () => {
    expect(isPaymentEvent({ event_type: 'charge.refunded', amount_cents: 999 })).toBe(false);
  });
});