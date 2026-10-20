import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { translate } from '@/components/i18n/index.jsx';

const handler = readFileSync('base44/functions/createModuleCheckoutSession/entry.ts', 'utf8');
describe('checkout duplicate protection fails closed', () => {
  it('never proceeds to checkout after duplicate guard lookup fails', () => {
    expect(handler).toContain("code: 'SUBSCRIPTION_VERIFICATION_UNAVAILABLE'");
    expect(handler).toContain('status: 503');
    expect(handler).toContain('Duplicate guard check failed; refusing checkout');
    expect(handler).not.toContain('Duplicate guard check failed (non-blocking)');
    expect(handler.indexOf("code: 'SUBSCRIPTION_VERIFICATION_UNAVAILABLE'")).toBeLessThan(handler.indexOf('stripe.checkout.sessions.create'));
  });
  it('rejects customer lookup failures instead of continuing', () => {
    expect(handler).toContain('Subscription lookup by user_id failed; refusing checkout');
    expect(handler).toContain('Subscription lookup by email failed; refusing checkout');
    expect(handler).toContain("throw new Error('Unable to verify existing subscriptions.");
  });
  it('translates four-module plan scope in supported languages', () => {
    for (const lang of ['en', 'es', 'fr', 'de', 'ja', 'pl']) {
      const message = translate('subscription.fourModuleBundleDescription', {}, lang);
      expect(message).toContain('WineKeeper');
      expect(message).toContain('CigarKeeper');
    }
  });
});
