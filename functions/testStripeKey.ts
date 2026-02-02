// Diagnostic: Check what Stripe key production is actually seeing
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    const masked = key ? `${key.substring(0, 7)}...${key.substring(key.length - 4)}` : "NOT_SET";
    const startsWithSk = key.startsWith("sk_");
    const isLive = key.startsWith("sk_live_");
    const isTest = key.startsWith("sk_test_");
    
    return Response.json({
      keyPresent: !!key,
      keyLength: key.length,
      masked,
      startsWithSk,
      isLive,
      isTest,
      timestamp: new Date().toISOString(),
      envCheck: {
        STRIPE_SECRET_KEY: masked,
        APP_URL: Deno.env.get("APP_URL") || "NOT_SET"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});