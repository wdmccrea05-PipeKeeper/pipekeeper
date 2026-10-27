import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const standard = readFileSync('base44/functions/createCheckoutSession/entry.ts', 'utf8');
const moduleCheckout = readFileSync('base44/functions/createModuleCheckoutSession/entry.ts', 'utf8');
const archivedPipeAnnual = 'price_1SsDU6DycvQWC88PIwpmt7Oc';

describe('Subscription checkout safety regression gate', () => {
  it('never uses the archived PipeKeeper annual price as a checkout fallback', () => {
    const mapping = standard.split('\n').find(line => line.includes("'pipekeeper_pro_annual':"));
    expect(mapping).toBeDefined();
    expect(mapping).not.toContain(archivedPipeAnnual);
    expect(mapping).toMatch(/Deno\.env\.get\(.+\)\s*\|\|\s*''\s*,/);
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
    });
  }
});
