import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const standard = readFileSync('base44/functions/createCheckoutSession/entry.ts', 'utf8');
const moduleCheckout = readFileSync('base44/functions/createModuleCheckoutSession/entry.ts', 'utf8');
const verifiedPipeAnnual = 'price_1SsDU6DycvQWC88PIwpmt7Oc';

describe('Subscription checkout safety regression gate', () => {
  it('keeps the verified PipeKeeper annual Stripe price aligned with the client', () => {
    const mapping = standard.split('\n').find(line => line.includes("'pipekeeper_pro_annual':"));
    expect(mapping).toBeDefined();
    expect(mapping).toContain(verifiedPipeAnnual);
    expect(readFileSync('src/components/subscription/stripeConfig.jsx', 'utf8')).toContain(verifiedPipeAnnual);
  });

  for (const [name, source] of [['standard', standard], ['module', moduleCheckout]]) {
    it(`${name} checkout validates the live Stripe price before session creation`, () => {
      const retrieve = source.indexOf('stripe.prices.retrieve(priceId)');
      const active = source.indexOf('!stripePrice.active') >= 0 ? source.indexOf('!stripePrice.active') : source.indexOf('!verifiedPrice.active');
      const recurring = source.indexOf("type !== 'recurring'");
      const interval = source.indexOf('recurring?.interval !== expectedInterval');
      const checkout = source.indexOf('stripe.checkout.sessions.create(');
      expect(retrieve).toBeGreaterThan(-1);
      expect(active).toBeGreaterThan(retrieve);
      expect(recurring).toBeGreaterThan(retrieve);
      expect(interval).toBeGreaterThan(retrieve);
      expect(checkout).toBeGreaterThan(interval);
      // The guard must reject invalid prices before Stripe checkout is called.
      const guardedRegion = source.slice(retrieve, checkout);
      expect(guardedRegion).toMatch(/return Response\.json\(/);
      expect(guardedRegion).toMatch(/status:\s*(409|503)/);
      expect(guardedRegion).toMatch(/\.type\s*!==\s*'recurring'/);
      expect(guardedRegion).toMatch(/\.recurring\?\.interval\s*!==\s*expectedInterval/);
    });
  }
});
