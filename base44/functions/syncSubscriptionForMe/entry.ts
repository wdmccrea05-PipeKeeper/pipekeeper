/**
 * Sync subscription state for the authenticated user.
 *
 * Use this:
 * - after successful checkout redirect
 * - after login
 * - from a "Restore Purchases / Refresh Access" button
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

function grantsPaidAccess(status: string, currentPeriodEnd?: string | null): boolean {
  const s = String(status || '').toLowerCase();
  if (s === 'active' || s === 'trialing') return true;
  if ((s === 'past_due' || s === 'incomplete') && currentPeriodEnd && isIsoFuture(currentPeriodEnd)) {
    return true;
  }
  return false;
}

function getStripe() {
  const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!apiKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(apiKey, { apiVersion: '2024-06-20' });
}

async function findUserEntity(base44: any, email: string) {
  const rows = await base44.asServiceRole.entities.User.filter({ email });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function findLocalSubscriptions(base44: any, email: string) {
  const rows = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
  return Array.isArray(rows) ? rows : [];
}

async function updateUserEntitlements(base44: any, user: any, subs: any[]) {
  const activeSubs = subs.filter((sub) => grantsPaidAccess(sub.status, sub.current_period_end));
  const paidModules = unique(activeSubs.flatMap((sub) => splitModulesCsv(sub.modules_csv)));
  const hasBundle = activeSubs.some((sub) => String(sub.checkout_type || '').startsWith('bundle_'));
  const bundleSize = hasBundle
    ? Math.max(
        0,
        ...activeSubs
          .filter((sub) => String(sub.checkout_type || '').startsWith('bundle_'))
          .map((sub) => Number(sub.module_count || splitModulesCsv(sub.modules_csv).length || 0))
      )
    : 0;

  const hasPaidAccess = activeSubs.length > 0;
  // Always use "pro" — no "premium" tier in the system
  const entitlementTier = hasPaidAccess ? 'pro' : 'free';
  const resolvedModules = hasPaidAccess
    ? (paidModules.length > 0 ? paidModules : ['pipekeeper', 'whiskeykeeper'])
    : [];

  await base44.asServiceRole.entities.User.update(user.id, {
    stripe_customer_id:
      activeSubs.find((s) => s.stripe_customer_id)?.stripe_customer_id || user.stripe_customer_id || null,
    entitlement_tier: entitlementTier,
    paid_modules_csv: resolvedModules.join(','),
    has_paid_access: hasPaidAccess,
    updated_date: new Date().toISOString(),
  });

  return {
    paidModules: resolvedModules,
    entitlementTier,
    hasPaidAccess,
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const stripe = getStripe();
    const me = await base44.auth.me();

    if (!me?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const email = normEmail(me.email);
    const user = await findUserEntity(base44, email);

    if (!user) {
      return Response.json({ success: false, error: 'User entity not found' }, { status: 404 });
    }

    let localSubs = await findLocalSubscriptions(base44, email);
    let stripeCustomerId = user.stripe_customer_id || localSubs.find((s: any) => s.stripe_customer_id)?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email, limit: 10 });
      const matched = customers.data.find((c) => normEmail(c.email) === email) || null;
      stripeCustomerId = matched?.id || null;
    }

    if (stripeCustomerId) {
      let stripeSubs;
      try {
        stripeSubs = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 100,
          expand: ['data.items.data.price'],
        });
      } catch (stripeErr) {
        // Stale/invalid customer ID — skip Stripe lookup, use local subs only
        console.warn('[syncSubscriptionForMe] Stripe customer lookup failed (stale ID?):', stripeErr?.message);
        stripeSubs = { data: [] };
      }

      for (const stripeSub of (stripeSubs?.data || [])) {
        const existing =
          localSubs.find((s: any) => s.provider_subscription_id === stripeSub.id || s.stripe_subscription_id === stripeSub.id) || null;

        const metadata = stripeSub.metadata || {};
        const currentPeriodStart = stripeSub.current_period_start
          ? new Date(stripeSub.current_period_start * 1000).toISOString()
          : null;
        const currentPeriodEnd = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null;
        const modulesCsv = String(metadata.modules_csv || existing?.modules_csv || '');

        const payload = {
          provider: 'stripe',
          provider_subscription_id: stripeSub.id,
          stripe_subscription_id: stripeSub.id,
          stripe_customer_id: stripeCustomerId,
          user_id: existing?.user_id || me.id || null,
          user_email: email,
          status: stripeSub.status,
          checkout_type: metadata.checkout_type || existing?.checkout_type || null,
          billing_period: metadata.billing_period || existing?.billing_period || null,
          modules_csv: modulesCsv,
          module_count: Number(metadata.module_count || splitModulesCsv(modulesCsv).length || 0),
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

        if (existing?.id) {
          await base44.asServiceRole.entities.Subscription.update(existing.id, payload);
        } else {
          await base44.asServiceRole.entities.Subscription.create({
            ...payload,
            created_date: new Date().toISOString(),
          });
        }
      }
    }

    localSubs = await findLocalSubscriptions(base44, email);
    const entitlementState = await updateUserEntitlements(base44, user, localSubs);

    return Response.json({
      success: true,
      stripeCustomerId: stripeCustomerId || null,
      subscriptionCount: localSubs.length,
      ...entitlementState,
    });
  } catch (error) {
    console.error('[syncSubscriptionForMe] fatal error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});