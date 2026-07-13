/**
 * backfillStripeHistory — Imports historical Stripe payment data into the canonical
 * SubscriptionEvent ledger. Pulls invoices (payments), refunds, disputes, and
 * subscription records; normalizes each into SubscriptionEvent with idempotency.
 *
 * Idempotency: dedup by provider + provider_event_id (synthetic stable ids for backfill).
 * Never overwrites prior events. Never stores raw card data.
 *
 * Env: STRIPE_SECRET_KEY
 * Params: { sinceTimestamp?: ISO, maxPerType?: number, full?: boolean }
 */
import Stripe from 'npm:stripe@16.10.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normEmail(e) { return String(e || '').trim().toLowerCase(); }

function buildPriceIdToModuleMap() {
  const e = Deno.env;
  return {
    [e.get('VITE_STRIPE_PIPEKEEPER_MONTHLY') || '']: 'pipekeeper',
    [e.get('VITE_STRIPE_PIPEKEEPER_ANNUAL') || '']: 'pipekeeper',
    [e.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') || '']: 'whiskeykeeper',
    [e.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') || '']: 'whiskeykeeper',
    [e.get('VITE_STRIPE_CIGARKEEPER_MONTHLY') || '']: 'cigarkeeper',
    [e.get('VITE_STRIPE_CIGARKEEPER_ANNUAL') || '']: 'cigarkeeper',
    [e.get('VITE_STRIPE_WINEKEEPER_MONTHLY') || '']: 'winekeeper',
    [e.get('VITE_STRIPE_WINEKEEPER_ANNUAL') || '']: 'winekeeper',
    [e.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY') || '']: 'bundle',
    [e.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL') || '']: 'bundle',
    [e.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') || '']: 'bundle',
    [e.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') || '']: 'bundle',
    [e.get('VITE_STRIPE_FOUNDERS_MONTHLY') || '']: 'bundle',
    [e.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']: 'bundle',
  };
}

function moduleFromInvoice(invoice, priceModuleMap) {
  const lines = invoice?.lines?.data || [];
  for (const l of lines) {
    const pid = l?.price?.id;
    if (pid && priceModuleMap[pid]) return priceModuleMap[pid];
  }
  // fall back to subscription metadata module
  return 'unknown';
}

async function userForCustomer(base44, stripe, customerId, email) {
  const ne = normEmail(email);
  if (ne) {
    try {
      const rows = await base44.asServiceRole.entities.User.filter({ email: ne });
      if (Array.isArray(rows) && rows.length > 0) return { user_id: rows[0].id, user_email: ne };
    } catch { /* ignore */ }
  }
  if (customerId) {
    try {
      const rows = await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: customerId });
      if (Array.isArray(rows) && rows.length > 0 && rows[0].user_id) return { user_id: rows[0].user_id, user_email: normEmail(rows[0].user_email) };
    } catch { /* ignore */ }
  }
  return { user_id: null, user_email: ne };
}

async function eventExists(base44, provider, providerEventId) {
  if (!providerEventId) return false;
  try {
    const rows = await base44.asServiceRole.entities.SubscriptionEvent.filter({ provider, provider_event_id: providerEventId });
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

async function insertLedgerEvent(base44, ev) {
  if (await eventExists(base44, ev.provider, ev.provider_event_id)) return { inserted: false, reason: 'duplicate' };
  try {
    await base44.asServiceRole.entities.SubscriptionEvent.create(ev);
    return { inserted: true };
  } catch (err) {
    return { inserted: false, reason: String(err?.message || err) };
  }
}

function isoFromUnix(s) { return s ? new Date(s * 1000).toISOString() : null; }

function buildInvoiceEvent(invoice, priceModuleMap, user, sourceSystem) {
  const isPaid = invoice.status === 'paid';
  const billingReason = invoice.billing_reason || '';
  const isInitial = billingReason === 'subscription_create';
  const isRenewal = billingReason === 'subscription_cycle' || billingReason === 'subscription_update';
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;
  const chargeId = typeof invoice.charge === 'string' ? invoice.charge : null;
  const piId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null;
  const txnId = chargeId || piId || invoice.id;
  const providerEventId = `stripe:invoice:${invoice.id}`;
  const module = moduleFromInvoice(invoice, priceModuleMap);
  const interval = invoice.lines?.data?.[0]?.price?.recurring?.interval || 'unknown';
  const isSuccessfulPayment = isPaid && (invoice.total || 0) >= 0;

  return {
    provider: 'stripe',
    event_type: 'invoice.paid',
    normalized_event_type: isInitial ? 'initial_purchase' : (isRenewal ? 'renewal' : 'other'),
    user_id: user?.user_id || null,
    user_email: normEmail(user?.user_email || invoice.customer_email || ''),
    normalized_email: normEmail(user?.user_email || invoice.customer_email || ''),
    provider_customer_id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null,
    provider_subscription_id: subId,
    provider_transaction_id: txnId,
    original_transaction_id: null,
    provider_event_id: providerEventId,
    product_id: invoice.lines?.data?.[0]?.price?.id || null,
    module,
    raw_status: invoice.status,
    payment_status: isPaid ? 'paid' : 'unknown',
    subscription_status: 'active',
    amount_cents: invoice.total || 0,
    currency: invoice.currency || 'usd',
    billing_interval: interval,
    transaction_at: isoFromUnix(invoice.status_transitions?.paid_at || invoice.created),
    effective_at: isoFromUnix(invoice.created),
    period_start: isoFromUnix(invoice.period_start),
    period_end: isoFromUnix(invoice.period_end),
    is_successful_payment: isSuccessfulPayment,
    is_initial_purchase: isInitial && isSuccessfulPayment,
    is_renewal: isRenewal && isSuccessfulPayment,
    is_reactivation: false,
    is_refund: false,
    is_partial_refund: false,
    is_full_refund: false,
    is_chargeback: false,
    is_trial: (invoice.total || 0) === 0 && billingReason === 'subscription_create',
    is_manual_adjustment: false,
    source_system: sourceSystem,
    source_confidence: isSuccessfulPayment ? (isInitial ? 'confirmed_provider_transaction' : 'confirmed_successful_payment') : 'unresolved',
    raw_event_reference: providerEventId,
    raw_payload: JSON.stringify({ invoice_id: invoice.id, total: invoice.total, currency: invoice.currency, billing_reason: billingReason, subscription: subId, customer: invoice.customer }).slice(0, 8000),
    ingested_at: new Date().toISOString(),
    processed: false,
    reconciliation_status: isSuccessfulPayment ? 'confirmed_first_paid' : 'unknown',
    reconciliation_notes: null,
  };
}

function buildRefundEvent(refund, user, sourceSystem) {
  const providerEventId = `stripe:refund:${refund.id}`;
  const charge = refund.charge;
  const chargeId = typeof charge === 'string' ? charge : charge?.id || null;
  const refundAmount = refund.amount || 0;
  const isFull = refund.amount_refunded != null ? false : true; // per-refund is the refunded amount
  return {
    provider: 'stripe',
    event_type: 'charge.refunded',
    normalized_event_type: 'refund_full',
    user_id: user?.user_id || null,
    user_email: normEmail(user?.user_email || ''),
    normalized_email: normEmail(user?.user_email || ''),
    provider_customer_id: null,
    provider_subscription_id: null,
    provider_transaction_id: refund.id,
    original_transaction_id: chargeId,
    provider_event_id: providerEventId,
    product_id: null,
    module: 'unknown',
    raw_status: refund.status,
    payment_status: 'refunded',
    subscription_status: 'unknown',
    amount_cents: refundAmount,
    currency: refund.currency || 'usd',
    billing_interval: 'unknown',
    transaction_at: isoFromUnix(refund.created),
    effective_at: isoFromUnix(refund.created),
    period_start: null,
    period_end: null,
    refunded_at: isoFromUnix(refund.created),
    refund_amount_cents: refundAmount,
    dispute_status: 'none',
    is_successful_payment: false,
    is_initial_purchase: false,
    is_renewal: false,
    is_reactivation: false,
    is_refund: true,
    is_partial_refund: false,
    is_full_refund: true,
    is_chargeback: false,
    is_trial: false,
    is_manual_adjustment: false,
    source_system: sourceSystem,
    source_confidence: 'confirmed_provider_transaction',
    raw_event_reference: providerEventId,
    raw_payload: JSON.stringify({ refund_id: refund.id, charge: chargeId, amount: refundAmount }).slice(0, 8000),
    ingested_at: new Date().toISOString(),
    processed: false,
    reconciliation_status: 'unknown',
    reconciliation_notes: null,
  };
}

function buildDisputeEvent(dispute, user, sourceSystem) {
  const providerEventId = `stripe:dispute:${dispute.id}`;
  const charge = dispute.charge;
  const chargeId = typeof charge === 'string' ? charge : charge?.id || null;
  const status = String(dispute.status || '').toLowerCase(); // won, lost, expired, etc.
  const normType = status === 'won' ? 'chargeback_won' : status === 'lost' ? 'chargeback_lost' : 'chargeback_open';
  return {
    provider: 'stripe',
    event_type: `charge.dispute.${status || 'created'}`,
    normalized_event_type: normType,
    user_id: user?.user_id || null,
    user_email: normEmail(user?.user_email || ''),
    normalized_email: normEmail(user?.user_email || ''),
    provider_customer_id: null,
    provider_subscription_id: null,
    provider_transaction_id: dispute.id,
    original_transaction_id: chargeId,
    provider_event_id: providerEventId,
    product_id: null,
    module: 'unknown',
    raw_status: dispute.status,
    payment_status: 'disputed',
    subscription_status: 'unknown',
    amount_cents: dispute.amount || 0,
    currency: dispute.currency || 'usd',
    billing_interval: 'unknown',
    transaction_at: isoFromUnix(dispute.created),
    effective_at: isoFromUnix(dispute.created),
    period_start: null,
    period_end: null,
    dispute_status: status || 'open',
    is_successful_payment: false,
    is_initial_purchase: false,
    is_renewal: false,
    is_reactivation: false,
    is_refund: false,
    is_partial_refund: false,
    is_full_refund: false,
    is_chargeback: true,
    is_trial: false,
    is_manual_adjustment: false,
    source_system: sourceSystem,
    source_confidence: 'confirmed_provider_transaction',
    raw_event_reference: providerEventId,
    raw_payload: JSON.stringify({ dispute_id: dispute.id, charge: chargeId, amount: dispute.amount, status: dispute.status }).slice(0, 8000),
    ingested_at: new Date().toISOString(),
    processed: false,
    reconciliation_status: 'unknown',
    reconciliation_notes: null,
  };
}

async function updateSyncHealth(base44, status, eventsImported, rangeStart, rangeEnd, apiFailures) {
  try {
    const rows = await base44.asServiceRole.entities.ProviderSyncHealth.filter({ provider: 'stripe' });
    const existing = Array.isArray(rows) && rows[0];
    const payload = {
      provider: 'stripe',
      backfill_status: status,
      backfill_started_at: rangeStart,
      backfill_completed_at: status === 'complete' ? new Date().toISOString() : null,
      backfill_events_imported: eventsImported,
      backfill_range_start: rangeStart,
      backfill_range_end: rangeEnd,
      provider_api_failures: (existing?.provider_api_failures || 0) + (apiFailures || 0),
      reconciliation_status: existing?.reconciliation_status || 'never_run',
      last_reconciliation_at: existing?.last_reconciliation_at || null,
      updated_at: new Date().toISOString(),
    };
    if (existing) await base44.asServiceRole.entities.ProviderSyncHealth.update(existing.id, payload);
    else await base44.asServiceRole.entities.ProviderSyncHealth.create({ ...payload, last_successful_webhook_at: null, failed_webhook_count: 0, signature_verification_failures: 0, unprocessed_event_count: 0, duplicate_event_count: 0 });
  } catch (err) { console.warn('[backfillStripeHistory] sync health update failed:', err); }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden: admin required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const since = body?.sinceTimestamp ? new Date(body.sinceTimestamp) : null;
    const maxPerType = Number(body?.maxPerType) || 200;
    const sourceSystem = 'backfill';

    const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!apiKey) return Response.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    const stripe = new Stripe(apiKey, { apiVersion: '2024-06-20' });
    const priceModuleMap = buildPriceIdToModuleMap();

    const stats = { invoices: 0, refunds: 0, disputes: 0, duplicates_rejected: 0, inserted: 0, failures: 0 };
    let rangeStart = null, rangeEnd = null;
    let apiFailures = 0;

    await updateSyncHealth(base44, 'running', 0, new Date().toISOString(), null, 0);

    // ── Invoices (payments) ──
    try {
      const invoiceParams = { limit: 100, expand: ['data.customer', 'data.charge', 'data.payment_intent'] };
      if (since) invoiceParams.created = { gte: Math.floor(since.getTime() / 1000) };
      let count = 0;
      for await (const invoice of stripe.invoices.list(invoiceParams)) {
        if (count >= maxPerType) break;
        count++;
        const c = invoice.created ? new Date(invoice.created * 1000) : null;
        if (c) { if (!rangeStart || c < rangeStart) rangeStart = c; if (!rangeEnd || c > rangeEnd) rangeEnd = c; }
        const custEmail = invoice.customer_email || (invoice.customer?.email) || null;
        const user = await userForCustomer(base44, stripe, invoice.customer?.id, custEmail);
        const ev = buildInvoiceEvent(invoice, priceModuleMap, user, sourceSystem);
        const r = await insertLedgerEvent(base44, ev);
        if (r.inserted) stats.inserted++; else stats.duplicates_rejected++;
        stats.invoices++;
      }
    } catch (err) { apiFailures++; stats.failures++; console.warn('[backfill] invoices failed:', err); }

    // ── Refunds ──
    try {
      const refundParams = { limit: 100 };
      if (since) refundParams.created = { gte: Math.floor(since.getTime() / 1000) };
      let count = 0;
      for await (const refund of stripe.refunds.list(refundParams)) {
        if (count >= maxPerType) break;
        count++;
        const user = await userForCustomer(base44, stripe, null, null);
        const ev = buildRefundEvent(refund, user, sourceSystem);
        const r = await insertLedgerEvent(base44, ev);
        if (r.inserted) stats.inserted++; else stats.duplicates_rejected++;
        stats.refunds++;
      }
    } catch (err) { apiFailures++; stats.failures++; console.warn('[backfill] refunds failed:', err); }

    // ── Disputes ──
    try {
      let count = 0;
      for await (const dispute of stripe.disputes.list({ limit: 100 })) {
        if (count >= maxPerType) break;
        count++;
        const user = await userForCustomer(base44, stripe, null, null);
        const ev = buildDisputeEvent(dispute, user, sourceSystem);
        const r = await insertLedgerEvent(base44, ev);
        if (r.inserted) stats.inserted++; else stats.duplicates_rejected++;
        stats.disputes++;
      }
    } catch (err) { apiFailures++; stats.failures++; console.warn('[backfill] disputes failed:', err); }

    await updateSyncHealth(base44, stats.failures > 0 ? 'partial' : 'complete', stats.inserted, rangeStart ? rangeStart.toISOString() : null, rangeEnd ? rangeEnd.toISOString() : null, apiFailures);

    return Response.json({ status: 'ok', stats, range: { start: rangeStart?.toISOString() || null, end: rangeEnd?.toISOString() || null }, maxPerType });
  } catch (error) {
    console.error('[backfillStripeHistory] fatal:', error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});