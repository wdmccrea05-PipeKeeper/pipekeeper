/**
 * Create Stripe checkout session for module-based subscription
 * 
 * HOTFIX: Canonical metadata is now written onto BOTH the checkout session
 * AND the Stripe Subscription object (via subscription_data.metadata) so
 * that the webhook can reliably sync the user on every subscription event,
 * even before a checkout.session.completed fires.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@13.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLAN_TO_STRIPE_PRICE = {
  'pipekeeper_pro_monthly': Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
  'pipekeeper_pro_annual': Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
  'whiskeykeeper_pro_monthly': Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
  'whiskeykeeper_pro_annual': Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
  'cigarkeeper_pro_monthly': Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
  'cigarkeeper_pro_annual': Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
  'winekeeper_pro_monthly': Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY'),
  'winekeeper_pro_annual': Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL'),
  'three_module_bundle_monthly': Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
  'three_module_bundle_annual': Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
  'four_module_bundle_monthly': Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
  'four_module_bundle_annual': Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),
  'founders_bundle_annual': Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL'),
  'founders_bundle_monthly': Deno.env.get('VITE_STRIPE_FOUNDERS_MONTHLY'),
};

/**
 * Build canonical metadata that is written to BOTH the checkout session
 * and the Stripe Subscription via subscription_data.metadata.
 * This ensures the webhook always has email + user_id regardless of
 * which event fires first.
 */
function buildCheckoutMetadata(planKey, selectedModules = [], user) {
  const allowedAppSlugs = new Set(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  const toValidAppSlug = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return allowedAppSlugs.has(normalized) ? normalized : 'pipekeeper';
  };

  const normalizedModules = Array.isArray(selectedModules)
    ? selectedModules.map((m) => String(m || '').trim().toLowerCase()).filter(Boolean)
    : [];

  const billingPeriod = planKey.includes('annual') ? 'annual' : 'monthly';

  let checkoutType = 'single_module';
  let productKind = 'module';
  let primaryModule = normalizedModules[0] || 'pipekeeper';
  let bundleName = '';
  let moduleCount = 1;
  let modulesCsv = primaryModule;
  let appSlug = toValidAppSlug(primaryModule || 'pipekeeper');

  if (planKey.includes('three_module')) {
    checkoutType = 'bundle_3';
    productKind = 'bundle';
    bundleName = 'three_module_bundle';
    moduleCount = Math.min(normalizedModules.length || 3, 3);
    modulesCsv = normalizedModules.slice(0, 3).join(',') || 'pipekeeper';
    primaryModule = normalizedModules[0] || 'pipekeeper';
    appSlug = toValidAppSlug(primaryModule || 'pipekeeper');
  } else if (planKey.includes('four_module')) {
    checkoutType = 'bundle_4';
    productKind = 'bundle';
    bundleName = 'four_module_bundle';
    moduleCount = 4;
    modulesCsv = normalizedModules.length
      ? normalizedModules.slice(0, 4).join(',')
      : 'pipekeeper,whiskeykeeper,cigarkeeper,winekeeper';
    primaryModule = normalizedModules[0] || 'pipekeeper';
    appSlug = 'pipekeeper';
  } else if (planKey.includes('founders')) {
    checkoutType = 'bundle_4';
    productKind = 'founders';
    bundleName = 'founders_bundle';
    moduleCount = 4;
    modulesCsv = 'pipekeeper,whiskeykeeper,cigarkeeper,winekeeper';
    primaryModule = 'pipekeeper';
    appSlug = 'pipekeeper';
  } else {
    checkoutType = 'single_module';
    productKind = 'module';
    moduleCount = 1;
    modulesCsv = primaryModule;
    appSlug = toValidAppSlug(primaryModule || 'pipekeeper');
  }

  const appEnvironment =
    String(Deno.env.get('APP_ENV') || Deno.env.get('ENVIRONMENT') || 'production').trim().toLowerCase();

  return {
    app: appSlug,
    app_slug: appSlug,
    app_environment: appEnvironment,
    legacy_app_slug: 'collectionkeeper',
    app_aliases: 'pipekeeper,collectionkeeper',
    user_email: String(user?.email || '').trim().toLowerCase(),
    user_id: String(user?.id || user?.auth_user_id || '').trim(),
    plan_key: planKey,
    billing_period: billingPeriod,
    checkout_type: checkoutType,
    product_kind: productKind,
    primary_module: primaryModule,
    bundle_name: bundleName,
    module_count: String(moduleCount),
    modules_csv: modulesCsv,
  };
}

