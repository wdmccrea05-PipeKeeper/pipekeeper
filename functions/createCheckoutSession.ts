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

    const { priceId } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Check if user already has a Stripe customer
    const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    let customerId = subscriptions[0]?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          user_email: user.email,
        },
      });
      customerId = customer.id;
    }

    // Get the price to determine if it's recurring or one-time
    const price = await stripe.prices.retrieve(priceId);
    const mode = price.type === 'recurring' ? 'subscription' : 'payment';

    // Create checkout session
    const appUrl = req.headers.get('origin') || 'https://your-app-url.com';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/Subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/Subscription?canceled=true`,
      metadata: {
        user_email: user.email,
        user_id: user.id,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});