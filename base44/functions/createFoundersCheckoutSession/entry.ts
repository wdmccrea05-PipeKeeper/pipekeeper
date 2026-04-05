import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@15.0.0';

function getStripeClient() {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
}

/**
 * Create Stripe checkout session for Founders Bundle
 * Only available to users who subscribed to PipeKeeper before Feb 1, 2026
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { billingInterval = 'year' } = await req.json();
    const FOUNDERS_CUTOFF = new Date('2026-02-01T00:00:00.000Z');
    const email = user.email.toLowerCase().trim();

    // Any account (free or paid) created before the founders cutoff is eligible
    const FOUNDERS_CUTOFF_CHECK = new Date('2026-02-01T00:00:00.000Z');
    const accountCreatedDate = new Date(user.created_date);
    const isEligible = accountCreatedDate < FOUNDERS_CUTOFF_CHECK;

    if (!isEligible) {
      return Response.json({ error: 'Not eligible for Founders Bundle' }, { status: 403 });
    }

    // Get Stripe client
    const stripe = getStripeClient();

    // Determine price ID based on interval
    // Founders Bundle: PipeKeeper + WhiskeyKeeper
    // Price IDs should be set in environment
    const priceId = billingInterval === 'month'
      ? Deno.env.get('STRIPE_PRICE_ID_FOUNDERS_MONTHLY') || 'price_founders_monthly'
      : Deno.env.get('STRIPE_PRICE_ID_FOUNDERS_ANNUAL') || 'price_founders_annual';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get('APP_URL')}/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/Subscription`,
      metadata: {
        bundle_type: 'founders',
        user_email: email,
        interval: billingInterval,
      },
    });

    return Response.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Founders checkout error:', error);
    return Response.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
});