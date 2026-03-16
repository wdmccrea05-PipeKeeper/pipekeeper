/**
 * Create a checkout session for module/bundle purchase
 * Handles individual modules, bundles, and founders offer
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

// Price ID mappings from secrets
const PRICE_IDS = {
  'pipekeeper_monthly': Deno.env.get('STRIPE_PRICE_PIPEKEEPER_MONTHLY'),
  'pipekeeper_annual': Deno.env.get('STRIPE_PRICE_PIPEKEEPER_ANNUAL'),
  'whiskeykeeper_monthly': Deno.env.get('STRIPE_PRICE_WHISKEYKEEPER_MONTHLY'),
  'whiskeykeeper_annual': Deno.env.get('STRIPE_PRICE_WHISKEYKEEPER_ANNUAL'),
  'cigarkeeper_monthly': Deno.env.get('STRIPE_PRICE_CIGARKEEPER_MONTHLY'),
  'cigarkeeper_annual': Deno.env.get('STRIPE_PRICE_CIGARKEEPER_ANNUAL'),
  'winekeeper_monthly': Deno.env.get('STRIPE_PRICE_WINEKEEPER_MONTHLY'),
  'winekeeper_annual': Deno.env.get('STRIPE_PRICE_WINEKEEPER_ANNUAL'),
  'bundle_3_monthly': Deno.env.get('STRIPE_PRICE_BUNDLE3_MONTHLY'),
  'bundle_3_annual': Deno.env.get('STRIPE_PRICE_BUNDLE3_ANNUAL'),
  'bundle_4_monthly': Deno.env.get('STRIPE_PRICE_BUNDLE4_MONTHLY'),
  'bundle_4_annual': Deno.env.get('STRIPE_PRICE_BUNDLE4_ANNUAL'),
  'founders': Deno.env.get('STRIPE_PRICE_FOUNDERS'),
};

const APP_URL = Deno.env.get('APP_URL') || 'https://collectionkeeper.app';

/**
 * Map module to price ID
 */
function getModulePriceId(module, billingPeriod) {
  const key = `${module}_${billingPeriod}`;
  return PRICE_IDS[key];
}

/**
 * Map bundle type to price ID
 */
function getBundlePriceId(bundleType, billingPeriod) {
  const key = `${bundleType}_${billingPeriod}`;
  return PRICE_IDS[key];
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { type, modules, billingPeriod = 'monthly', successUrl, cancelUrl } = payload;

    if (!type || !modules || !Array.isArray(modules) || modules.length === 0) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email,
          metadata: {
            user_id: user.id || user.auth_user_id,
            user_email: user.email,
          },
        }),
      });

      if (!customerRes.ok) {
        console.error('Failed to create Stripe customer:', await customerRes.text());
        return Response.json({ error: 'Failed to create customer' }, { status: 500 });
      }

      const customer = await customerRes.json();
      customerId = customer.id;

      // Store customer ID on user
      try {
        await base44.auth.updateMe({ stripe_customer_id: customerId });
      } catch (err) {
        console.warn('Failed to store stripe_customer_id:', err?.message);
      }
    }

    // Build line items based on type
    let lineItems = [];

    if (type === 'single') {
      // Individual module purchase
      const module = modules[0];
      const priceId = getModulePriceId(module, billingPeriod);

      if (!priceId) {
        return Response.json(
          { error: `No price configured for ${module} ${billingPeriod}` },
          { status: 400 }
        );
      }

      lineItems.push({ price: priceId, quantity: 1 });
    } else if (type === 'bundle_3' || type === 'bundle_4') {
      // Bundle purchase
      const priceId = getBundlePriceId(type, billingPeriod);

      if (!priceId) {
        return Response.json(
          { error: `No price configured for ${type} ${billingPeriod}` },
          { status: 400 }
        );
      }

      lineItems.push({ price: priceId, quantity: 1 });
    } else if (type === 'founders') {
      // Founders offer (one-time)
      const priceId = PRICE_IDS.founders;

      if (!priceId) {
        return Response.json({ error: 'Founders offer not configured' }, { status: 400 });
      }

      lineItems.push({ price: priceId, quantity: 1 });
    } else {
      return Response.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    // Create checkout session
    const checkoutUrl = successUrl || `${APP_URL}/SubscriptionSuccess`;
    const checkoutCancelUrl = cancelUrl || `${APP_URL}/Subscription`;

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        payment_method_types: 'card',
        line_items: JSON.stringify(lineItems),
        mode: type === 'founders' ? 'payment' : 'subscription',
        success_url: checkoutUrl,
        cancel_url: checkoutCancelUrl,
        metadata: {
          user_id: user.id || user.auth_user_id,
          user_email: user.email,
          purchase_type: type,
          modules: modules.join(','),
          billing_period: billingPeriod,
        },
      }),
    });

    if (!sessionRes.ok) {
      const error = await sessionRes.text();
      console.error('Stripe session creation failed:', error);
      return Response.json({ error: 'Checkout session creation failed' }, { status: 500 });
    }

    const session = await sessionRes.json();

    return Response.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[createModuleCheckoutSession]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});