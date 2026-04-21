/**
 * Repair existing subscriptions with price_id and modules_csv from Stripe.
 *
 * Admin-only. Fetches active Stripe subscriptions and backfills missing product metadata.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2024-06-20' });

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

    // Fetch all Stripe subscriptions (active only for repair)
    let repaired = 0;
    let noChange = 0;
    const errors: string[] = [];

    for (const [priceId, planKey] of Object.entries(priceMap)) {
      if (!priceId) continue;

      try {
        const subs = await stripe.subscriptions.list({
          limit: 100,
          price: priceId,
        });

        for (const stripeSub of subs.data || []) {
          const modules = modulesFromPlanKey(planKey);
          const dbSubs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: stripeSub.id,
          });

          if (!dbSubs?.length) continue;

          const dbSub = dbSubs[0];
          const needsUpdate =
            !dbSub.price_id ||
            !dbSub.modules_csv ||
            !dbSub.plan_key ||
            !dbSub.primary_module;

          if (!needsUpdate) {
            noChange++;
            continue;
          }

          await base44.asServiceRole.entities.Subscription.update(dbSub.id, {
            price_id: priceId,
            plan_key: planKey,
            modules_csv: modules.join(','),
            primary_module: modules[0] || null,
            bundle_name: modules.length > 1 ? planKey.includes('founders') ? 'Founders' : 'Bundle' : null,
          });

          repaired++;
        }
      } catch (e) {
        errors.push(`Price ${priceId}: ${e?.message}`);
      }
    }

    return Response.json({
      status: 'complete',
      repaired,
      noChange,
      errors,
      message: `Repaired ${repaired} subscriptions, ${noChange} already had data`,
    });
  } catch (error) {
    console.error('[repairSubscriptionsV2]', error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});