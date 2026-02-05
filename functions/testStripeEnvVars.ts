/**
 * Test Stripe Environment Variables
 * Verifies all required Stripe secrets are accessible
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const envVars = {
      STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY'),
      STRIPE_PRICE_ID_PREMIUM_MONTHLY: Deno.env.get('STRIPE_PRICE_ID_PREMIUM_MONTHLY'),
      STRIPE_PRICE_ID_PREMIUM_ANNUAL: Deno.env.get('STRIPE_PRICE_ID_PREMIUM_ANNUAL'),
      STRIPE_PRICE_ID_PRO_MONTHLY: Deno.env.get('STRIPE_PRICE_ID_PRO_MONTHLY'),
      STRIPE_PRICE_ID_PRO_ANNUAL: Deno.env.get('STRIPE_PRICE_ID_PRO_ANNUAL'),
      STRIPE_WEBHOOK_SECRET: Deno.env.get('STRIPE_WEBHOOK_SECRET'),
      APP_URL: Deno.env.get('APP_URL'),
      ALLOWED_PRICE_IDS: Deno.env.get('ALLOWED_PRICE_IDS'),
    };

    const results = {
      timestamp: new Date().toISOString(),
      user_email: user.email,
      status: 'OK',
      env_vars: {}
    };

    // Check each variable
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        // Show first 8 chars for secrets, full value for non-secrets
        const isSecret = key.includes('SECRET') || key.includes('KEY');
        results.env_vars[key] = isSecret 
          ? `${value.substring(0, 8)}...` 
          : value;
      } else {
        results.env_vars[key] = 'NOT_SET';
        results.status = 'MISSING_VARS';
      }
    }

    // Test Stripe API connection
    try {
      const Stripe = (await import('npm:stripe@17.6.0')).default;
      const stripe = new Stripe(envVars.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
      });

      // Simple API call to verify key works
      const prices = await stripe.prices.list({ limit: 1 });
      results.stripe_api_test = 'SUCCESS';
      results.stripe_test_details = `Connected OK, ${prices.data.length} price(s) found`;
    } catch (err) {
      results.stripe_api_test = 'FAILED';
      results.stripe_error = err.message;
    }

    return Response.json(results, {
      status: results.status === 'OK' ? 200 : 500,
    });
  } catch (err) {
    console.error('[TEST ERROR]', err);
    return Response.json({
      status: 'ERROR',
      error: err.message,
    }, { status: 500 });
  }
});