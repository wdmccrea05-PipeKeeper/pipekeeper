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
      return new Response('Invalid webhook signature', { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(base44, stripe, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChanged(base44, sub, event.type);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'customer.subscription.trial_will_end': {
        await logEvent(base44, event.type, {
          stripe_event_id: event.id,
          object_id: (event.data.object as any)?.id || null,
          object_type: (event.data.object as any)?.object || null,
        });
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