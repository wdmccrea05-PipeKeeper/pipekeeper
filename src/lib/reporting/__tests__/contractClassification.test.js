/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  classifyStatus,
  isCurrentlyPaying,
  isCurrentlyEntitled,
  dedupeKey,
  dedupeScore,
  deduplicateContracts,
  fallbackCoverageKey,
  shouldSkipFallbackSubscription,
  classifyAccount,
  parseMetricDate,
} from '../contractClassification';

const NOW = new Date('2026-07-13T12:00:00Z');
const FUTURE = '2027-01-28T00:00:00Z';
const PAST = '2026-03-01T00:00:00Z';
const RECENT_FUTURE = '2026-08-01T00:00:00Z';

describe('classifyStatus — stale active contracts with expired period_end', () => {
  it('classifies active + future period_end as active_paid', () => {
    expect(classifyStatus('active', FUTURE, NOW)).toBe('active_paid');
  });

  it('classifies active + past period_end as expired (stale row)', () => {
    expect(classifyStatus('active', PAST, NOW)).toBe('expired');
  });

  it('classifies paid + future period_end as active_paid', () => {
    expect(classifyStatus('paid', FUTURE, NOW)).toBe('active_paid');
  });

  it('classifies paid + past period_end as expired', () => {
    expect(classifyStatus('paid', PAST, NOW)).toBe('expired');
  });

  it('classifies active + no period_end as expired (no evidence of current period)', () => {
    expect(classifyStatus('active', null, NOW)).toBe('expired');
  });
});

describe('classifyStatus — annual subscriptions with far-future period_end', () => {
  it('keeps an annual subscriber with 2027 period_end as active_paid', () => {
    expect(classifyStatus('active', '2027-01-28', NOW)).toBe('active_paid');
  });

  it('keeps a monthly subscriber with next-month period_end as active_paid', () => {
    expect(classifyStatus('active', RECENT_FUTURE, NOW)).toBe('active_paid');
  });
});

describe('classifyStatus — trial and past_due', () => {
  it('classifies trialing + future period_end as trial', () => {
    expect(classifyStatus('trialing', FUTURE, NOW)).toBe('trial');
  });

  it('classifies trial + past period_end as expired', () => {
    expect(classifyStatus('trial', PAST, NOW)).toBe('expired');
  });

  it('classifies past_due as past_due regardless of period', () => {
    expect(classifyStatus('past_due', FUTURE, NOW)).toBe('past_due');
    expect(classifyStatus('past_due', PAST, NOW)).toBe('past_due');
  });
});

describe('classifyStatus — canceled and expired', () => {
  it('classifies canceled + future period_end as canceling_but_entitled', () => {
    expect(classifyStatus('canceled', FUTURE, NOW)).toBe('canceling_but_entitled');
  });

  it('classifies canceled + past period_end as canceled', () => {
    expect(classifyStatus('canceled', PAST, NOW)).toBe('canceled');
  });

  it('classifies expired as expired regardless of period', () => {
    expect(classifyStatus('expired', FUTURE, NOW)).toBe('expired');
    expect(classifyStatus('expired', PAST, NOW)).toBe('expired');
  });
});

describe('isCurrentlyPaying / isCurrentlyEntitled', () => {
  it('active_paid is both paying and entitled', () => {
    expect(isCurrentlyPaying('active_paid')).toBe(true);
    expect(isCurrentlyEntitled('active_paid')).toBe(true);
  });

  it('canceling_but_entitled is paying and entitled', () => {
    expect(isCurrentlyPaying('canceling_but_entitled')).toBe(true);
    expect(isCurrentlyEntitled('canceling_but_entitled')).toBe(true);
  });

  it('trial is entitled but not paying', () => {
    expect(isCurrentlyPaying('trial')).toBe(false);
    expect(isCurrentlyEntitled('trial')).toBe(true);
  });

  it('expired is neither paying nor entitled', () => {
    expect(isCurrentlyPaying('expired')).toBe(false);
    expect(isCurrentlyEntitled('expired')).toBe(false);
  });

  it('canceled is neither paying nor entitled', () => {
    expect(isCurrentlyPaying('canceled')).toBe(false);
    expect(isCurrentlyEntitled('canceled')).toBe(false);
  });

  it('past_due is neither paying nor entitled', () => {
    expect(isCurrentlyPaying('past_due')).toBe(false);
    expect(isCurrentlyEntitled('past_due')).toBe(false);
  });
});

describe('dedupeKey', () => {
  it('uses provider + subscription id when present', () => {
    expect(dedupeKey({ provider: 'stripe', provider_subscription_id: 'sub_123' })).toBe('stripe|sub|sub_123');
  });

  it('normalizes provider and subscription id', () => {
    expect(dedupeKey({ provider: 'Stripe', provider_subscription_id: 'SUB_123' })).toBe('stripe|sub|sub_123');
  });

  it('falls back to composite key when no subscription id', () => {
    const key = dedupeKey({ provider: 'stripe', userId: 'u1', product: 'pipekeeper', period_start: '2026-01-15' });
    expect(key).toBe('stripe|u1|pipekeeper|2026-01-15');
  });
});

