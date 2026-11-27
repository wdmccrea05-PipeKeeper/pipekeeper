/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { resolveProTrial, PRO_TRIAL_MS, getProTrialWindow } from '@/components/utils/proTrial';
import {
  getAccessSource,
  hasProAccess,
  hasPaidAccess,
  buildCanonicalEntitlements,
} from '@/components/utils/premiumAccess';
import { resolveModuleAccess } from '@/components/utils/resolveModuleAccess';
import { buildAccessSummary } from '@/components/access/accessSummary';

const MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
const NOW = new Date('2026-11-27T12:00:00.000Z').getTime();
const iso = (ms) => new Date(ms).toISOString();

function newAccount(overrides = {}) {
  return {
    id: 'u1',
    email: 'new@collector.test',
    role: 'user',
    created_date: iso(NOW - 24 * 3600 * 1000), // registered one day ago
    pro_trial_started_at: iso(NOW - 24 * 3600 * 1000),
    pro_trial_ends_at: iso(NOW - 24 * 3600 * 1000 + PRO_TRIAL_MS),
    ...overrides,
  };
}

const activeSub = {
  status: 'active',
  provider: 'stripe',
  provider_subscription_id: 'sub_live_1',
  plan_key: 'pipekeeper_pro_monthly',
  modules_csv: 'pipekeeper',
  current_period_end: iso(NOW + 20 * 24 * 3600 * 1000),
};

describe('complimentary Pro access', () => {
  it('gives a newly registered account seven days (168h)', () => {
    const user = newAccount();
    const trial = resolveProTrial(user, NOW);
    expect(trial.active).toBe(true);
    expect(new Date(trial.endsAt).getTime() - new Date(trial.startedAt).getTime()).toBe(PRO_TRIAL_MS);
    expect(PRO_TRIAL_MS).toBe(168 * 3600 * 1000);
  });

  it('grants Pro across every module without a subscription', () => {
    const user = newAccount();
    expect(getAccessSource(user, null)).toBe('trial');
    expect(hasProAccess(user, null)).toBe(true);
    expect(hasPaidAccess(user, null)).toBe(false);
    for (const moduleKey of MODULES) {
      expect(resolveModuleAccess(user, moduleKey, null).has_access).toBe(true);
      expect(resolveModuleAccess(user, moduleKey, null).source_type).toBe('trial');
    }
  });

  it('removes free-tier limits and unlocks Pro features during the window', () => {
    const entitlements = buildCanonicalEntitlements(newAccount(), null);
    expect(entitlements.hasPro).toBe(true);
    expect(entitlements.limits.pipes).toBe(Infinity);
    expect(entitlements.limits.bottles).toBe(Infinity);
    expect(entitlements.canUse('EXPORT_REPORTS')).toBe(true);
    expect(entitlements.paidModules.sort()).toEqual([...MODULES].sort());
  });

  it('reports the window in the access summary with all modules', () => {
    const summary = buildAccessSummary(newAccount(), null);
    expect(summary.tier).toBe('pro');
    expect(summary.isProTrial).toBe(true);
    expect(summary.activeModules.sort()).toEqual([...MODULES].sort());
  });

  it('expires at exactly 168 hours', () => {
    const user = newAccount();
    const endsAt = new Date(user.pro_trial_ends_at).getTime();
    expect(resolveProTrial(user, endsAt - 1000).active).toBe(true);
    expect(resolveProTrial(user, endsAt).active).toBe(false);
    expect(resolveProTrial(user, endsAt + 1).expired).toBe(true);
  });

  it('never restarts for an expired account and keeps it on the free tier', () => {
    const oldUser = {
      id: 'u2',
      email: 'old@collector.test',
      role: 'user',
      created_date: iso(NOW - 60 * 24 * 3600 * 1000),
    };
    expect(resolveProTrial(oldUser, NOW).active).toBe(false);
    expect(getAccessSource(oldUser, null)).toBe('free');
    expect(hasProAccess(oldUser, null)).toBe(false);
    expect(resolveModuleAccess(oldUser, 'pipekeeper', null).has_access).toBe(false);
  });

  it('keeps the original expiration when the profile is updated', () => {
    const user = newAccount({ updated_date: iso(NOW), last_login: iso(NOW) });
    expect(resolveProTrial(user, NOW).endsAt).toBe(user.pro_trial_ends_at);
    expect(getProTrialWindow(user).source).toBe('account');
  });

  it('is timezone independent (absolute UTC instants)', () => {
    const created = iso(NOW);
    const user = { created_date: created };
    const window = getProTrialWindow(user);
    expect(window.endsAt).toBe(new Date(new Date(created).getTime() + PRO_TRIAL_MS).toISOString());
    expect(resolveProTrial(user, NOW).msRemaining).toBe(PRO_TRIAL_MS);
  });

  it('lets a paid subscription take precedence over the complimentary window', () => {
    const user = newAccount();
    expect(getAccessSource(user, activeSub)).toBe('paid');
    expect(hasPaidAccess(user, activeSub)).toBe(true);
    const decision = resolveModuleAccess(user, 'pipekeeper', activeSub);
    expect(decision.source_type).toBe('paid_contract');
  });

  it('keeps paid access after the original trial expiration', () => {
    const user = newAccount();
    const afterTrial = new Date(user.pro_trial_ends_at).getTime() + 86400000;
    expect(resolveProTrial(user, afterTrial).active).toBe(false);
    expect(hasProAccess(user, activeSub)).toBe(true);
  });

  it('restores Pro access when a user subscribes after expiry', () => {
    const expired = {
      created_date: iso(NOW - 40 * 24 * 3600 * 1000),
      pro_trial_started_at: iso(NOW - 40 * 24 * 3600 * 1000),
      pro_trial_ends_at: iso(NOW - 33 * 24 * 3600 * 1000),
    };
    expect(hasProAccess(expired, null)).toBe(false);
    expect(hasProAccess(expired, activeSub)).toBe(true);
  });

  it('falls back to complimentary access when a paid plan lapses mid-window', () => {
    const lapsed = { ...activeSub, status: 'canceled', current_period_end: iso(NOW - 3600 * 1000) };
    const user = newAccount();
    expect(hasPaidAccess(user, lapsed)).toBe(false);
    expect(resolveModuleAccess(user, 'winekeeper', lapsed).source_type).toBe('trial');
  });

  it('does not grant access when the account has no creation date at all', () => {
    const unknown = { id: 'u3', email: 'unknown@collector.test', role: 'user' };
    const trial = resolveProTrial(unknown, NOW);
    expect(trial.known).toBe(false);
    expect(trial.active).toBe(false);
    expect(getAccessSource(unknown, null)).toBe('free');
  });
});