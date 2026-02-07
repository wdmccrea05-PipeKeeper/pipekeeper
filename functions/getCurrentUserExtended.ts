import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = (authUser.email || "").trim().toLowerCase();

    // Get all users and find the current user by email (workaround for SDK bug)
    const allUsers = await base44.asServiceRole.entities.User.list();
    const entityUser = allUsers.find(
      (u) => (u.email || "").trim().toLowerCase() === email
    );

    // Merge auth user with entity user
    const merged = {
      ...entityUser,
      ...authUser,
      email,
    };

    return Response.json(merged);
  } catch (error) {
    console.error("[getCurrentUserExtended] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});