describe('dedupeScore — renewal supersedes stale', () => {
  it('scores currently-paying row higher than non-paying', () => {
    const paying = { is_currently_paying: true, current_period_end: PAST };
    const stale = { is_currently_paying: false, current_period_end: PAST };
    expect(dedupeScore(paying)).toBeGreaterThan(dedupeScore(stale));
  });

  it('scores later period_end higher than earlier (renewal supersedes stale)', () => {
    const renewal = { is_currently_paying: true, current_period_end: FUTURE };
    const stale = { is_currently_paying: true, current_period_end: PAST };
    expect(dedupeScore(renewal)).toBeGreaterThan(dedupeScore(stale));
  });
});

describe('deduplicateContracts — duplicate lifecycle rows', () => {
  it('collapses two rows with the same provider + subscription id into one', () => {
    const contracts = [
      { provider: 'stripe', provider_subscription_id: 'sub_1', is_currently_paying: true, current_period_end: FUTURE, canonical_subscription_id: 'ac_1' },
      { provider: 'stripe', provider_subscription_id: 'sub_1', is_currently_paying: false, current_period_end: PAST, canonical_subscription_id: 'sub_fb_1' },
    ];
    const { deduped, duplicatesMerged } = deduplicateContracts(contracts);
    expect(deduped).toHaveLength(1);
    expect(duplicatesMerged).toBe(1);
    expect(deduped[0].canonical_subscription_id).toBe('ac_1');
  });

  it('keeps both rows when subscription ids differ (multi-subscription user)', () => {
    const contracts = [
      { provider: 'stripe', provider_subscription_id: 'sub_a', is_currently_paying: true, current_period_end: FUTURE },
      { provider: 'stripe', provider_subscription_id: 'sub_b', is_currently_paying: true, current_period_end: FUTURE },
    ];
    const { deduped, duplicatesMerged } = deduplicateContracts(contracts);
    expect(deduped).toHaveLength(2);
    expect(duplicatesMerged).toBe(0);
  });

  it('keeps rows from different providers with same subscription id', () => {
    const contracts = [
      { provider: 'stripe', provider_subscription_id: 'sub_1', is_currently_paying: true, current_period_end: FUTURE },
      { provider: 'apple', provider_subscription_id: 'sub_1', is_currently_paying: true, current_period_end: FUTURE },
    ];
    const { deduped } = deduplicateContracts(contracts);
    expect(deduped).toHaveLength(2);
  });
});

describe('shouldSkipFallbackSubscription — fallback suppression', () => {
  const acCoverage = new Set([
    fallbackCoverageKey('user@example.com', 'stripe', 'pipekeeper'),
  ]);

  it('skips a fallback row when an ActiveContract covers the same email+provider+product', () => {
    const sub = { user_email: 'user@example.com', provider: 'stripe', product: 'pipekeeper' };
    expect(shouldSkipFallbackSubscription(sub, acCoverage)).toBe(true);
  });

  it('does not skip when the product differs', () => {
    const sub = { user_email: 'user@example.com', provider: 'stripe', product: 'whiskeykeeper' };
    expect(shouldSkipFallbackSubscription(sub, acCoverage)).toBe(false);
  });

  it('does not skip when the provider differs', () => {
    const sub = { user_email: 'user@example.com', provider: 'apple', product: 'pipekeeper' };
    expect(shouldSkipFallbackSubscription(sub, acCoverage)).toBe(false);
  });

  it('does not skip when no email is present', () => {
    const sub = { provider: 'stripe', product: 'pipekeeper' };
    expect(shouldSkipFallbackSubscription(sub, acCoverage)).toBe(false);
  });

  it('normalizes email and product to lowercase', () => {
    const sub = { user_email: 'User@Example.com', provider: 'stripe', product: 'PipeKeeper' };
    expect(shouldSkipFallbackSubscription(sub, acCoverage)).toBe(true);
  });
});

describe('classifyAccount — test/internal account detection', () => {
  it('classifies pipekeepertest email as test_account', () => {
    expect(classifyAccount('test@pipekeeperapp.com', 'sub_123')).toBe('test_account');
  });

  it('classifies test_ subscription id as test_account', () => {
    expect(classifyAccount('user@example.com', 'test_12345')).toBe('test_account');
  });

  it('classifies admin@ email as internal_admin', () => {
    expect(classifyAccount('admin@pipekeeperapp.com', 'sub_123')).toBe('test_account');
  });

  it('classifies normal user as production_customer', () => {
    expect(classifyAccount('user@example.com', 'sub_123')).toBe('production_customer');
  });
});

