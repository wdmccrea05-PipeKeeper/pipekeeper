/**
 * Server-side subscription sync guard
 * Single choke point for all UserProfile subscription writes
 * 
 * Enforces rules:
 * - Stripe customer_id ALWAYS wins
 * - Apple receipt can't override Stripe
 * - Prevents accidental apple defaults
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const {
      user_id,
      source, // "stripe" or "apple"
      stripe_customer_id,
      stripe_subscription_id,
      apple_original_transaction_id,
      subscription_status,
      subscription_tier,
      subscription_level,
    } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
    }

    // Validate source
    if (source === "stripe" && !stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Stripe sync requires stripe_customer_id" }),
        { status: 400 }
      );
    }

    if (source === "apple" && !apple_original_transaction_id) {
      return new Response(
        JSON.stringify({ error: "Apple sync requires apple_original_transaction_id" }),
        { status: 400 }
      );
    }

    // Read existing profile
    const rows = await base44.asServiceRole.entities.UserProfile.filter({ user_id });
    const profile = rows?.[0];

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "UserProfile not found", user_id }),
        { status: 404 }
      );
    }

    // Check if Stripe already exists
    const hasStripe = !!(profile.stripe_customer_id || profile.stripeCustomerId);

    // If writing Apple but Stripe exists, refuse to override
    if (source === "apple" && hasStripe) {
      // Still allow generic field updates, but don't write Apple IDs
      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        subscription_status: subscription_status ?? profile.subscription_status,
        subscription_tier: subscription_tier ?? profile.subscription_tier,
        subscription_level: subscription_level ?? profile.subscription_level,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          note: "Stripe already present; Apple IDs not written.",
          profile_id: profile.id,
        }),
        { status: 200 }
      );
    }

    // Build patch
    const patch = {
      subscription_status: subscription_status ?? profile.subscription_status,
      subscription_tier: subscription_tier ?? profile.subscription_tier,
      subscription_level: subscription_level ?? profile.subscription_level,
    };

    // Add provider-specific fields
    if (source === "stripe") {
      patch.stripe_customer_id = stripe_customer_id;
      if (stripe_subscription_id) {
        patch.stripe_subscription_id = stripe_subscription_id;
      }
      // Optionally set platform for tracking
      patch.platform = "web";
    }

    if (source === "apple") {
      patch.apple_original_transaction_id = apple_original_transaction_id;
      // Optionally set platform for tracking
      patch.platform = "ios";
    }

    // Perform update
    await base44.asServiceRole.entities.UserProfile.update(profile.id, patch);

    return new Response(
      JSON.stringify({
        ok: true,
        profile_id: profile.id,
        provider: source,
        fields_written: Object.keys(patch),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[subscriptionSync] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
});