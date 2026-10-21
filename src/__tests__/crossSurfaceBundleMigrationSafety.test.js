import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
describe('bundle migration safety across all checkout surfaces', () => {
  it('paywall cannot cancel subscriptions before replacement checkout', () => {
    const src = read('src/components/paywalls/PaywallModal.jsx');
    expect(src).not.toContain('handleBundleUpgrade');
    expect(src).not.toContain('cancelableIds');
    expect(src).toContain("selectedOption.actionType === 'upgrade_existing'");
    expect(src).toContain("setError(t('subscription.bundleMigrationRequired'))");
  });
  it('shared checkout handler blocks direct upgrade intent', () => {
    const src = read('src/components/subscription/subscriptionHandler.jsx');
    expect(src).toContain("if (actionType === 'upgrade_existing')");
    expect(src.indexOf("if (actionType === 'upgrade_existing')")).toBeLessThan(src.indexOf("base44.functions.invoke('createCheckoutSession'"));
  });
  it('server rejects upgrade checkout even if the client bypasses the UI', () => {
    const src = read('base44/functions/createCheckoutSession/entry.ts');
    expect(src).toContain("code: 'SAFE_UPGRADE_REQUIRED'");
    expect(src.indexOf("code: 'SAFE_UPGRADE_REQUIRED'")).toBeLessThan(src.indexOf('stripe.checkout.sessions.create'));
  });
});
