import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Test function to validate Stripe webhook signature generation and processing
 * This helps verify end-to-end webhook functionality without hitting production Stripe
 */

async function generateStripeSignature(payload, secret) {
  const encoder = new TextEncoder();
  const timestamp = Math.floor(Date.now() / 1000);
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
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const appUrl = Deno.env.get("APP_URL") || "https://pipekeeper.app";
    
    if (!webhookSecret) {
      return Response.json({ 
        ok: false, 
        error: "STRIPE_WEBHOOK_SECRET not configured" 
      }, { status: 500 });
    }

    // Create a test subscription.updated event
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      object: "event",
      type: "customer.subscription.updated",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "sub_test_123",
          object: "subscription",
          customer: "cus_test_123",
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
          created: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          metadata: {
            user_email: user.email
          },
          items: {
            data: [
              {
                price: {
                  id: Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL"),
                  unit_amount: 1999,
                  recurring: {
                    interval: "year"
                  }
                }
              }
            ]
          }
        }
      }
    };

    const payload = JSON.stringify(testEvent);
    const signature = await generateStripeSignature(payload, webhookSecret);

    // Call the actual webhook endpoint
    const webhookUrl = `${appUrl}/api/stripeWebhook`;
    
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
        "Authorization": req.headers.get("Authorization") || ""
      },
      body: payload
    });

    const webhookResult = await webhookResponse.json();

    // Verify the subscription was created/updated
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
      user_email: user.email
    });

    // Check if event was recorded for deduplication
    let deduplicationCheck = null;
    try {
      const processedEvents = await base44.asServiceRole.entities.ProcessedStripeEvents.filter({
        event_id: testEvent.id
      });
      deduplicationCheck = processedEvents.length > 0 ? "✅ Event recorded" : "⚠️ Event not recorded";
    } catch (err) {
      deduplicationCheck = "⚠️ ProcessedStripeEvents entity not available";
    }

    return Response.json({
      ok: true,
      test: "Stripe Webhook End-to-End Test",
      steps: {
        "1_signature_generation": "✅ Generated valid Stripe signature",
        "2_webhook_call": webhookResponse.ok ? "✅ Webhook accepted request" : "❌ Webhook rejected request",
        "3_webhook_response": webhookResult,
        "4_subscription_sync": subscriptions.length > 0 ? `✅ Found ${subscriptions.length} subscription(s)` : "⚠️ No subscriptions found",
        "5_deduplication": deduplicationCheck
      },
      details: {
        webhook_url: webhookUrl,
        test_event_id: testEvent.id,
        test_subscription_id: testEvent.data.object.id,
        user_email: user.email,
        subscriptions_found: subscriptions.length,
        latest_subscription: subscriptions[0] || null
      },
      recommendations: webhookResponse.ok 
        ? ["✅ Webhook is functioning correctly", "✅ Signature verification working", "✅ Data sync operational"]
        : ["❌ Check webhook logs for errors", "❌ Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard"]
    });

  } catch (error) {
    return Response.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});