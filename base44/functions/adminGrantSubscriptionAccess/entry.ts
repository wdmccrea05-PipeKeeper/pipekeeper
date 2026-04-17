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
    const {
      email,
      status = "active",
      provider = "manual",
      billing_interval = null,
      modules = [],
      notes = "",
    } = body;

    if (!email) {
      return json(400, { ok: false, message: "Email is required" });
    }

    const emailLower = String(email).trim().toLowerCase();
    const normalizedStatus = String(status || "active").trim().toLowerCase();
    const normalizedProvider = String(provider || "manual").trim().toLowerCase();
    const activeStatuses = new Set(["active", "trialing", "past_due", "incomplete"]);
    const parsedModules = Array.isArray(modules)
      ? modules
      : String(modules || "").split(",");
    const paidModules = [...new Set(
      parsedModules
        .map((m: unknown) => String(m || "").trim().toLowerCase())
        .filter((m: string) => ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"].includes(m))
    )];
    const hasPaidAccess = activeStatuses.has(normalizedStatus) && paidModules.length > 0;

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
        subscriptionStatus: normalizedStatus,
        subscriptionUpdatedAt: new Date().toISOString(),
        subscription_provider: normalizedProvider === "apple" ? "apple" : "stripe",
        entitlement_tier: hasPaidAccess ? "pro" : "free",
        subscription_level: hasPaidAccess ? "paid" : "free",
        subscription_status: normalizedStatus,
        has_paid_access: hasPaidAccess,
        paid_modules_csv: hasPaidAccess ? paidModules.join(",") : "",
        pipekeeper_paid: hasPaidAccess && paidModules.includes("pipekeeper"),
        whiskeykeeper_paid: hasPaidAccess && paidModules.includes("whiskeykeeper"),
        cigarkeeper_paid: hasPaidAccess && paidModules.includes("cigarkeeper"),
        winekeeper_paid: hasPaidAccess && paidModules.includes("winekeeper"),
        ...(hasPaidAccess ? { subscription_tier: "pro" } : {}),
        data: {
          ...(targetUser.data || {}),
          entitlement_tier: hasPaidAccess ? "pro" : "free",
          subscription_level: hasPaidAccess ? "paid" : "free",
          subscription_status: normalizedStatus,
          subscription_provider: normalizedProvider,
          paid_modules_csv: hasPaidAccess ? paidModules.join(",") : "",
          pipekeeper_paid: hasPaidAccess && paidModules.includes("pipekeeper"),
          whiskeykeeper_paid: hasPaidAccess && paidModules.includes("whiskeykeeper"),
          cigarkeeper_paid: hasPaidAccess && paidModules.includes("cigarkeeper"),
          winekeeper_paid: hasPaidAccess && paidModules.includes("winekeeper"),
          billing_interval: billing_interval || null,
          admin_subscription_notes: String(notes || "").trim() || null,
          ...(hasPaidAccess ? { subscription_tier: "pro" } : {}),
        },
      });

      // Fetch updated user
      const updatedUser = await srv.entities.User.get(targetUser.id);

      // Log the action
      console.log(
        `[Admin] Granted subscription access to ${emailLower}: status=${normalizedStatus} provider=${normalizedProvider} modules=${paidModules.join(",") || "none"}`
      );

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
