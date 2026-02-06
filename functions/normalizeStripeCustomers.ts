// Admin-only utility: Normalize duplicate Stripe customers
// Finds best customer per email and backfills user records
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_utils/stripeClient.ts";

const normEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Find best Stripe customer for an email
 * Prefers customer with active subscription, then most recent
 */
async function findBestCustomer(stripe, email) {
  try {
    const customers = await stripe.customers.list({ email, limit: 100 });
    if (!customers?.data || customers.data.length === 0) return null;

    const customerIds = customers.data.map(c => c.id);
    const allSubs = [];
    
    for (const custId of customerIds) {
      try {
        const subs = await stripe.subscriptions.list({ customer: custId, limit: 10 });
        allSubs.push(...(subs.data || []).map(s => ({ ...s, _customerId: custId })));
      } catch (e) {
        console.warn(`Could not fetch subs for ${custId}:`, e);
      }
    }

    // Prefer customer with active subscription
    const activeSub = allSubs.find(s => s.status === "active" || s.status === "trialing");
    if (activeSub) {
      return activeSub._customerId;
    }

    // No active sub - return most recently created customer
    const sorted = [...customers.data].sort((a, b) => b.created - a.created);
    return sorted[0].id;
  } catch (err) {
    console.error("[findBestCustomer] Error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const stripe = getStripeClient();
    const users = await base44.asServiceRole.entities.User.list();

    let normalized = 0;
    let errors = [];

    for (const u of users) {
      if (!u.email) continue;

      const email = normEmail(u.email);
      const bestCustomerId = await findBestCustomer(stripe, email);

      if (!bestCustomerId) continue;

      // Update user if customer ID differs
      if (u.stripe_customer_id !== bestCustomerId) {
        try {
          await base44.asServiceRole.entities.User.update(u.id, {
            stripe_customer_id: bestCustomerId,
          });
          normalized++;
          console.log(`[normalize] Updated ${email} -> ${bestCustomerId}`);
        } catch (err) {
          errors.push({ email, error: err.message });
          console.error(`[normalize] Failed to update ${email}:`, err);
        }
      }
    }

    return Response.json({
      ok: true,
      normalized,
      total: users.length,
      errors,
    });
  } catch (error) {
    console.error("[normalizeStripeCustomers] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});