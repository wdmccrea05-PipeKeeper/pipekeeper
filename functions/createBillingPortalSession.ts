import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has a Stripe customer ID in their subscription record
    const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    const stripeCustomerId = subscriptions[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      return Response.json({
        error: 'No subscription customer exists for this account yet. Please start a subscription first.',
      }, { status: 400 });
    }

    // Get the app URL from the request origin
    const appUrl = req.headers.get('origin') || 'https://pipekeeper.app';
    const return_url = `${appUrl}/Profile`;

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error('createBillingPortalSession error:', error);
    return Response.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
});