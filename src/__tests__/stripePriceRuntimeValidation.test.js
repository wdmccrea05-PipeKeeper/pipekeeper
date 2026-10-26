import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('base44/functions/createCheckoutSession/entry.ts','utf8');
describe('Stripe price runtime validation', () => {
 it('checks actual active recurring interval before creating checkout', () => {
  const retrieve = source.indexOf('stripe.prices.retrieve(priceId)');
  const active = source.indexOf('!stripePrice.active');
  const recurring = source.indexOf("stripePrice.type !== 'recurring'");
  const interval = source.indexOf('stripePrice.recurring?.interval !== expectedInterval');
  const create = source.indexOf('stripe.checkout.sessions.create(');
  expect(retrieve).toBeGreaterThan(0);
  expect(retrieve).toBeLessThan(active);
  expect(active).toBeLessThan(create);
  expect(recurring).toBeLessThan(create);
  expect(interval).toBeLessThan(create);
 });
 it('fails closed when Stripe price verification is unavailable', () => {
  expect(source).toContain('PRICE_VERIFICATION_UNAVAILABLE');
  expect(source).toContain('INACTIVE_OR_MISMATCHED_PRICE');
 });
});
