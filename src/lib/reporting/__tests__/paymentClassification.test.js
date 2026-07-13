/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  classifyPaymentEvent,
  isPaymentEvent,
  isRefundEvent,
  resolveDateRange,
} from '../reportingLogic';

// Mirror of the backend classifier — kept as a literal copy to guard against drift.
// If this string ever stops matching the exported behavior, the parity tests fail.
const BACKEND_CLASSIFY = (event) => {
  const norm = (v) => (v == null ? '' : String(v).toLowerCase().trim());
  const slug = (t) => norm(t).replace(/[._-]+/g, ' ');
  const REFUND = ['refund', 'refunded', 'chargeback', 'dispute', 'disputed', 'reversal', 'reversed'];
  const FAILED = ['payment failed', 'invoice payment failed', 'charge failed', 'card declined', 'declined', 'payment canceled', 'canceled payment', 'void', 'voided'];
  const PENDING = ['pending', 'incomplete', 'authorization only', 'authorized only', 'checkout expired', 'payment pending'];
  const TRIAL = ['trial', 'trialing'];
  const SUCCESS = ['invoice payment succeeded', 'charge succeeded', 'checkout session completed', 'initial buy', 'repurchase', 'product purchase', 'renewed', 'renewal'];
  const LIFECYCLE = ['customer subscription created', 'customer subscription updated', 'subscribed'];
  const type = slug(event?.event_type);
  const status = slug(event?.raw_status || event?.status);
  const amount = Number(event?.amount_cents || 0);
  if (REFUND.some((s) => type.includes(s) || status.includes(s))) return { isSuccessfulPayment: false, isRefund: true, reason: 'refund_event' };
  if (FAILED.some((s) => type.includes(s) || status.includes(s))) return { isSuccessfulPayment: false, isRefund: false, reason: 'failed_payment_event' };
  if (PENDING.some((s) => type.includes(s) || status.includes(s))) return { isSuccessfulPayment: false, isRefund: false, reason: 'pending_payment_event' };
  if (TRIAL.some((s) => status.includes(s))) return { isSuccessfulPayment: false, isRefund: false, reason: 'trial_event' };
  if (SUCCESS.some((s) => type.includes(s))) return { isSuccessfulPayment: true, isRefund: false, reason: 'confirmed_success' };
  if (LIFECYCLE.some((s) => type.includes(s)) && amount > 0) return { isSuccessfulPayment: true, isRefund: false, reason: 'confirmed_success' };
  return { isSuccessfulPayment: false, isRefund: false, reason: 'unrecognized_event' };
};

const ok = (event) => classifyPaymentEvent(event).isSuccessfulPayment === true;
const refund = (event) => classifyPaymentEvent(event).isRefund === true;