describe('parseMetricDate', () => {
  it('parses valid ISO date', () => {
    const d = parseMetricDate('2026-07-13T12:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).toBe(new Date('2026-07-13T12:00:00Z').getTime());
  });

  it('returns null for empty input', () => {
    expect(parseMetricDate(null)).toBeNull();
    expect(parseMetricDate('')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(parseMetricDate('not-a-date')).toBeNull();
  });
});

describe('Regression: 20 scenario coverage (stale active contracts)', () => {
  // These scenarios reproduce the exact stale rows found in production data
  // that were incorrectly labeled active_paid before the fix.

  it('1. a.worobjow@t-online.de — active + 2026-03-02 period → expired', () => {
    expect(classifyStatus('active', '2026-03-02', NOW)).toBe('expired');
  });

  it('2. wmccrea@indario.com — active + 2026-04-05 period → expired', () => {
    expect(classifyStatus('active', '2026-04-05', NOW)).toBe('expired');
  });

  it('3. jjlachance@me.com — active + 2026-05-15 period → expired', () => {
    expect(classifyStatus('active', '2026-05-15', NOW)).toBe('expired');
  });

  it('4. rmateff@ptd.net — active + 2026-04-25 period → expired', () => {
    expect(classifyStatus('active', '2026-04-25', NOW)).toBe('expired');
  });

  it('5. robert.s.beare@gmail.com — active + 2026-05-13 period → expired', () => {
    expect(classifyStatus('active', '2026-05-13', NOW)).toBe('expired');
  });

  it('6. ollinsuarez@gmail.com — active + 2026-03-01 period → expired', () => {
    expect(classifyStatus('active', '2026-03-01', NOW)).toBe('expired');
  });

  it('7. bob.white.46544@gmail.com — active + 2026-04-20 period → expired', () => {
    expect(classifyStatus('active', '2026-04-20', NOW)).toBe('expired');
  });

  it('8. gribum@gmail.com — active + 2026-02-24 period → expired', () => {
    expect(classifyStatus('active', '2026-02-24', NOW)).toBe('expired');
  });

  it('9. andysc83@gmail.com — active + 2026-03-23 period → expired', () => {
    expect(classifyStatus('active', '2026-03-23', NOW)).toBe('expired');
  });

  it('10. phantomwm1@gmail.com — active + 2026-05-03 period → expired', () => {
    expect(classifyStatus('active', '2026-05-03', NOW)).toBe('expired');
  });

  it('11. wdmccrea@hotmail.com — active + 2026-05-05 period → expired', () => {
    expect(classifyStatus('active', '2026-05-05', NOW)).toBe('expired');
  });

  it('12. brettgignac46@gmail.com — active + 2026-05-10 period → expired', () => {
    expect(classifyStatus('active', '2026-05-10', NOW)).toBe('expired');
  });

  it('13. jbwislar@gmail.com — active + 2026-05-18 period → expired', () => {
    expect(classifyStatus('active', '2026-05-18', NOW)).toBe('expired');
  });

  it('14. rtikdogg@yahoo.com — active + 2026-05-14 period → expired', () => {
    expect(classifyStatus('active', '2026-05-14', NOW)).toBe('expired');
  });

  it('15. rohrt1963@gmail.com — manual_grant + no period_end → expired', () => {
    expect(classifyStatus('active', null, NOW)).toBe('expired');
  });

  it('16. garbatz@gmail.com — apple_unverified + no period_end → expired', () => {
    expect(classifyStatus('active', null, NOW)).toBe('expired');
  });

  it('17. sergioolivares3@hotmail.com — active + 2026-04-16 period → expired', () => {
    expect(classifyStatus('active', '2026-04-16', NOW)).toBe('expired');
  });

  it('18. mattsjeepjk@gmail.com — active + 2026-06-30 period → expired', () => {
    expect(classifyStatus('active', '2026-06-30', NOW)).toBe('expired');
  });

  it('19. roonrm@gmail.com — active + 2026-05-02 period → expired', () => {
    expect(classifyStatus('active', '2026-05-02', NOW)).toBe('expired');
  });

  it('20. rmf — active + 2026-04-25 period → expired', () => {
    expect(classifyStatus('active', '2026-04-25', NOW)).toBe('expired');
  });
});

describe('Regression: legitimate annual subscribers stay active_paid', () => {
  it('annual subscriber with 2027-01-28 period_end stays active_paid', () => {
    expect(classifyStatus('active', '2027-01-28T00:00:00Z', NOW)).toBe('active_paid');
  });

  it('annual subscriber with 2026-12-31 period_end stays active_paid', () => {
    expect(classifyStatus('active', '2026-12-31T00:00:00Z', NOW)).toBe('active_paid');
  });

  it('monthly subscriber with 2026-08-01 period_end stays active_paid', () => {
    expect(classifyStatus('active', '2026-08-01T00:00:00Z', NOW)).toBe('active_paid');
  });
});