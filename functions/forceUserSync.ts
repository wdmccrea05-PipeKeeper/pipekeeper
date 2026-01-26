import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return Response.json({ error: "userEmail required" }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    
    // Find user's Stripe customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });
    
    if (!customers.data.length) {
      return Response.json({ error: "No Stripe customer found" }, { status: 404 });
    }
    
    const customer = customers.data[0];
    
    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1
    });
    
    if (!subscriptions.data.length) {
      return Response.json({ 
        error: "No active subscription found",
        customer_id: customer.id
      }, { status: 404 });
    }
    
    const sub = subscriptions.data[0];
    
    // Update user entitlements
    await base44.asServiceRole.auth.updateUser(userEmail, {
      isPaid: true,
      hasPremium: true,
      tier: "premium"
    });
    
    // Upsert subscription
    const existing = await base44.asServiceRole.entities.Subscription.filter({
      user_email: userEmail
    });
    
    const subData = {
      user_email: userEmail,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      tier: "premium",
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      amount: 19.99,
      billing_interval: "year"
    };
    
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.Subscription.update(existing[0].id, subData);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subData);
    }
    
    return Response.json({
      ok: true,
      message: "User synced successfully",
      userEmail,
      customer_id: customer.id,
      subscription_id: sub.id,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString()
    });
    
  } catch (error) {
    return Response.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});