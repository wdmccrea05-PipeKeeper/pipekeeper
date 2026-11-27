/* eslint-disable */
/**
 * Structural regression guard for the 7-day complimentary Pro program.
 *
 * The window itself is unit-tested in proTrialEntitlement.test.js. This file
 * protects the WIRING, which is what silently broke before: a resolver that
 * exists but is never consulted by the gate that actually decides access.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('complimentary Pro — wiring guard', () => {
  it('backend resolver uses a 168-hour window', () => {
    const src = read('base44/shared/proTrial.ts');
    expect(src).toContain('PRO_TRIAL_HOURS = 168');
    expect(src).toContain('export function resolveProTrial');
  });

  it('account creation stamps the window once and never re-stamps', () => {
    const src = read('base44/functions/ensureUserRecord/entry.ts');
    expect(src).toContain('pro_trial_started_at');
    expect(src).toContain('pro_trial_ends_at');
    // Backfill is guarded so an existing window (including an expired one) is kept.
    expect(src).toMatch(/if \(!existing\.pro_trial_ends_at\)/);
  });

  it('the backend gate accepts the complimentary window before paid checks', () => {
    const src = read('base44/functions/_auth/requireEntitlement/entry.ts');
    expect(src).toContain('resolveProTrial');
    const trialIndex = src.indexOf('resolveProTrial(account)');
    const paidIndex = src.indexOf('subscriptionGrantsPaidAccess(s)');
    expect(trialIndex).toBeGreaterThan(-1);
    expect(trialIndex).toBeLessThan(paidIndex);
  });

  it('module access, limits and capabilities resolve through the canonical resolver', () => {
    const access = read('src/components/utils/resolveModuleAccess.jsx');
    const premium = read('src/components/utils/premiumAccess.jsx');
    expect(access).toContain('resolveComplimentaryPro');
    expect(premium).toContain('resolveProTrial');
    expect(premium).toContain('resolveComplimentaryPro');
    expect(premium).toContain('buildCanonicalEntitlements');
  });

  it('the backend gate also accepts a server-issued appreciation grant', () => {
    const src = read('base44/functions/_auth/requireEntitlement/entry.ts');
    expect(src).toContain('AppreciationGrant');
    expect(src).toContain('resolveGrantState');
    const grantIndex = src.indexOf('resolveGrantState(grant)');
    const paidIndex = src.indexOf('subscriptionGrantsPaidAccess(s)');
    expect(grantIndex).toBeGreaterThan(-1);
    expect(grantIndex).toBeLessThan(paidIndex);
  });

  it('the appreciation campaign surfaces are mounted where collectors look', () => {
    expect(read('src/pages/CollectionHub.jsx')).toContain('AppreciationBanner');
    expect(read('src/components/modules/ModulePageShell.jsx')).toContain('AppreciationOfferCard');
    expect(read('src/pages/Profile.jsx')).toContain('AppreciationOfferCard');
    expect(read('src/pages/Subscription.jsx')).toContain('AppreciationOfferCard');
    expect(read('src/Layout.jsx')).toContain('AppreciationNotificationCenter');
  });

  it('the entitlement hook delegates to the canonical resolver', () => {
    const hook = read('src/components/hooks/useEntitlements.jsx');
    expect(hook).toContain('buildCanonicalEntitlements');
  });

  it('the complimentary access banner is mounted on the hub and every module shell', () => {
    expect(read('src/pages/CollectionHub.jsx')).toContain('ComplimentaryProBanner');
    expect(read('src/components/modules/ModulePageShell.jsx')).toContain('ComplimentaryProBanner');
  });
});