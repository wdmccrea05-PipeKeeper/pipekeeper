import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

function isoFromUnixSeconds(sec) {
  if (!sec) return null;
  return new Date(sec * 1000).toISOString();
}

async function resolveUserEmailFromStripe(opts) {
  const metadataEmail = opts && opts.metadataEmail ? opts.metadataEmail : null;
  const customerId = opts && opts.customerId ? opts.customerId : null;
  const invoiceCustomerEmail = opts && opts.invoiceCustomerEmail ? opts.invoiceCustomerEmail : null;
  const invoiceEmail = opts && opts.invoiceEmail ? opts.invoiceEmail : null;

  if (metadataEmail) return metadataEmail;
  if (invoiceCustomerEmail) return invoiceCustomerEmail;
  if (invoiceEmail) return invoiceEmail;

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      // customer can be a deleted customer object
      const email = customer && customer.email ? customer.email : null;
      if (email) return email;
    } catch (_e) {
      // ignore
    }
  }

  return null;
}

async function upsertSubscriptionByEmail(base44, userEmail, data) {
  const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
    user_email: userEmail,
  });

  if (existingSubs && existingSubs.length > 0) {
    await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, data);
    return existingSubs[0].id;
  } else {
    const created = await base44.asServiceRole.entities.Subscription.create(data);
    return created && created.id ? created.id : null;
  }
}

async function upsertSubscriptionByStripeSubscriptionId(base44, stripeSubscriptionId, data) {
  const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
    stripe_subscription_id: stripeSubscriptionId,
  });

  if (existingSubs && existingSubs.length > 0) {
    await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, data);
    return existingSubs[0].id;
  } else {
    const created = await base44.asServiceRole.entities.Subscription.create(data);
    return created && created.id ? created.id : null;
  }
}

Deno.serve(async (req) => {
  try {
    if (!webhookSecret) {
      return Response.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No stripe-signature header' }, { status: 400 });
    }

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    const base44 = createClientFromRequest(req);

    switch (event.type) {
      // =========================
      // CHECKOUT COMPLETED
      // =========================
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode !== 'subscription') break;

        const customerId = session.customer || null;
        const subscriptionId = session.subscription || null;

        const userEmail = await resolveUserEmailFromStripe({
          metadataEmail: session.metadata && session.metadata.user_email ? session.metadata.user_email : null,
          customerId,
        });

        if (!userEmail) {
          console.warn('checkout.session.completed: could not resolve user email');
          break;
        }

        const subData = {
          user_email: userEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          // Checkout doesn't always provide real period dates; subscription/invoice events will overwrite later
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        };

        await upsertSubscriptionByEmail(base44, userEmail, subData);

        await base44.asServiceRole.auth.updateUser(userEmail, { subscription_level: 'paid' });

        break;
      }

      // =========================
      // SUBSCRIPTION CREATED / UPDATED
      // =========================
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer || null;

        const userEmail = await resolveUserEmailFromStripe({ customerId });
        if (!userEmail) {
          console.warn(event.type + ': could not resolve user email', { customerId });
          break;
        }

        const status = subscription.status;

        const subData = {
          user_email: userEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: status,
          current_period_start: isoFromUnixSeconds(subscription.current_period_start) || new Date().toISOString(),
          current_period_end:
            isoFromUnixSeconds(subscription.current_period_end) ||
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: !!subscription.cancel_at_period_end,
        };

        await upsertSubscriptionByStripeSubscriptionId(base44, subscription.id, subData);

        if (status === 'active' || status === 'trialing') {
          await base44.asServiceRole.auth.updateUser(userEmail, { subscription_level: 'paid' });
        } else {
          // strict enforcement
          await base44.asServiceRole.auth.updateUser(userEmail, { subscription_level: 'free' });
        }

        break;
      }

      // =========================
      // SUBSCRIPTION DELETED
      // =========================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer || null;

        const userEmail = await resolveUserEmailFromStripe({ customerId });
        if (!userEmail) {
          console.warn('customer.subscription.deleted: could not resolve user email', { customerId });
          break;
        }

        await upsertSubscriptionByStripeSubscriptionId(base44, subscription.id, {
          status: 'canceled',
          cancel_at_period_end: true,
        });

        await base44.asServiceRole.auth.updateUser(userEmail, { subscription_level: 'free' });

        break;
      }

      // =========================
      // INVOICE PAID (RENEWALS SAFETY NET)
      // =========================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer || null;

        const userEmail = await resolveUserEmailFromStripe({
          customerId,
          invoiceCustomerEmail: invoice.customer_email || null,
          invoiceEmail: invoice.email || null,
        });

        if (!userEmail) {
          console.warn('invoice.payment_succeeded: could not resolve user email', { customerId });
          break;
        }

        const subscriptionId = invoice.subscription || null;
        if (subscriptionId) {
          await upsertSubscriptionByStripeSubscriptionId(base44, subscriptionId, {
            user_email: userEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
          });
        }

        await base44.asServiceRole.auth.updateUser(userEmail, { subscription_level: 'paid' });

        break;
      }

      // =========================
      // INVOICE FAILED
      // =========================
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer || null;

        const userEmail = await resolveUserEmailFromStripe({
          customerId,
          invoiceCustomerEmail: invoice.customer_email || null,
          invoiceEmail: invoice.email || null,
        });

        if (!userEmail) {
          console.warn('invoice.payment_failed: could not resolve user email', { customerId });
          break;
        }

        const subscriptionId = invoice.subscription || null;
        if (subscriptionId) {
          await upsertSubscriptionByStripeSubscriptionId(base44, subscriptionId, {
            user_email: userEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'past_due',
          });
        }

        // strict enforcement
        await base44.asServiceRole.auth.updateUser(userEmail, { subscription_level: 'free' });

        break;
      }

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error && error.message ? error.message : 'Webhook error' }, { status: 400 });
  }
});