describe('Payment-event classification', () => {
  it('1. Successful Stripe invoice paid with positive amount', () => {
    expect(ok({ event_type: 'invoice.payment_succeeded', amount_cents: 999 })).toBe(true);
  });
  it('2. Successful Stripe checkout completion tied to payment', () => {
    expect(ok({ event_type: 'checkout.session.completed', amount_cents: 4900 })).toBe(true);
  });
  it('3. Failed invoice with positive requested amount is NOT a payment', () => {
    expect(ok({ event_type: 'invoice.payment_failed', amount_cents: 1999 })).toBe(false);
  });
  it('4. Refunded charge with positive original amount is NOT a payment', () => {
    expect(ok({ event_type: 'charge.refunded', amount_cents: 1999 })).toBe(false);
    expect(refund({ event_type: 'charge.refunded', amount_cents: 1999 })).toBe(true);
  });
  it('5. Partial refund is a refund, not a payment', () => {
    expect(ok({ event_type: 'charge.refunded', amount_cents: 500 })).toBe(false);
    expect(refund({ event_type: 'charge.refunded', amount_cents: 500 })).toBe(true);
  });
  it('6. Full refund is a refund, not a payment', () => {
    expect(ok({ event_type: 'charge.refunded', amount_cents: 1999 })).toBe(false);
    expect(refund({ event_type: 'charge.refunded', amount_cents: 1999 })).toBe(true);
  });
  it('7. Chargeback is a refund, not a payment', () => {
    expect(ok({ event_type: 'charge.dispute.closed', amount_cents: 1999 })).toBe(false);
    expect(refund({ event_type: 'charge.dispute.closed', amount_cents: 1999 })).toBe(true);
  });
  it('8. Disputed charge is a refund, not a payment', () => {
    expect(ok({ event_type: 'charge.dispute.created', amount_cents: 1999 })).toBe(false);
    expect(refund({ event_type: 'charge.dispute.created', amount_cents: 1999 })).toBe(true);
  });
  it('9. Pending payment is NOT a successful payment', () => {
    expect(ok({ event_type: 'payment_intent.payment_pending', amount_cents: 1999 })).toBe(false);
  });
  it('10. Incomplete subscription is NOT a successful payment', () => {
    expect(ok({ event_type: 'customer.subscription.created', raw_status: 'incomplete', amount_cents: 1999 })).toBe(false);
  });
  it('11. Trial start with no payment is NOT a successful payment', () => {
    expect(ok({ event_type: 'customer.subscription.created', raw_status: 'trialing', amount_cents: 0 })).toBe(false);
  });
  it('12. Apple verified initial purchase IS a successful payment', () => {
    expect(ok({ event_type: 'initial_buy', raw_status: 'active', amount_cents: 1999 })).toBe(true);
  });
  it('13. Apple refund or revocation is a refund, not a payment', () => {
    expect(ok({ event_type: 'refund', raw_status: 'refunded', amount_cents: 1999 })).toBe(false);
    expect(refund({ event_type: 'refund', raw_status: 'refunded', amount_cents: 1999 })).toBe(true);
  });
  it('14. Google Play successful purchase IS a successful payment', () => {
    expect(ok({ event_type: 'product_purchase', raw_status: 'active', amount_cents: 1999 })).toBe(true);
  });
  it('15. Google Play canceled or refunded purchase is NOT a payment', () => {
    expect(ok({ event_type: 'subscription_canceled', raw_status: 'canceled', amount_cents: 1999 })).toBe(false);
    expect(ok({ event_type: 'refund', amount_cents: 1999 })).toBe(false);
  });
  it('16. Unknown event with positive amount is NOT a successful payment', () => {
    expect(ok({ event_type: 'something.unknown', amount_cents: 1999 })).toBe(false);
  });
  it('17. Successful confirmed event with zero amount IS a successful payment', () => {
    expect(ok({ event_type: 'invoice.payment_succeeded', amount_cents: 0 })).toBe(true);
  });
  it('18. Free promotional transaction (lifecycle, $0) is NOT a successful payment', () => {
    expect(ok({ event_type: 'customer.subscription.created', raw_status: 'active', amount_cents: 0 })).toBe(false);
  });
  it('19. Manual paid activation with confirmed payment IS a successful payment', () => {
    expect(ok({ event_type: 'product_purchase', raw_status: 'active', amount_cents: 4900 })).toBe(true);
  });
  it('20. Duplicate successful payment events are each classified as successful (dedup is upstream)', () => {
    const a = classifyPaymentEvent({ event_type: 'invoice.payment_succeeded', amount_cents: 999 });
    const b = classifyPaymentEvent({ event_type: 'invoice.payment_succeeded', amount_cents: 999 });
    expect(a.isSuccessfulPayment).toBe(true);
    expect(b.isSuccessfulPayment).toBe(true);
  });
  it('never returns isSuccessfulPayment true for refunds, failures, disputes, or pending events', () => {
    const negatives = [
      { event_type: 'charge.refunded', amount_cents: 100 },
      { event_type: 'refund', amount_cents: 100 },
      { event_type: 'chargeback', amount_cents: 100 },
      { event_type: 'charge.dispute.created', amount_cents: 100 },
      { event_type: 'invoice.payment_failed', amount_cents: 100 },
      { event_type: 'payment_failed', amount_cents: 100 },
      { event_type: 'card_declined', amount_cents: 100 },
      { event_type: 'payment_intent.payment_pending', amount_cents: 100 },
      { event_type: 'customer.subscription.created', raw_status: 'incomplete', amount_cents: 100 },
      { event_type: 'checkout.session.expired', amount_cents: 100 },
    ];
    for (const e of negatives) {
      expect(classifyPaymentEvent(e).isSuccessfulPayment).toBe(false);
    }
  });
  it('amount_cents > 0 alone never makes an unrecognized event a successful payment', () => {
    expect(ok({ event_type: 'mystery.event', amount_cents: 99999 })).toBe(false);
  });
});

