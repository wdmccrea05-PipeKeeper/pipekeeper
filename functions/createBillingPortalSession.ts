import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
const APP_URL = Deno.env.get('APP_URL') || 'https://pipekeeper.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prefer user.stripe_customer_id first (canonical source)
    let customerId = user.stripe_customer_id || null;

    // Fall back to Subscription entity if not on user
    if (!customerId) {
      const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
      if (subscriptions && subscriptions.length) {
        const withCustomer = subscriptions.find(s => s && s.stripe_customer_id);
        customerId = withCustomer ? withCustomer.stripe_customer_id : null;
      }
    }

    if (!customerId) {
      return Response.json({
        error: 'No subscription customer exists for this account yet. Please start a subscription first.',
      }, { status: 400 });
    }

    // Prefer APP_URL; origin is optional as a fallback
    const origin = req.headers.get('origin');
    const appUrl = origin && origin.startsWith('http') ? origin : APP_URL;
    const return_url = `${appUrl}/Profile`;

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error('createBillingPortalSession error:', error);
    return Response.json({ error: error && error.message ? error.message : 'Failed to create portal session' }, { status: 500 });
  }
});