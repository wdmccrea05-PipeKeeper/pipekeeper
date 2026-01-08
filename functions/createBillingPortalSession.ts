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

    // Prefer canonical field on user
    let customerId = user.stripe_customer_id || null;

    // Fallback: look up customerId from Subscription entity (service role for reliability)
    if (!customerId) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: user.email,
      });

      if (subs && subs.length) {
        const withCustomer = subs.find((s) => s && s.stripe_customer_id);
        customerId = withCustomer ? withCustomer.stripe_customer_id : null;
      }
    }

    if (!customerId) {
      return Response.json(
        {
          error:
            'No Stripe customer found for this account yet. Please start a subscription first.',
        },
        { status: 400 }
      );
    }

    // If we found it via Subscription, persist it to the user record (service role!)
    if (!user.stripe_customer_id && customerId) {
      await base44.asServiceRole.auth.updateUser(user.email, {
        stripe_customer_id: customerId,
      });
    }

    // Return URL back into app
    const origin = req.headers.get('origin');
    const appUrl = origin && origin.startsWith('http') ? origin : APP_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/Profile`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error('createBillingPortalSession error:', error);
    return Response.json(
      { error: error?.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
});