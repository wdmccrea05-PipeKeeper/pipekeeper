import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = caller.role === "admin";
    if (!isAdmin) {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body.email || "").trim().toLowerCase();
    const tier = (body.tier || "").toLowerCase().trim();

    if (!targetEmail || !["free", "pro", "premium"].includes(tier)) {
      return Response.json(
        { error: "Missing or invalid email/tier" },
        { status: 400 }
      );
    }

    // Get all users and find by email (workaround for SDK bug)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const user = allUsers.find(
      (u) => (u.email || "").toLowerCase() === targetEmail
    );

    if (!user) {
      return Response.json({ error: `User not found: ${targetEmail}` }, { status: 404 });
    }

    // Update entitlement_tier
    await base44.asServiceRole.entities.User.update(user.id, {
      entitlement_tier: tier,
    });

    return Response.json({
      ok: true,
      userId: user.id,
      email: user.email,
      entitlement_tier: tier,
      updated: true,
    });
  } catch (error) {
    console.error("[SET_ENTITLEMENT] Error:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});