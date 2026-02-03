// Admin health check - verify deployment and routing
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    return Response.json({
      ok: true,
      service: "PipeKeeper Admin API",
      timestamp: new Date().toISOString(),
      deployment: "live",
      version: "2026-02-03-entitlement-fix",
      user: user.email,
    });
  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
});