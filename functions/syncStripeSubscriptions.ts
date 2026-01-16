import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return Response.json({ ok: false, error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    let synced = 0;
    let updatedUsers = 0;
    let skippedNoEmail = 0;
    let skippedNoUser = 0;

    // Pull both active + trialing subscriptions
    const statuses = ['active', 'trialing'];

    for (const status of statuses) {
      let startingAfter = undefined;

      while (true) {
        const page = await stripe.subscriptions.list({
          status,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
          expand: ['data.customer'],
        });

        for (const sub of page.data) {
          const customer = sub.customer;

          // Determine user email: prefer subscription metadata, then customer email
          const emailRaw =
            sub.metadata?.user_email || (customer && typeof customer === 'object' ? customer.email : '') || '';
          const user_email = String(emailRaw || '').trim().toLowerCase();

          if (!user_email) {
            skippedNoEmail++;
            continue;
          }

          // Check if subscription already exists
          const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: sub.id,
          });

          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          const payload = {
            user_email,
            status: sub.status,
            stripe_subscription_id: sub.id,
            stripe_customer_id: typeof customer === 'string' ? customer : customer?.id,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: periodEnd,
            cancel_at_period_end: sub.cancel_at_period_end || false,
            billing_interval: sub.items?.data?.[0]?.price?.recurring?.interval || 'year',
            amount: sub.items?.data?.[0]?.price?.unit_amount
              ? sub.items?.data?.[0]?.price?.unit_amount / 100
              : 19.99,
          };

          if (existingSubs && existingSubs.length > 0) {
            await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, payload);
          } else {
            await base44.asServiceRole.entities.Subscription.create(payload);
          }

          synced++;

          // Update matching user record (if exists)
          const allUsers = await base44.asServiceRole.entities.User.filter({ email: user_email });

          if (!allUsers || allUsers.length === 0) {
            skippedNoUser++;
            continue;
          }

          const userRecord = allUsers[0];
          if ((userRecord.subscription_level || '').toLowerCase() !== 'paid') {
            await base44.asServiceRole.entities.User.update(userRecord.id, {
              subscription_level: 'paid',
            });
            updatedUsers++;
          }
        }

        if (!page.has_more) break;
        startingAfter = page.data[page.data.length - 1]?.id;
        if (!startingAfter) break;
      }
    }

    return Response.json({
      ok: true,
      synced,
      updatedUsers,
      skippedNoEmail,
      skippedNoUser,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});