/* eslint-disable */
/**
 * Collector appreciation campaign — entitlement, eligibility and grant logic.
 *
 * Pure-logic coverage of the rules the campaign depends on. All timestamps are
 * relative to the run, so these assertions never go stale.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAppreciationGrant,
  resolveComplimentaryPro,
  APPRECIATION_GRANT_MS,
  APPRECIATION_CAMPAIGN_ID,
} from '../components/utils/appreciationGrant';
import { resolveProTrial } from '../components/utils/proTrial';
import { resolveModuleAccess, getCanonicalProModules } from '../components/utils/resolveModuleAccess';
import { getAccessSource, buildCanonicalEntitlements } from '../components/utils/premiumAccess';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const NOW = Date.now();

const ACTIVATED = new Date(NOW - 2 * DAY).toISOString();
const EXPIRES = new Date(NOW + 5 * DAY).toISOString();

// An account created long before the campaign.
const OLD_ACCOUNT = {
  id: 'u1',
  email: 'collector@example.com',
  role: 'user',
  created_date: new Date(NOW - 200 * DAY).toISOString(),
};

const GRANTED = {
  ...OLD_ACCOUNT,
  appreciation_campaign_id: APPRECIATION_CAMPAIGN_ID,
  appreciation_grant_activated_at: ACTIVATED,
  appreciation_grant_expires_at: EXPIRES,
  appreciation_grant_status: 'active',
};

const EXPIRED_GRANT = {
  ...OLD_ACCOUNT,
  appreciation_campaign_id: APPRECIATION_CAMPAIGN_ID,
  appreciation_grant_activated_at: new Date(NOW - 10 * DAY).toISOString(),
  appreciation_grant_expires_at: new Date(NOW - 3 * DAY).toISOString(),
  appreciation_grant_status: 'expired',
};

const ACTIVE_SUB = {
  id: 's1',
  user_email: 'paid@example.com',
  status: 'active',
  tier: 'pro',
  plan_key: 'pipekeeper_pro_monthly',
  modules_csv: 'pipekeeper',
  current_period_start: new Date(NOW - 10 * DAY).toISOString(),
  current_period_end: new Date(NOW + 20 * DAY).toISOString(),
};

const PAID = {
  id: 'p1',
  email: 'paid@example.com',
  role: 'user',
  created_date: new Date(NOW - 200 * DAY).toISOString(),
  has_paid_access: true,
  pipekeeper_paid: true,
  paid_modules_csv: 'pipekeeper',
};

describe('appreciation grant resolution', () => {
  it('is inactive and unknown without a grant', () => {
    const state = resolveAppreciationGrant(OLD_ACCOUNT);
    expect(state.active).toBe(false);
    expect(state.known).toBe(false);
  });

  it('is active for exactly 168 hours from the server activation time', () => {
    const state = resolveAppreciationGrant(GRANTED);
    expect(state.active).toBe(true);
    expect(state.endsAt).toBe(EXPIRES);
    expect(state.daysRemaining).toBe(5);
    expect(new Date(EXPIRES).getTime() - new Date(ACTIVATED).getTime()).toBe(168 * HOUR);
  });

  it('cannot be extended by editing the expiration stamp', () => {
    const tampered = { ...GRANTED, appreciation_grant_expires_at: '2030-01-01T00:00:00.000Z' };
    expect(resolveAppreciationGrant(tampered).endsAt).toBe(EXPIRES);
  });

  it('honours a shortened expiration', () => {
    const shortened = {
      ...GRANTED,
      appreciation_grant_expires_at: new Date(NOW - 1 * HOUR).toISOString(),
    };
    expect(resolveAppreciationGrant(shortened).active).toBe(false);
  });

  it('is revoked when the server marks it revoked', () => {
    const state = resolveAppreciationGrant({ ...GRANTED, appreciation_grant_status: 'revoked' });
    expect(state.active).toBe(false);
  });

  it('expires without touching the creation date or the welcome trial', () => {
    const state = resolveAppreciationGrant(EXPIRED_GRANT);
    expect(state.active).toBe(false);
    expect(state.expired).toBe(true);
    expect(EXPIRED_GRANT.created_date).toBe(OLD_ACCOUNT.created_date);
    expect(EXPIRED_GRANT.pro_trial_ends_at).toBeUndefined();
  });
});

describe('complimentary access composition', () => {
  it('reports the appreciation source when only the grant is active', () => {
    const complimentary = resolveComplimentaryPro(GRANTED);
    expect(complimentary.active).toBe(true);
    expect(complimentary.kind).toBe('appreciation');
  });

  it('keeps the welcome window for a new account', () => {
    const newUser = { ...OLD_ACCOUNT, created_date: new Date(NOW - 1 * DAY).toISOString() };
    expect(resolveComplimentaryPro(newUser).kind).toBe('welcome_trial');
  });

  it('uses whichever window ends later', () => {
    const both = { ...GRANTED, created_date: new Date(NOW - 2 * DAY).toISOString() };
    expect(resolveComplimentaryPro(both).kind).toBe('appreciation');
  });

  it('never reopens an expired welcome window when a grant is added', () => {
    const trial = resolveProTrial(GRANTED);
    expect(trial.active).toBe(false);
  });
});

describe('module access during the appreciation week', () => {
  const modules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

  it('unlocks all four modules with Pro capability', () => {
    for (const moduleKey of modules) {
      const decision = resolveModuleAccess(GRANTED, moduleKey, null);
      expect(decision.has_access).toBe(true);
      expect(decision.tier).toBe('pro');
      expect(decision.source_type).toBe('promotional_grant');
      expect(decision.complimentary_kind).toBe('appreciation');
    }
  });

  it('exposes every launched module through the canonical list', () => {
    expect(getCanonicalProModules(GRANTED, null).sort()).toEqual([...modules].sort());
  });

  it('removes free-tier limits and unlocks Pro capabilities while live', () => {
    const entitlements = buildCanonicalEntitlements(GRANTED, null);
    expect(entitlements.tier).toBe('pro');
    expect(entitlements.limits.pipes).toBe(Infinity);
    expect(entitlements.limits.bottles).toBe(Infinity);
    expect(entitlements.canUse('EXPORT_REPORTS')).toBe(true);
    expect(entitlements.accessSource).toBe('promotional');
  });

  it('returns to the free tier once the grant expires', () => {
    const decision = resolveModuleAccess(EXPIRED_GRANT, 'winekeeper', null);
    expect(decision.has_access).toBe(false);
    const entitlements = buildCanonicalEntitlements(EXPIRED_GRANT, null);
    expect(entitlements.tier).toBe('free');
    expect(entitlements.limits.pipes).toBe(5);
    expect(entitlements.canUse('EXPORT_REPORTS')).toBe(false);
    expect(entitlements.accessSource).toBe('free');
  });

  it('keeps the account free of any automatic paid state', () => {
    const entitlements = buildCanonicalEntitlements(GRANTED, null);
    expect(entitlements.paidTier).toBe('free');
    expect(entitlements.isProTrial).toBe(false);
    expect(entitlements.isPromotionalPro).toBe(true);
  });
});

describe('paid subscription protection', () => {
  it('keeps paid access in front of the promotional grant', () => {
    const paidWithGrant = { ...PAID, ...GRANTED, email: PAID.email, has_paid_access: true };
    const decision = resolveModuleAccess(paidWithGrant, 'pipekeeper', ACTIVE_SUB);
    expect(decision.source_type).toBe('paid_contract');
    expect(getAccessSource(paidWithGrant, ACTIVE_SUB)).toBe('paid');
  });

  it('does not report promotional access for a paying subscriber', () => {
    const paidWithGrant = { ...PAID, ...GRANTED, email: PAID.email };
    const entitlements = buildCanonicalEntitlements(paidWithGrant, ACTIVE_SUB);
    expect(entitlements.accessSource).toBe('paid');
    expect(entitlements.isPromotionalPro).toBe(false);
  });

  it('keeps a paid subscriber entitled after the promotional window ends', () => {
    const paidWithExpiredGrant = { ...PAID, ...EXPIRED_GRANT, email: PAID.email, has_paid_access: true };
    const decision = resolveModuleAccess(paidWithExpiredGrant, 'pipekeeper', ACTIVE_SUB);
    expect(decision.has_access).toBe(true);
    expect(decision.source_type).toBe('paid_contract');
  });
});

describe('idempotency and re-redemption rules (resolver contract)', () => {
  it('a redeemed grant resolves as the same single window on every read', () => {
    const first = resolveAppreciationGrant(GRANTED);
    const second = resolveAppreciationGrant(GRANTED);
    expect(second.endsAt).toBe(first.endsAt);
    expect(second.startedAt).toBe(first.startedAt);
  });

  it('an expired grant can never become active again', () => {
    expect(resolveAppreciationGrant(EXPIRED_GRANT).active).toBe(false);
  });

  it('an account with no grant is not eligible for the banner after redemption', () => {
    expect(resolveAppreciationGrant(EXPIRED_GRANT).known).toBe(true);
  });
});