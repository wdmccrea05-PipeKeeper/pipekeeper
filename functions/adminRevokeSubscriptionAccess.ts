import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin check
    if (user?.role !== "admin") {
      return json(403, { ok: false, message: "Admin access required" });
    }

    const body = await req.json().catch(() => ({}));
    const { email, notes = "" } = body;

    if (!email) {
      return json(400, { ok: false, message: "Email is required" });
    }

    const emailLower = String(email).trim().toLowerCase();

    // Find user
    const srv = base44.asServiceRole;
    let targetUser = null;

    try {
      const users = await srv.entities.User.filter({ email: emailLower });
      targetUser = users?.[0];
    } catch (e) {
      console.warn("[adminRevokeSubscriptionAccess] User filter failed:", e);
    }

    if (!targetUser) {
      return json(404, { ok: false, message: "User not found" });
    }

    // Revoke access
    try {
      await srv.entities.User.update(targetUser.id, {
        subscriptionSource: "manual",
        subscriptionStatus: "inactive",
        subscriptionUpdatedAt: new Date().toISOString(),
      });

      // Fetch updated user
      const updatedUser = await srv.entities.User.get(targetUser.id);

      console.log(`[Admin] Revoked subscription for ${emailLower}`);

      return json(200, {
        ok: true,
        message: "Access revoked",
        user: updatedUser,
      });
    } catch (e) {
      console.error("[adminRevokeSubscriptionAccess] Update failed:", e);
      return json(500, { ok: false, message: "Failed to update user" });
    }
  } catch (e) {
    console.error("[adminRevokeSubscriptionAccess] Error:", e);
    return json(500, { ok: false, message: String(e?.message || e) });
  }
});