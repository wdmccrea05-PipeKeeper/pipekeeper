// Admin-only endpoint: Check Stripe secret status in runtime
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function maskKey(key: string): string {
  if (!key || key.length < 12) return "***";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    const status = {
      present: !!key,
      prefix: key.slice(0, 3) || "missing",
      masked: key ? maskKey(key) : null,
      length: key.length,
      isLive: key.startsWith("sk_live_"),
      isTest: key.startsWith("sk_test_"),
      isValid: key.startsWith("sk_"),
      timestamp: new Date().toISOString(),
      environment: key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown",
    };

    return Response.json(status);
  } catch (error) {
    console.error("[stripeSecretStatus] Error:", error);
    return Response.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
});