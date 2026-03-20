/**
 * Create Stripe checkout session for module-based subscription
 * Handles single module, 3-module bundle, 4-module bundle, and founders plans
 * 
 * Validates all price IDs before attempting checkout creation
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Plan to Stripe product mapping
const PLAN_TO_STRIPE_PRICE = {
  // Single module plans
  'pipekeeper_pro_monthly': Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
  'pipekeeper_pro_annual': Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
  'whiskeykeeper_pro_monthly': Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
  'whiskeykeeper_pro_annual': Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
  'cigarkeeper_pro_monthly': Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
  'cigarkeeper_pro_annual': Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
  'winekeeper_pro_monthly': Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY'),
  'winekeeper_pro_annual': Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL'),

  // Bundle plans
  'three_module_bundle_monthly': Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
  'three_module_bundle_annual': Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
  'four_module_bundle_monthly': Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
  'four_module_bundle_annual': Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),

  // Founders plan
  'founders_bundle_annual': Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL'),
};

/**
 * Validate price ID exists for plan
 */
function validatePlanPriceId(planKey) {
  const priceId = PLAN_TO_STRIPE_PRICE[planKey];
  if (!priceId) {
    const error = new Error(`Stripe price ID not configured for plan: ${planKey}`);
    error.code = 'MISSING_PRICE_ID';
    error.planKey = planKey;
    throw error;
  }
  return priceId;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planKey, selectedModules, successUrl, cancelUrl } = await req.json();

    if (!planKey) {
      return Response.json(
        { error: 'Plan key is required' },
        { status: 400 }
      );
    }

    // Validate price ID exists for this plan
    let priceId;
    try {
      priceId = validatePlanPriceId(planKey);
    } catch (err) {
      console.error('[Checkout] Validation error:', err);
      return Response.json(
        { 
          error: `Checkout not available for this plan. Please select a different option.`,
          code: 'MISSING_PRICE_ID',
          details: {
            planKey,
            missingEnvVar: `VITE_STRIPE_${planKey.toUpperCase()}`,
          }
        },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId;
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id || user.auth_user_id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session with metadata for 3-module bundles
    const metadata = {};
    if (planKey.includes('three_module') && selectedModules && Array.isArray(selectedModules)) {
      // Preserve exact module selection as JSON string for later parsing
      metadata.activeModules = JSON.stringify(selectedModules.slice(0, 3));
      metadata.planType = 'three_module_bundle';
    } else if (planKey.includes('four_module')) {
      metadata.planType = 'four_module_bundle';
    } else if (planKey.includes('founders')) {
      metadata.planType = 'founders';
    } else {
      // Single module
      metadata.planType = 'single_module';
      metadata.module = selectedModules?.[0] || 'pipekeeper';
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      customer_update: {
        address: 'auto',
      },
    });

    return Response.json({
      sessionUrl: session.url,
      sessionId: session.id,
      planKey,
      priceId,
    });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error);
    return Response.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
});