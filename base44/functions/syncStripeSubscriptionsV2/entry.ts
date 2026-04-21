/**
 * Sync Stripe subscriptions using canonical normalizer.
 * Writes complete subscription rows with all canonical fields.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

function normEmail(v: unknown): string {
  return String(v || '').trim().toLowerCase();
}

function getStripeKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY') || '';
  if (!key.startsWith('sk_')) throw new Error('STRIPE_SECRET_KEY invalid');
  return key;
}

function statusRank(status: string): number {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 5;
  if (s === 'trialing') return 4;
  if (s === 'past_due') return 3;
  if (s === 'incomplete') return 2;
  return 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripe = new Stripe(getStripeKey(), { apiVersion: '2024-06-20' });
    const email = normEmail(user.email);
    const userId = user.id || '';

    // Fetch Stripe customer(s)
    const customers = await stripe.customers.list({ email, limit: 20 });
    if (!customers.data.length) {
      return Response.json({ status: 'no_customer' });
    }

    const realCustomers = customers.data.filter((c) => typeof c.id === 'string' && c.id.startsWith('cus_'));
    const customerPool = realCustomers.length ? realCustomers : customers.data;

    // Collect all qualifying subscriptions
    const candidates: Stripe.Subscription[] = [];
    for (const customer of customerPool) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 50,
      });
      for (const sub of subs.data || []) {
        const status = String(sub.status || '').toLowerCase();
        if (['active', 'trialing', 'past_due', 'incomplete'].includes(status)) {
          candidates.push(sub);
        }
      }
    }

    if (!candidates.length) {
      return Response.json({ status: 'no_subscription' });
    }

    // Pick primary (best active subscription)
    const primary = [...candidates].sort((a, b) => {
      const aRank = statusRank(String(a.status || ''));
      const bRank = statusRank(String(b.status || ''));
      if (bRank !== aRank) return bRank - aRank;
      const aEnd = Number(a.current_period_end || 0);
      const bEnd = Number(b.current_period_end || 0);
      return bEnd - aEnd;
    })[0];

    // Build price ID → plan key map
    const priceMap: Record<string, string> = {
      [Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY') || '']: 'pipekeeper_pro_monthly',
      [Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL') || '']: 'pipekeeper_pro_annual',
      [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') || '']: 'whiskeykeeper_pro_monthly',
      [Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') || '']: 'whiskeykeeper_pro_annual',
      [Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY') || '']: 'cigarkeeper_pro_monthly',
      [Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL') || '']: 'cigarkeeper_pro_annual',
      [Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY') || '']: 'winekeeper_pro_monthly',
      [Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL') || '']: 'winekeeper_pro_annual',
      [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY') || '']: 'three_module_bundle_monthly',
      [Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL') || '']: 'three_module_bundle_annual',
      [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') || '']: 'four_module_bundle_monthly',
      [Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') || '']: 'four_module_bundle_annual',
      [Deno.env.get('VITE_STRIPE_FOUNDERS_MONTHLY') || '']: 'founders_bundle_monthly',
      [Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']: 'founders_bundle_annual',
    };

    function planKeyFromPrice(priceId: string | null): string | null {
      return priceId ? (priceMap[priceId] || null) : null;
    }

    function modulesFromPlanKey(key: string | null): string[] {
      const k = String(key || '').toLowerCase();
      if (k.startsWith('pipekeeper_')) return ['pipekeeper'];
      if (k.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
      if (k.startsWith('cigarkeeper_')) return ['cigarkeeper'];
      if (k.startsWith('winekeeper_')) return ['winekeeper'];
      if (k.includes('three_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
      if (k.includes('four_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
      if (k.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
      return [];
    }

    // Sync each candidate
    const allModules = new Set<string>();
    for (const sub of candidates) {
      const item = sub.items?.data?.[0];
      const priceId = item?.price?.id || null;
      const planKey = planKeyFromPrice(priceId);
      const billingInterval = item?.price?.recurring?.interval || 'year';
      const amount = item?.price?.unit_amount ? item.price.unit_amount / 100 : 0;
      const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;

      const modules = modulesFromPlanKey(planKey);
      modules.forEach((m) => allModules.add(m));

      const payload = {
        user_id: userId,
        user_email: email,
        provider: 'stripe',
        provider_subscription_id: sub.id,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        status: sub.status,
        plan_key: planKey,
        price_id: priceId,
        billing_interval: billingInterval === 'month' ? 'monthly' : 'annual',
        amount,
        modules_csv: modules.join(','),
        primary_module: modules[0] || null,
        bundle_name: modules.length > 1 ? (planKey?.includes('founders') ? 'Founders' : 'Bundle') : null,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        created_date: sub.created ? new Date(sub.created * 1000).toISOString() : null,
      };

      const existing = await base44.asServiceRole.entities.Subscription.filter({
        provider_subscription_id: sub.id,
      });

      if (existing?.length) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, payload);
      } else {
        await base44.asServiceRole.entities.Subscription.create(payload);
      }
    }

    // Update user
    const hasPaid = candidates.some((s) => ['active', 'trialing', 'past_due'].includes(String(s.status || '').toLowerCase()));
    const modulesCsv = Array.from(allModules).join(',');

    await base44.asServiceRole.entities.User.update(userId, {
      has_paid_access: hasPaid,
      subscription_level: hasPaid ? 'paid' : 'free',
      subscription_status: primary?.status,
      entitlement_tier: hasPaid ? 'pro' : 'free',
      pipekeeper_paid: allModules.has('pipekeeper'),
      whiskeykeeper_paid: allModules.has('whiskeykeeper'),
      cigarkeeper_paid: allModules.has('cigarkeeper'),
      winekeeper_paid: allModules.has('winekeeper'),
      paid_modules_csv: hasPaid ? modulesCsv : '',
      stripe_customer_id: typeof primary?.customer === 'string' ? primary.customer : (primary?.customer as any)?.id,
    });

    return Response.json({
      status: 'synced',
      hasPaid,
      moduleCount: allModules.size,
      subscriptionCount: candidates.length,
    });
  } catch (error) {
    console.error('[syncStripeSubscriptionsV2]', error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});