// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.role || authUser.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN" 
      }, { status: 403 });
    }

    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: "Admin function routing is working"
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: "PING_FAILED",
      message: String(error?.message || error)
    }, { status: 500 });
  }
});