import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Test utility for Stripe webhook - generates valid signatures for testing
 * This function simulates a real Stripe webhook call with proper signature
 */

async function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const signedPayload = `${timestamp}.${payload}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const signature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  return `t=${timestamp},v1=${signature}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return Response.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
    }

    // Test payload: subscription.created event
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      type: "customer.subscription.created",
      data: {
        object: {
          id: `sub_test_${Date.now()}`,
          customer: "cus_test_12345",
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 31536000, // +1 year
          created: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          metadata: {
            user_email: user.email
          },
          items: {
            data: [{
              price: {
                id: Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "price_test",
                unit_amount: 1999,
                recurring: { interval: "year" }
              }
            }]
          }
        }
      }
    };

    const payload = JSON.stringify(testEvent);
    const signature = await generateStripeSignature(payload, webhookSecret);

    // Call the webhook endpoint
    const webhookUrl = `${Deno.env.get("APP_URL") || "https://pipekeeper.app"}/api/stripeWebhook`;
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
        "Authorization": req.headers.get("Authorization") || ""
      },
      body: payload
    });

    const result = await response.json();
    
    // Verify subscription was created
    const subscriptions = await base44.entities.Subscription.filter({
      user_email: user.email
    });

    return Response.json({
      ok: true,
      webhook_response: {
        status: response.status,
        body: result
      },
      test_details: {
        event_type: testEvent.type,
        event_id: testEvent.id,
        user_email: user.email
      },
      verification: {
        subscription_created: subscriptions && subscriptions.length > 0,
        subscription_count: subscriptions?.length || 0,
        latest_subscription: subscriptions?.[subscriptions.length - 1]
      }
    });

  } catch (error) {
    return Response.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});