Deno.serve(async (req) => {
  // Validate env vars up-front and log exact missing items
  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    console.error('[createCheckoutSession] FATAL: STRIPE_SECRET_KEY is missing');
    return Response.json({ error: 'Stripe configuration error. Please contact support.' }, { status: 500 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      planKey,
      selectedModules,
      successUrl,
      cancelUrl,
      // Billing intent fields — explicit action context from the UI
      actionType = 'new_purchase',
      currentPlanKey = null,
    } = await req.json();

    if (!planKey) {
      return Response.json({ error: 'Plan key is required' }, { status: 400 });
    }

    // Validate actionType — no silent fallback to a wrong checkout type
    const validActionTypes = ['new_purchase', 'upgrade_existing', 'add_complementary_module'];
    if (!validActionTypes.includes(actionType)) {
      console.error(`[createCheckoutSession] Invalid actionType="${actionType}" for planKey="${planKey}"`);
      return Response.json(
        { error: `Invalid action type: ${actionType}. Cannot start checkout.` },
        { status: 400 }
      );
    }

    const priceId = PLAN_TO_STRIPE_PRICE[planKey];
    if (!priceId) {
      console.error(`[createCheckoutSession] Missing price ID for planKey="${planKey}". Check VITE_STRIPE_* env vars.`);
      return Response.json(
        {
          error: 'Checkout not available for this plan. Please select a different option.',
          code: 'MISSING_PRICE_ID',
          details: { planKey },
        },
        { status: 400 }
      );
    }

    // For upgrade_existing: validate that currentPlanKey is provided and makes sense.
    // The actual subscription cancellation is handled by the client via handleBundleUpgrade
    // before calling this endpoint. We just log the intent here for audit purposes.
    if (actionType === 'upgrade_existing' && !currentPlanKey) {
      console.warn(`[createCheckoutSession] upgrade_existing called without currentPlanKey for planKey="${planKey}"`);
    }

    // For add_complementary_module: we create a new subscription checkout without
    // canceling the user's existing subscription. This is intentional — the user
    // keeps their current plan and adds a second one.
    if (actionType === 'add_complementary_module') {
      console.log(`[createCheckoutSession] add_complementary_module: adding "${planKey}" alongside "${currentPlanKey}"`);
    }

    // Get or create Stripe customer
    let customerId;
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: String(user?.id || user?.auth_user_id || ''),
          user_email: String(user?.email || '').trim().toLowerCase(),
        },
      });
      customerId = customer.id;
    }

    // Build canonical metadata — same object goes on session AND subscription
    const metadata = buildCheckoutMetadata(planKey, selectedModules || [], user);

    // Include billing intent in metadata for audit / webhook processing
    metadata.action_type = actionType;
    if (currentPlanKey) {
      metadata.current_plan_key = currentPlanKey;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Metadata on the session itself (for checkout.session.completed)
      metadata,
      // HOTFIX: Also write metadata onto the subscription so that
      // customer.subscription.* events carry user identity without
      // depending solely on the checkout session event.
      subscription_data: {
        metadata,
      },
      customer_update: { address: 'auto' },
    });

    if (!session?.url) {
      console.error('[createCheckoutSession] Stripe session created but no URL returned. Session ID:', session?.id);
      throw new Error('Stripe checkout session created without URL');
    }

    return Response.json({
      ok: true,
      url: session.url,
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
