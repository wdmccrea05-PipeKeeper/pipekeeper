import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');

const APP_URL = Deno.env.get('APP_URL') || 'https://pipekeeper.app';
// Global testing/free-access period ends at 11:59:59 PM Eastern on Jan 15, 2026
// (UTC: 2026-01-16T04:59:59.000Z). If a user subscribes before this cutoff,
// we create the Stripe subscription in "trialing" status so billing begins
// automatically when the testing period ends.
const TRIAL_END_UTC = Deno.env.get('TRIAL_END_UTC') || '2026-01-16T04:59:59.000Z';
// Optional allowlist: comma-separated Stripe Price IDs
const ALLOWED_PRICE_IDS = (Deno.env.get('ALLOWED_PRICE_IDS') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedPrice(priceId) {
  if (!ALLOWED_PRICE_IDS.length) return false; // fail closed - require explicit allowlist
  return ALLOWED_PRICE_IDS.includes(priceId);
}

function isIOSCompanionRequest(req) {
  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") || "").toLowerCase();
  return platform === "ios";
}

Deno.serve(async (req) => {
  // iOS compliance: Block checkout for iOS companion
  if (isIOSCompanionRequest(req)) {
    return Response.json(
      { error: "Not available in iOS companion app." },
      { status: 403 }
    );
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload = null;
    try {
      payload = await req.json();
    } catch (_e) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const priceId = payload && payload.priceId ? String(payload.priceId) : null;
    if (!priceId) {
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
    }

    if (!isAllowedPrice(priceId)) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    // Prefer the user field first (your canonical store), then fall back to Subscription records
    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
      if (subscriptions && subscriptions.length) {
        const withCustomer = subscriptions.find(s => s && s.stripe_customer_id);
        customerId = withCustomer ? withCustomer.stripe_customer_id : null;
      }
    }

    // Create Stripe customer if missing
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          user_email: user.email,
        },
      });
      customerId = customer.id;

      // Persist customer id on user (your stated canonical field)
      await base44.auth.updateUser(user.email, {
        stripe_customer_id: customerId,
      });
    }

    // Determine payment mode
    const price = await stripe.prices.retrieve(priceId);
    const mode = price && price.type === 'recurring' ? 'subscription' : 'payment';

    // Use APP_URL only (secure + consistent across all environments)
    const appUrl = APP_URL.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/Subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/Subscription?canceled=true`,
      // This is what your webhook reads:
      metadata: {
        user_email: user.email,
        user_id: user.id,
      },
      // Durable identity for subscription webhook events
      ...(mode === 'subscription'
        ? (() => {
            const trialEndMs = Date.parse(TRIAL_END_UTC);
            const nowMs = Date.now();
            const trialEndUnix = Number.isFinite(trialEndMs)
              ? Math.floor(trialEndMs / 1000)
              : null;

            // If we're still in the testing window, defer billing until the cutoff.
            // Stripe requires trial_end to be a future timestamp.
            const useTrialEnd = !!trialEndUnix && nowMs < trialEndMs;

            return {
              subscription_data: {
                metadata: {
                  user_email: user.email,
                  user_id: user.id,
                },
                ...(useTrialEnd ? { trial_end: trialEndUnix } : {}),
              },
            };
          })()
        : {}),
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ error: error && error.message ? error.message : 'Server error' }, { status: 500 });
  }
});