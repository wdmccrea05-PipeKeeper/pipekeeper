/**
 * Stripe webhook handler
 *
 * Responsibilities:
 * - Verify webhook signature
 * - Upsert local Subscription records from Stripe subscription state
 * - Keep user-level entitlement hints in sync
 * - Log integration activity
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 */

import Stripe from 'npm:stripe@16.10.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function splitModulesCsv(csv: unknown): string[] {
  return unique(
    String(csv || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isIsoFuture(value: unknown): boolean {
  if (!value) return false;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) && d.getTime() > Date.now();
}

function subscriptionGrantsPaidAccess(status: string, currentPeriodEnd?: string | null): boolean {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active' || normalized === 'trialing') return true;
  if ((normalized === 'past_due' || normalized === 'incomplete') && currentPeriodEnd && isIsoFuture(currentPeriodEnd)) {
    return true;
  }
  return false;
}

function getStripe() {
  const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!apiKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(apiKey, { apiVersion: '2024-06-20' });
}

function getWebhookSecret() {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  return secret;
}

async function logEvent(base44: any, eventType: string, details: Record<string, unknown>) {
  try {
    await base44.asServiceRole.entities.SubscriptionIntegrationEvent.create({
      event_type: eventType,
      user_email: normEmail(details.user_email),
      details,
    });
  } catch (err) {
    console.warn('[stripeWebhook] failed to log integration event:', err);
  }
}

// ── Canonical ledger writer (idempotent) ──────────────────────────────────────
async function ledgerEventExists(base44: any, providerEventId: string): Promise<boolean> {
  if (!providerEventId) return false;
  try {
    const rows = await base44.asServiceRole.entities.SubscriptionEvent.filter({ provider: 'stripe', provider_event_id: providerEventId });
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

async function writeLedgerEvent(base44: any, ev: Record<string, unknown>): Promise<{ inserted: boolean; reason?: string }> {
  if (!ev.provider_event_id) return { inserted: false, reason: 'no_event_id' };
  if (await ledgerEventExists(base44, String(ev.provider_event_id))) return { inserted: false, reason: 'duplicate' };
  try {
    await base44.asServiceRole.entities.SubscriptionEvent.create({ ...ev, ingested_at: new Date().toISOString(), source_system: ev.source_system || 'webhook', processed: false });
    return { inserted: true };
  } catch (err) {
    console.warn('[stripeWebhook] ledger write failed:', err);
    return { inserted: false, reason: String((err as any)?.message || err) };
  }
}

async function updateSyncHealthOnSuccess(base44: any) {
  try {
    const rows = await base44.asServiceRole.entities.ProviderSyncHealth.filter({ provider: 'stripe' });
    const existing = Array.isArray(rows) && rows[0];
    const payload = { provider: 'stripe', last_successful_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (existing) await base44.asServiceRole.entities.ProviderSyncHealth.update(existing.id, payload);
    else await base44.asServiceRole.entities.ProviderSyncHealth.create({ ...payload, backfill_status: 'never_run', reconciliation_status: 'never_run', failed_webhook_count: 0, signature_verification_failures: 0, unprocessed_event_count: 0, duplicate_event_count: 0, provider_api_failures: 0, backfill_events_imported: 0 });
  } catch { /* ignore */ }
}

async function bumpSyncHealthCounter(base44: any, field: 'failed_webhook_count' | 'signature_verification_failures') {
  try {
    const rows = await base44.asServiceRole.entities.ProviderSyncHealth.filter({ provider: 'stripe' });
    const existing = Array.isArray(rows) && rows[0];
    const now = new Date().toISOString();
    if (existing) await base44.asServiceRole.entities.ProviderSyncHealth.update(existing.id, { [field]: (existing[field] || 0) + 1, last_failed_webhook_at: now, updated_at: now });
  } catch { /* ignore */ }
}

function ledgerEventFromInvoice(inv: any, user: { user_id?: string | null; user_email?: string | null } | null, eventType: string) {
  const billingReason = inv.billing_reason || '';
  const isInitial = billingReason === 'subscription_create';
  const isRenewal = billingReason === 'subscription_cycle';
  const isPaid = inv.status === 'paid';
  const isSuccessfulPayment = isPaid && (inv.total || 0) >= 0;
  const chargeId = typeof inv.charge === 'string' ? inv.charge : inv.charge?.id || null;
  const piId = typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id || null;
  const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id || null;
  const custId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || null;
  return {
    provider: 'stripe',
    event_type: eventType,
    normalized_event_type: isInitial ? 'initial_purchase' : (isRenewal ? 'renewal' : 'other'),
    user_id: user?.user_id || null,
    user_email: normEmail(user?.user_email || inv.customer_email || ''),
    normalized_email: normEmail(user?.user_email || inv.customer_email || ''),
    provider_customer_id: custId,
    provider_subscription_id: subId,
    provider_transaction_id: chargeId || piId || inv.id,
    provider_event_id: `stripe:invoice:${inv.id}`,
    amount_cents: inv.total || 0,
    currency: inv.currency || 'usd',
    billing_interval: inv.lines?.data?.[0]?.price?.recurring?.interval || 'unknown',
    transaction_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : (inv.created ? new Date(inv.created * 1000).toISOString() : null),
    effective_at: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
    period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
    is_successful_payment: isSuccessfulPayment,
    is_initial_purchase: isInitial && isSuccessfulPayment,
    is_renewal: isRenewal && isSuccessfulPayment,
    is_refund: false, is_partial_refund: false, is_full_refund: false, is_chargeback: false,
    is_trial: (inv.total || 0) === 0 && isInitial,
    source_confidence: isSuccessfulPayment ? (isInitial ? 'confirmed_provider_transaction' : 'confirmed_successful_payment') : 'unresolved',
    payment_status: isPaid ? 'paid' : (eventType.includes('failed') ? 'failed' : 'unknown'),
    subscription_status: 'active',
    raw_event_reference: `stripe:invoice:${inv.id}`,
  };
}

function ledgerEventFromCharge(chg: any, user: { user_id?: string | null; user_email?: string | null } | null, normalizedEventType: string, eventType: string) {
  const isRefund = normalizedEventType.startsWith('refund');
  const isDispute = normalizedEventType.startsWith('chargeback') || eventType.startsWith('charge.dispute');
  return {
    provider: 'stripe',
    event_type: eventType,
    normalized_event_type: normalizedEventType,
    user_id: user?.user_id || null,
    user_email: normEmail(user?.user_email || ''),
    normalized_email: normEmail(user?.user_email || ''),
    provider_customer_id: chg.customer || null,
    provider_subscription_id: chg.invoice?.subscription || null,
    provider_transaction_id: chg.id,
    provider_event_id: `stripe:charge:${chg.id}:${normalizedEventType}`,
    amount_cents: isRefund ? (chg.amount_refunded || 0) : (chg.amount || 0),
    currency: chg.currency || 'usd',
    transaction_at: chg.created ? new Date(chg.created * 1000).toISOString() : null,
    is_successful_payment: normalizedEventType === 'initial_purchase' || normalizedEventType === 'renewal',
    is_refund: isRefund, is_full_refund: isRefund && chg.amount_refunded >= chg.amount, is_partial_refund: isRefund && chg.amount_refunded < chg.amount,
    is_chargeback: isDispute, dispute_status: isDispute ? (chg.dispute?.status || 'open') : 'none',
    refunded_at: isRefund ? (chg.created ? new Date(chg.created * 1000).toISOString() : null) : null,
    source_confidence: 'confirmed_provider_transaction',
    payment_status: isRefund ? 'refunded' : (isDispute ? 'disputed' : 'paid'),
    raw_event_reference: `stripe:charge:${chg.id}`,
  };
}

async function findUserByMetadataOrEmail(base44: any, metadata: Record<string, string>, email?: string | null) {
  const userId = String(metadata?.user_id || '').trim();
  const normalizedEmail = normEmail(email || metadata?.user_email || '');

  if (userId) {
    try {
      const user = await base44.asServiceRole.entities.User.get(userId);
      if (user) return user;
    } catch {
      // ignore
    }
  }

  if (normalizedEmail) {
    try {
      const rows = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
      if (Array.isArray(rows) && rows.length > 0) return rows[0];
    } catch {
      // ignore
    }
  }

  return null;
}

async function findExistingSubscriptionRow(base44: any, providerSubscriptionId: string) {
  const byProviderId = await base44.asServiceRole.entities.Subscription.filter({
    provider_subscription_id: providerSubscriptionId,
  });
  if (Array.isArray(byProviderId) && byProviderId.length > 0) return byProviderId[0];

  const byLegacyStripeId = await base44.asServiceRole.entities.Subscription.filter({
    stripe_subscription_id: providerSubscriptionId,
  });
  if (Array.isArray(byLegacyStripeId) && byLegacyStripeId.length > 0) return byLegacyStripeId[0];

  return null;
}

async function syncUserEntitlements(base44: any, userEmail: string) {
  const normalizedEmail = normEmail(userEmail);
  if (!normalizedEmail) return;

  const userRows = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
  const user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;
  if (!user) return;

  const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: normalizedEmail });
  const activeSubs = (Array.isArray(subs) ? subs : []).filter((sub: any) =>
    subscriptionGrantsPaidAccess(sub.status, sub.current_period_end)
  );

  const paidModules = unique(
    activeSubs.flatMap((sub: any) => splitModulesCsv(sub.modules_csv))
  );

  const hasPaidAccess = paidModules.length > 0;
  const hasBundleAccess = activeSubs.some((sub: any) => String(sub.checkout_type || '').startsWith('bundle_'));
  const bundleSize = hasBundleAccess
    ? Math.max(
        0,
        ...activeSubs
          .filter((sub: any) => String(sub.checkout_type || '').startsWith('bundle_'))
          .map((sub: any) => Number(sub.module_count || splitModulesCsv(sub.modules_csv).length || 0))
      )
    : 0;

  // CRITICAL FIX: Per-module entitlements from unioned active modules
  const pipekeeper_paid = paidModules.includes('pipekeeper');
  const whiskeykeeper_paid = paidModules.includes('whiskeykeeper');
  const cigarkeeper_paid = paidModules.includes('cigarkeeper');
  const winekeeper_paid = paidModules.includes('winekeeper');

  const updatePayload = {
    stripe_customer_id:
      activeSubs.find((s: any) => s.stripe_customer_id)?.stripe_customer_id || user.stripe_customer_id || null,
    // Always use "pro" as the entitlement tier — no "premium" in the system
    entitlement_tier: hasPaidAccess ? 'pro' : 'free',
    paid_modules_csv: paidModules.length > 0 ? paidModules.join(',') : '',
    pipekeeper_paid,
    whiskeykeeper_paid,
    cigarkeeper_paid,
    winekeeper_paid,
    has_paid_access: hasPaidAccess,
    updated_date: new Date().toISOString(),
  };

  try {
    await base44.asServiceRole.entities.User.update(user.id, updatePayload);
  } catch (err) {
    console.warn('[stripeWebhook] failed updating user entitlements:', err);
  }
}

// Canonical price ID → planKey map (built from env vars at call time)
function buildPriceIdToPlanKeyMap(): Record<string, string> {
  const e = Deno.env;
  return {
    [e.get('VITE_STRIPE_PIPEKEEPER_MONTHLY') || '']:    'pipekeeper_pro_monthly',
    [e.get('VITE_STRIPE_PIPEKEEPER_ANNUAL') || '']:     'pipekeeper_pro_annual',
    [e.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') || '']: 'whiskeykeeper_pro_monthly',
    [e.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') || '']:  'whiskeykeeper_pro_annual',
    [e.get('VITE_STRIPE_CIGARKEEPER_MONTHLY') || '']:   'cigarkeeper_pro_monthly',
    [e.get('VITE_STRIPE_CIGARKEEPER_ANNUAL') || '']:    'cigarkeeper_pro_annual',
    [e.get('VITE_STRIPE_WINEKEEPER_MONTHLY') || '']:    'winekeeper_pro_monthly',
    [e.get('VITE_STRIPE_WINEKEEPER_ANNUAL') || '']:     'winekeeper_pro_annual',
    [e.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY') || '']:  'three_module_bundle_monthly',
    [e.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL') || '']:   'three_module_bundle_annual',
    [e.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') || '']:   'four_module_bundle_monthly',
    [e.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') || '']:    'four_module_bundle_annual',
    [e.get('VITE_STRIPE_FOUNDERS_MONTHLY') || '']:      'founders_bundle_monthly',
    [e.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']:       'founders_bundle_annual',
  };
}

// Resolve modules from planKey. Founders = PK+WK ONLY (2 modules).
function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_')) return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_')) return ['cigarkeeper'];
  if (key.startsWith('winekeeper_')) return ['winekeeper'];
  if (key.includes('three_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders')) return ['pipekeeper', 'whiskeykeeper']; // 2 modules, not 4
  return [];
}

async function upsertSubscriptionFromStripe(
  base44: any,
  stripeSub: Stripe.Subscription,
  metadataOverride: Record<string, string> = {},
  fallbackEmail: string | null = null
) {
  const metadata = {
    ...((stripeSub.metadata || {}) as Record<string, string>),
    ...(metadataOverride || {}),
  } as Record<string, string>;

  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id || null;

  const customerEmail = normEmail(metadata.user_email || fallbackEmail || '');

  const currentPeriodStart = stripeSub.current_period_start
    ? new Date(stripeSub.current_period_start * 1000).toISOString()
    : null;
  const currentPeriodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000).toISOString()
    : null;

  const existing = await findExistingSubscriptionRow(base44, stripeSub.id);

  // ── Resolve planKey from price ID ─────────────────────────────────────────
  const priceIdFromStripe = stripeSub.items?.data?.[0]?.price?.id || null;
  const priceMap = buildPriceIdToPlanKeyMap();
  const planKeyFromPrice = priceIdFromStripe ? (priceMap[priceIdFromStripe] || null) : null;
  const planKey = metadata.plan_key || metadata.planKey || planKeyFromPrice || existing?.planKey || null;

  // ── Resolve modules from planKey (authoritative) or metadata ─────────────
  const metadataModules = splitModulesCsv(metadata.modules_csv);
  const planKeyModules = planKey ? modulesFromPlanKey(planKey) : [];
  const modules = planKeyModules.length > 0 ? planKeyModules : metadataModules;

  // ── Normalize product fields ───────────────────────────────────────────────
  const isBundle = modules.length > 1;
  const productKind = isBundle ? 'bundle' : (modules.length === 1 ? 'single' : 'unknown');

  function bundleNameFromKey(key: string | null): string | null {
    if (!key) return null;
    if (key.includes('founders')) return 'Founders Bundle';
    if (key.includes('three_module')) return '3-Module Bundle';
    if (key.includes('four_module')) return '4-Module Bundle';
    return null;
  }
  const bundleName = isBundle
    ? (metadata.bundle_name || bundleNameFromKey(planKey) || existing?.bundle_name || 'Bundle')
    : null;

  const billingIntervalRaw = stripeSub.items?.data?.[0]?.price?.recurring?.interval || null;
  const renewalAmount = stripeSub.items?.data?.[0]?.price?.unit_amount
    ? stripeSub.items.data[0].price.unit_amount / 100
    : null;

  const payload = {
    provider: 'stripe',
    provider_subscription_id: stripeSub.id,
    stripe_subscription_id: stripeSub.id,
    stripe_customer_id: customerId,
    user_id: metadata.user_id || existing?.user_id || null,
    user_email: normEmail(customerEmail || existing?.user_email || ''),
    status: stripeSub.status,
    planKey,
    price_id: priceIdFromStripe || existing?.price_id || null,
    billing_interval: billingIntervalRaw,
    billing_period: metadata.billing_period || billingIntervalRaw || existing?.billing_period || null,
    checkout_type: metadata.checkout_type || (isBundle ? `bundle_${modules.length}` : 'single_module') || existing?.checkout_type || null,
    modules_csv: modules.length > 0 ? modules.join(',') : existing?.modules_csv || '',
    module_count: modules.length > 0 ? modules.length : Number(metadata.module_count || existing?.module_count || 0),
    product_kind: productKind !== 'unknown' ? productKind : (metadata.product_kind || existing?.product_kind || null),
    primary_module: modules[0] || metadata.primary_module || existing?.primary_module || null,
    bundle_name: bundleName,
    renewal_amount: renewalAmount,
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    latest_invoice_id:
      typeof stripeSub.latest_invoice === 'string'
        ? stripeSub.latest_invoice
        : stripeSub.latest_invoice?.id || null,
    currency: stripeSub.currency || existing?.currency || null,
    metadata_json: JSON.stringify(metadata),
    updated_date: new Date().toISOString(),
  };

  let row;
  if (existing?.id) {
    row = await base44.asServiceRole.entities.Subscription.update(existing.id, payload);
  } else {
    row = await base44.asServiceRole.entities.Subscription.create({
      ...payload,
      created_date: new Date().toISOString(),
    });
  }

  if (payload.user_email) {
    await syncUserEntitlements(base44, payload.user_email);
  }

  return row;
}

async function triggerReferralQualification(base44: any, userEmail: string, subscriptionId: string, amountCents: number, interval: string) {
  try {
    // Find the user to get their ID and check if they have referral attribution
    const users = await base44.asServiceRole.entities.User.filter({ email: normEmail(userEmail) });
    const user = users?.[0];
    if (!user || !user.referred_by_code) return; // Not a referred user

    await base44.asServiceRole.functions.invoke('processReferralQualification', {
      referredUserId: user.id,
      referredEmail: normEmail(userEmail),
      subscriptionId,
      subscriptionAmount: amountCents / 100,
      subscriptionInterval: interval || 'month',
      billingProvider: 'stripe',
    });
  } catch (err) {
    console.warn('[stripeWebhook] referral qualification trigger failed (non-fatal):', err);
  }
}

async function handleCheckoutCompleted(base44: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const customerEmail = normEmail(session.customer_details?.email || metadata.user_email || '');
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;

  await logEvent(base44, 'stripe_checkout_completed', {
    user_email: customerEmail,
    checkoutSessionId: session.id,
    subscriptionId,
    metadata,
    mode: session.mode,
  });

  if (!subscriptionId) return;

  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice', 'items.data.price'],
  });

  await upsertSubscriptionFromStripe(base44, stripeSub, metadata, customerEmail || null);

  // ── Referral qualification: fire when a new paid subscription is created ──
  if (customerEmail && stripeSub.status === 'active') {
    const amountCents = stripeSub.items?.data?.[0]?.price?.unit_amount || 0;
    const interval = stripeSub.items?.data?.[0]?.price?.recurring?.interval || 'month';
    await triggerReferralQualification(base44, customerEmail, subscriptionId, amountCents, interval);
  }
}

async function handleSubscriptionChanged(base44: any, stripeSub: Stripe.Subscription, eventType: string) {
  await upsertSubscriptionFromStripe(base44, stripeSub, {}, null);

  const userEmail = normEmail(stripeSub.metadata?.user_email || '');

  await logEvent(base44, eventType, {
    user_email: userEmail,
    subscriptionId: stripeSub.id,
    status: stripeSub.status,
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    current_period_end: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null,
    metadata: stripeSub.metadata || {},
  });

  // ── Referral qualification: fire when subscription transitions to active ──
  // customer.subscription.created covers first activation
  if (eventType === 'customer.subscription.created' && stripeSub.status === 'active' && userEmail) {
    const amountCents = stripeSub.items?.data?.[0]?.price?.unit_amount || 0;
    const interval = stripeSub.items?.data?.[0]?.price?.recurring?.interval || 'month';
    await triggerReferralQualification(base44, userEmail, stripeSub.id, amountCents, interval);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('[stripeWebhook] signature verification failed:', err);
      const base44Tmp = createClientFromRequest(req);
      await bumpSyncHealthCounter(base44Tmp, 'signature_verification_failures');
      return new Response('Invalid webhook signature', { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChanged(base44, sub, event.type);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const inv = event.data.object as any;
        const invUser = await findUserByMetadataOrEmail(base44, inv.metadata || {}, inv.customer_email || null);
        const ledger = ledgerEventFromInvoice(inv, invUser ? { user_id: invUser.id, user_email: normEmail(invUser.email) } : null, event.type);
        await writeLedgerEvent(base44, ledger);
        await logEvent(base44, event.type, {
          stripe_event_id: event.id,
          user_email: normEmail(invUser?.email || inv.customer_email || ''),
          object_id: inv?.id || null,
          object_type: inv?.object || null,
        });
        break;
      }

      case 'customer.subscription.trial_will_end': {
        await logEvent(base44, event.type, {
          stripe_event_id: event.id,
          object_id: (event.data.object as any)?.id || null,
          object_type: (event.data.object as any)?.object || null,
        });
        break;
      }

      case 'charge.succeeded': {
        const chg = event.data.object as any;
        const chgUser = await findUserByMetadataOrEmail(base44, chg.metadata || {}, chg.billing_details?.email || null);
        await writeLedgerEvent(base44, ledgerEventFromCharge(chg, chgUser ? { user_id: chgUser.id, user_email: normEmail(chgUser.email) } : null, chg.invoice ? 'renewal' : 'initial_purchase', 'charge.succeeded'));
        break;
      }

      case 'charge.refunded': {
        const chg = event.data.object as any;
        const chgUser = await findUserByMetadataOrEmail(base44, chg.metadata || {}, chg.billing_details?.email || null);
        await writeLedgerEvent(base44, ledgerEventFromCharge(chg, chgUser ? { user_id: chgUser.id, user_email: normEmail(chgUser.email) } : null, 'refund_full', 'charge.refunded'));
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.closed': {
        const disp = event.data.object as any;
        const status = String(disp.status || '').toLowerCase();
        const normType = status === 'won' ? 'chargeback_won' : status === 'lost' ? 'chargeback_lost' : 'chargeback_open';
        const chgUser = null;
        await writeLedgerEvent(base44, {
          provider: 'stripe',
          event_type: event.type,
          normalized_event_type: normType,
          provider_transaction_id: disp.id,
          provider_event_id: `stripe:dispute:${disp.id}`,
          amount_cents: disp.amount || 0,
          currency: disp.currency || 'usd',
          transaction_at: disp.created ? new Date(disp.created * 1000).toISOString() : null,
          is_chargeback: true,
          dispute_status: status || 'open',
          payment_status: 'disputed',
          source_confidence: 'confirmed_provider_transaction',
          raw_event_reference: `stripe:dispute:${disp.id}`,
        });
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await writeLedgerEvent(base44, {
          provider: 'stripe',
          event_type: 'checkout.session.completed',
          normalized_event_type: 'initial_purchase',
          user_email: normEmail(session.customer_details?.email || session.metadata?.user_email || ''),
          provider_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null,
          provider_transaction_id: session.id,
          provider_event_id: `stripe:checkout:${session.id}`,
          amount_cents: session.amount_total || 0,
          currency: session.currency || 'usd',
          transaction_at: session.created ? new Date(session.created * 1000).toISOString() : null,
          is_successful_payment: session.payment_status === 'paid',
          is_initial_purchase: true,
          source_confidence: session.payment_status === 'paid' ? 'confirmed_provider_transaction' : 'unresolved',
          payment_status: session.payment_status || 'unknown',
          raw_event_reference: `stripe:checkout:${session.id}`,
        });
        await handleCheckoutCompleted(base44, stripe, session);
        break;
      }

      default: {
        await logEvent(base44, 'stripe_webhook_unhandled', {
          stripe_event_id: event.id,
          event_type: event.type,
        });
        break;
      }
    }

    await updateSyncHealthOnSuccess(base44);
    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] fatal error:', error);
    return Response.json(
      {
        received: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});