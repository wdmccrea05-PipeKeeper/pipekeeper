import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Compatibility endpoint. The canonical checkout function owns Stripe prices,
// duplicate-subscription checks, and webhook metadata for every plan.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Keep eligibility identical to checkFoundersEligibility.
    if (!Deno.env.get('FOUNDERS_CUTOFF_DATE')) {
      return Response.json({ error: 'Founders Bundle offer is not active' }, { status: 403 });
    }

    const { billingInterval = 'year' } = await req.json();
    if (!['month', 'year'].includes(billingInterval)) {
      return Response.json({ error: 'Invalid billing interval' }, { status: 400 });
    }

    const origin = String(Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    if (!origin || !/^https:\/\//.test(origin)) {
      return Response.json({ error: 'Checkout return URL is not configured' }, { status: 503 });
    }

    const response = await base44.functions.invoke('createCheckoutSession', {
      planKey: billingInterval === 'month' ? 'founders_bundle_monthly' : 'founders_bundle_annual',
      selectedModules: ['pipekeeper', 'whiskeykeeper'],
      actionType: 'new_purchase',
      successUrl: origin + '/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: origin + '/Subscription',
    });
    return Response.json(response?.data || response);
  } catch (error) {
    console.error('Founders checkout delegation error:', error);
    const status = error?.response?.status || 500;
    return Response.json(error?.response?.data || { error: 'Failed to start checkout' }, { status });
  }
});