describe('Shared vs backend payment-classification parity', () => {
  const cases = [
    { event_type: 'invoice.payment_succeeded', amount_cents: 999 },
    { event_type: 'checkout.session.completed', amount_cents: 4900 },
    { event_type: 'invoice.payment_failed', amount_cents: 1999 },
    { event_type: 'charge.refunded', amount_cents: 1999 },
    { event_type: 'charge.refunded', amount_cents: 500 },
    { event_type: 'charge.dispute.created', amount_cents: 1999 },
    { event_type: 'payment_intent.payment_pending', amount_cents: 1999 },
    { event_type: 'customer.subscription.created', raw_status: 'incomplete', amount_cents: 1999 },
    { event_type: 'customer.subscription.created', raw_status: 'trialing', amount_cents: 0 },
    { event_type: 'initial_buy', raw_status: 'active', amount_cents: 1999 },
    { event_type: 'refund', raw_status: 'refunded', amount_cents: 1999 },
    { event_type: 'product_purchase', raw_status: 'active', amount_cents: 1999 },
    { event_type: 'something.unknown', amount_cents: 1999 },
    { event_type: 'invoice.payment_succeeded', amount_cents: 0 },
    { event_type: 'customer.subscription.created', raw_status: 'active', amount_cents: 0 },
  ];
  for (const c of cases) {
    it(`parity: ${c.event_type} / ${c.raw_status || '-'}`, () => {
      expect(classifyPaymentEvent(c)).toEqual(BACKEND_CLASSIFY(c));
    });
  }
  it('isPaymentEvent matches BACKEND isSuccessfulPayment for all cases', () => {
    for (const c of cases) {
      expect(isPaymentEvent(c)).toBe(BACKEND_CLASSIFY(c).isSuccessfulPayment);
    }
  });
  it('isRefundEvent matches BACKEND isRefund for all cases', () => {
    for (const c of cases) {
      expect(isRefundEvent(c)).toBe(BACKEND_CLASSIFY(c).isRefund);
    }
  });
});

describe('Date-range resolution', () => {
  it('resolveDateRange("365d") returns a trailing 365-day range, not 30 days', () => {
    const now = new Date('2026-07-13T12:00:00Z');
    const r = resolveDateRange('365d', null, null, now);
    const days = Math.round((r.end - r.start) / 86400000);
    expect(days).toBeGreaterThanOrEqual(364);
    expect(days).toBeLessThanOrEqual(366);
    // Must not be the 30-day default
    expect(days).toBeGreaterThan(30);
  });
  it('30d, 90d, and 365d resolve to distinct, increasing start dates', () => {
    const now = new Date('2026-07-13T12:00:00Z');
    const r30 = resolveDateRange('30d', null, null, now);
    const r90 = resolveDateRange('90d', null, null, now);
    const r365 = resolveDateRange('365d', null, null, now);
    expect(r365.start.getTime()).toBeLessThan(r90.start.getTime());
    expect(r90.start.getTime()).toBeLessThan(r30.start.getTime());
  });
});