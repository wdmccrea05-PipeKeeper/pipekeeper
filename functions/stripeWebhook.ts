import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata.user_email;

        if (session.mode === 'subscription') {
          // Get or create subscription record
          const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ 
            user_email: userEmail 
          });

          const subscriptionData = {
            user_email: userEmail,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
            current_period_start: new Date(session.subscription_details?.start_date || Date.now()).toISOString(),
            current_period_end: new Date(session.subscription_details?.end_date || Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
          };

          if (existingSubs.length > 0) {
            await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, subscriptionData);
          } else {
            await base44.asServiceRole.entities.Subscription.create(subscriptionData);
          }

          // Update user subscription level
          await base44.asServiceRole.auth.updateUser(userEmail, {
            subscription_level: 'paid'
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userEmail = customer.email;

        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_subscription_id: subscription.id 
        });

        if (existingSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          });

          // Update user status if subscription is active
          if (subscription.status === 'active') {
            await base44.asServiceRole.auth.updateUser(userEmail, {
              subscription_level: 'paid'
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userEmail = customer.email;

        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_subscription_id: subscription.id 
        });

        if (existingSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
            status: 'canceled',
          });

          // Update user subscription level
          await base44.asServiceRole.auth.updateUser(userEmail, {
            subscription_level: 'free'
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});