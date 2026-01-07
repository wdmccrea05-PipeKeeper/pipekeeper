import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://pipekeeper.app';

if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY env var');
}

const stripe = new Stripe(STRIPE_SECRET_KEY || '');

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async (req) => {
  // Optional: handle CORS preflight if your environment ever needs it
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return json({ error: 'Server is missing STRIPE_SECRET_KEY' }, 500);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Prefer user.stripe_customer_id first (canonical source)
    let customerId = user.stripe_customer_id || null;

    // Fall back to Subscription entity if not on user
    if (!customerId) {
      const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
      if (Array.isArray(subscriptions) && subscriptions.length) {
        const withCustomer = subscriptions.find((s) => s && s.stripe_customer_id);
        customerId = withCustomer ? withCustomer.stripe_customer_id : null;
      }
    }

    if (!customerId) {
      return json(
        {
          error:
            'No Stripe customer found for this account yet. Please start a subscription first.',
        },
        400
      );
    }

    // Always use canonical APP_URL for return URL (safer + consistent)
    const return_url = `${APP_URL.replace(/\/$/, '')}/Profile`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return json({ url: portalSession.url });
  } catch (error) {
    console.error('createBillingPortalSession error:', error);
    return json(
      { error: error && error.message ? String(error.message) : 'Failed to create portal session' },
      500
    );
  }
});