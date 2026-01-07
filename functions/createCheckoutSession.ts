import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');

const APP_URL = Deno.env.get('APP_URL') || 'https://pipekeeper.app';
// Optional allowlist: comma-separated Stripe Price IDs
const ALLOWED_PRICE_IDS = (Deno.env.get('ALLOWED_PRICE_IDS') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedPrice(priceId) {
  if (!ALLOWED_PRICE_IDS.length) return true; // if not configured, allow all (not ideal, but safe default)
  return ALLOWED_PRICE_IDS.includes(priceId);
}

Deno.serve(async (req) => {
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

    // Prefer APP_URL; origin is optional as a fallback
    const origin = req.headers.get('origin');
    const appUrl = origin && origin.startsWith('http') ? origin : APP_URL;

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
      // Optional, but recommended for subscriptions:
      // allow_promotion_codes: true,
      // billing_address_collection: 'auto',
      // customer_update: { address: 'auto', name: 'auto' },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ error: error && error.message ? error.message : 'Server error' }, { status: 500 });
  }
});