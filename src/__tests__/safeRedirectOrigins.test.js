import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  areAllowedRedirectUrls,
  getConfiguredAppOrigin,
  getSafeRedirectOrigin,
  isAllowedRedirectUrl,
} from '../../base44/shared/safeRedirectOrigins.ts';

const read = (path) => readFileSync(path, 'utf8');

describe('safe payment redirect origins', () => {
  it('uses the configured app origin when the request origin is untrusted', () => {
    expect(getSafeRedirectOrigin('https://attacker.example', 'https://pipekeeper.app/Profile'))
      .toBe('https://pipekeeper.app');
  });

  it('accepts a specifically configured alternate app origin', () => {
    expect(getSafeRedirectOrigin(
      'https://preview.pipekeeper.app',
      'https://pipekeeper.app',
      'https://preview.pipekeeper.app',
    )).toBe('https://preview.pipekeeper.app');
  });

  it('falls back safely when the configured app URL is invalid', () => {
    expect(getConfiguredAppOrigin('javascript:alert(1)')).toBe('https://pipekeeper.app');
  });

  it('allows checkout URLs only when both share an allowed origin', () => {
    expect(areAllowedRedirectUrls(
      'https://pipekeeper.app/SubscriptionSuccess',
      'https://pipekeeper.app/Subscription',
      'https://pipekeeper.app',
    )).toBe(true);
    expect(areAllowedRedirectUrls(
      'https://attacker.example/finish',
      'https://attacker.example/cancel',
      'https://pipekeeper.app',
    )).toBe(false);
    expect(areAllowedRedirectUrls(
      'https://pipekeeper.app/finish',
      'https://preview.pipekeeper.app/cancel',
      'https://pipekeeper.app',
    )).toBe(false);
  });

  it('rejects unsafe schemes and credentials in portal return URLs', () => {
    expect(isAllowedRedirectUrl('javascript:alert(1)', 'https://pipekeeper.app')).toBe(false);
    expect(isAllowedRedirectUrl(
      'https://pipekeeper.app@attacker.example/finish',
      'https://pipekeeper.app',
    )).toBe(false);
    expect(isAllowedRedirectUrl('https://pipekeeper.app/Profile', 'https://pipekeeper.app')).toBe(true);
  });

  it('validates checkout return destinations before creating Stripe sessions', () => {
    for (const path of [
      'base44/functions/createCheckoutSession/entry.ts',
      'base44/functions/createModuleCheckoutSession/entry.ts',
    ]) {
      const source = read(path);
      const guard = source.indexOf('if (!areAllowedRedirectUrls(');
      const createSession = source.indexOf('stripe.checkout.sessions.create(');
      expect(guard).toBeGreaterThan(-1);
      expect(guard).toBeLessThan(createSession);
    }
  });

  it('uses the safe origin helper for checkout and billing portal redirects', () => {
    for (const path of [
      'base44/functions/createCheckoutSessionV2/entry.ts',
      'base44/functions/createBillingPortalSession/entry.ts',
    ]) {
      const source = read(path);
      expect(source).toContain('getSafeRedirectOrigin');
      expect(source).not.toMatch(/origin\.startsWith\(["']http/);
    }
  });

  it('validates both customer portal return URL entry points', () => {
    for (const [path, validation] of [
      ['base44/functions/createCustomerPortalSession/entry.ts', 'isAllowedRedirectUrl(requestedReturnUrl'],
      ['base44/functions/createCustomerPortalSessionForMe/entry.ts', 'isAllowedRedirectUrl(body.returnUrl'],
    ]) {
      const source = read(path);
      expect(source.indexOf(validation)).toBeGreaterThan(-1);
      expect(source.indexOf(validation)).toBeLessThan(source.indexOf('billingPortal.sessions.create('));
    }
  });
});
