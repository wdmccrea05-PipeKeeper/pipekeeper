// Utility function: Log subscription integration events
// Can be called from other functions or webhooks
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      event_source,
      event_type,
      success,
      error,
      user_id,
      email,
      stripe_customer_id,
      stripe_subscription_id,
      payload_json,
    } = await req.json();

    if (!event_source || !event_type || success === undefined) {
      return Response.json({ 
        error: "Missing required fields: event_source, event_type, success" 
      }, { status: 400 });
    }

    await base44.asServiceRole.entities.SubscriptionIntegrationEvent.create({
      event_source,
      event_type,
      success,
      error: error || null,
      user_id: user_id || null,
      email: email || null,
      stripe_customer_id: stripe_customer_id || null,
      stripe_subscription_id: stripe_subscription_id || null,
      payload_json: payload_json ? JSON.stringify(payload_json) : null,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[logSubscriptionEvent] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});