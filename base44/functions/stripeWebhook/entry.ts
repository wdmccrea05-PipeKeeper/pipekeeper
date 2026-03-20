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

  const updatePayload = {
    stripe_customer_id:
      activeSubs.find((s: any) => s.stripe_customer_id)?.stripe_customer_id || user.stripe_customer_id || null,
    // Always use "pro" as the entitlement tier — no "premium" in the system
    entitlement_tier: hasPaidAccess ? 'pro' : 'free',
    paid_modules_csv: hasPaidAccess ? (paidModules.length > 0 ? paidModules.join(',') : 'pipekeeper,whiskeykeeper') : '',
    has_paid_access: hasPaidAccess,
    updated_date: new Date().toISOString(),
  };

  try {
    await base44.asServiceRole.entities.User.update(user.id, updatePayload);
  } catch (err) {
    console.warn('[stripeWebhook] failed updating user entitlements:', err);
  }
}

async function upsertSubscriptionFromStripe(base44: any, stripeSub: Stripe.Subscription) {
  const metadata = (stripeSub.metadata || {}) as Record<string, string>;
  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id || null;

  const customerEmail =
    metadata.user_email ||
    null;

  const modules = splitModulesCsv(metadata.modules_csv);
  const currentPeriodStart = stripeSub.current_period_start
    ? new Date(stripeSub.current_period_start * 1000).toISOString()
    : null;
  const currentPeriodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000).toISOString()
    : null;

  const existing = await findExistingSubscriptionRow(base44, stripeSub.id);

  const payload = {
    provider: 'stripe',
    provider_subscription_id: stripeSub.id,
    stripe_subscription_id: stripeSub.id,
    stripe_customer_id: customerId,
    user_id: metadata.user_id || existing?.user_id || null,
    user_email: normEmail(customerEmail || existing?.user_email || ''),
    status: stripeSub.status,
    checkout_type: metadata.checkout_type || existing?.checkout_type || null,
    billing_period: metadata.billing_period || existing?.billing_period || null,
    modules_csv: modules.join(','),
    module_count: Number(metadata.module_count || modules.length || 0),
    product_kind: metadata.product_kind || existing?.product_kind || null,
    primary_module: metadata.primary_module || existing?.primary_module || null,
    bundle_name: metadata.bundle_name || existing?.bundle_name || null,
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    latest_invoice_id:
      typeof stripeSub.latest_invoice === 'string'
        ? stripeSub.latest_invoice
        : stripeSub.latest_invoice?.id || null,
    price_id: stripeSub.items?.data?.[0]?.price?.id || existing?.price_id || null,
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

  await upsertSubscriptionFromStripe(base44, stripeSub);
}

async function handleSubscriptionChanged(base44: any, stripeSub: Stripe.Subscription, eventType: string) {
  await upsertSubscriptionFromStripe(base44, stripeSub);

  await logEvent(base44, eventType, {
    user_email: normEmail(stripeSub.metadata?.user_email || ''),
    subscriptionId: stripeSub.id,
    status: stripeSub.status,
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    current_period_end: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null,
    metadata: stripeSub.metadata || {},
  });
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