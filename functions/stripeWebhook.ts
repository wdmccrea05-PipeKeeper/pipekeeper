import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

function isoFromUnixSeconds(sec) {
  if (!sec) return null;
  return new Date(sec * 1000).toISOString();
}

async function upsertSubscription(base44, where, data) {
  const existing = await base44.asServiceRole.entities.Subscription.filter(where);
  if (existing && existing.length > 0) {
    await base44.asServiceRole.entities.Subscription.update(existing[0].id, data);
    return existing[0];
  }
  return await base44.asServiceRole.entities.Subscription.create(data);
}

async function setUserFields(base44, email, fields) {
  if (!email) return;
  await base44.asServiceRole.auth.updateUser(email, fields);
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No stripe-signature header' }, { status: 400 });
    }
    if (!webhookSecret) {
      return Response.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // We rely on your Checkout Session metadata.
        const userEmail = session.metadata && session.metadata.user_email ? session.metadata.user_email : null;

        // Only care about subscription checkouts
        if (session.mode !== 'subscription') break;

        const customerId = session.customer || null;
        const subscriptionId = session.subscription || null;

        // Persist customer on user if possible
        if (userEmail && customerId) {
          await setUserFields(base44, userEmail, { stripe_customer_id: customerId });
        }

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);

          const subRow = {
            user_email: userEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            status: sub.status,
            current_period_start: isoFromUnixSeconds(sub.current_period_start),
            current_period_end: isoFromUnixSeconds(sub.current_period_end),
            cancel_at_period_end: !!sub.cancel_at_period_end,
          };

          await upsertSubscription(
            base44,
            { stripe_subscription_id: sub.id },
            subRow
          );

          // Mark paid if active or trialing (you can tighten this if you only want active)
          if (userEmail && (sub.status === 'active' || sub.status === 'trialing')) {
            await setUserFields(base44, userEmail, { subscription_level: 'paid' });
          }
        }

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;

        // Retrieve customer to get email (works as long as customer has email set)
        const customer = await stripe.customers.retrieve(customerId);
        const userEmail = customer && customer.email ? customer.email : null;

        if (userEmail && customerId) {
          await setUserFields(base44, userEmail, { stripe_customer_id: customerId });
        }

        const subRow = {
          user_email: userEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_start: isoFromUnixSeconds(sub.current_period_start),
          current_period_end: isoFromUnixSeconds(sub.current_period_end),
          cancel_at_period_end: !!sub.cancel_at_period_end,
        };

        await upsertSubscription(base44, { stripe_subscription_id: sub.id }, subRow);

        // Paid if active or trialing, otherwise free
        if (userEmail) {
          const paid = sub.status === 'active' || sub.status === 'trialing';
          await setUserFields(base44, userEmail, { subscription_level: paid ? 'paid' : 'free' });
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const userEmail = customer && customer.email ? customer.email : null;

        await upsertSubscription(
          base44,
          { stripe_subscription_id: sub.id },
          { status: 'canceled', cancel_at_period_end: true }
        );

        if (userEmail) {
          await setUserFields(base44, userEmail, { subscription_level: 'free' });
        }

        break;
      }

      // ✅ IMPORTANT for "paid vs delinquent"
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        const userEmail = customer && customer.email ? customer.email : null;

        if (userEmail) {
          await setUserFields(base44, userEmail, { subscription_level: 'paid' });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        const userEmail = customer && customer.email ? customer.email : null;

        // Choose one behavior:
        // (A) Keep access until Stripe marks subscription past_due/unpaid via subscription.updated
        // (B) Immediately downgrade on failed payment
        // I recommend (A) for user experience; so we do nothing here except optionally log.
        // If you WANT (B), uncomment:
        // if (userEmail) await setUserFields(base44, userEmail, { subscription_level: 'free' });

        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('stripeWebhook error:', err);
    return Response.json({ error: err && err.message ? err.message : 'Webhook error' }, { status: 400 });
  }
});