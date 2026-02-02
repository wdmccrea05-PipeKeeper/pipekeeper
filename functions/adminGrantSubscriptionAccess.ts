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
    const { email, tier = "premium", status = "active", notes = "" } = body;

    if (!email) {
      return json(400, { ok: false, message: "Email is required" });
    }

    const emailLower = String(email).trim().toLowerCase();

    // Get or create user
    const srv = base44.asServiceRole;
    let targetUser = null;

    try {
      const users = await srv.entities.User.filter({ email: emailLower });
      targetUser = users?.[0];
    } catch (e) {
      console.warn("[adminGrantSubscriptionAccess] User filter failed:", e);
    }

    if (!targetUser) {
      // Create user if doesn't exist
      try {
        targetUser = await srv.entities.User.create({
          email: emailLower,
          full_name: `User ${emailLower}`,
          role: "user",
        });
      } catch (e) {
        return json(500, { ok: false, message: "Failed to create user" });
      }
    }

    // Update subscription fields
    try {
      await srv.entities.User.update(targetUser.id, {
        subscriptionSource: "manual",
        subscriptionStatus: status,
        subscriptionTier: tier,
        subscriptionUpdatedAt: new Date().toISOString(),
      });

      // Fetch updated user
      const updatedUser = await srv.entities.User.get(targetUser.id);

      // Log the action
      console.log(`[Admin] Granted subscription to ${emailLower}: tier=${tier} status=${status}`);

      return json(200, {
        ok: true,
        message: "Access granted",
        user: updatedUser,
      });
    } catch (e) {
      console.error("[adminGrantSubscriptionAccess] Update failed:", e);
      return json(500, { ok: false, message: "Failed to update user" });
    }
  } catch (e) {
    console.error("[adminGrantSubscriptionAccess] Error:", e);
    return json(500, { ok: false, message: String(e?.message || e) });
  }
});