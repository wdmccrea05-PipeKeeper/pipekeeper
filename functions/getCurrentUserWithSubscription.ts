import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let authUser = null;
    try {
      authUser = await base44.auth.me();
    } catch (err) {
      console.warn("[getCurrentUserWithSubscription] auth.me() failed:", err);
      return Response.json({ user: null, subscription: null });
    }

    if (!authUser?.email) {
      return Response.json({ user: null, subscription: null });
    }

    const email = (authUser.email || "").trim().toLowerCase();
    const userId = authUser.id || authUser.auth_user_id;

    // Try to get entity user record (may not exist yet for new users)
    let entityUser = null;
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      entityUser = allUsers.find(
        (u) => (u.email || "").trim().toLowerCase() === email
      );
    } catch (err) {
      console.warn("[getCurrentUserWithSubscription] Could not fetch User entity:", err);
    }

    // Merge auth user with entity user (entity user is optional)
    const user = {
      ...entityUser,
      ...authUser,
      email,
    };

    // Fetch subscription if we have user data
    let subscription = null;
    if (userId || email) {
      try {
        let subs = [];
        if (userId) {
          subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: userId });
        }
        if (subs.length === 0 && email) {
          subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
        }

        if (subs && subs.length > 0) {
          const unwrapped = subs.map(s => s.data || s);
          const valid = unwrapped.filter((s) => {
            const status = s.status || "";
            return ["active", "trialing", "trial", "past_due", "incomplete"].includes(status);
          });

          if (valid.length > 0) {
            valid.sort((a, b) => {
              const aPro = (a.tier || '').toLowerCase() === 'pro' ? 1 : 0;
              const bPro = (b.tier || '').toLowerCase() === 'pro' ? 1 : 0;
              if (aPro !== bPro) return bPro - aPro;

              const aActive = a.status === "active" ? 1 : 0;
              const bActive = b.status === "active" ? 1 : 0;
              if (aActive !== bActive) return bActive - aActive;

              const aTrialing = a.status === "trialing" || a.status === "trial" ? 1 : 0;
              const bTrialing = b.status === "trialing" || b.status === "trial" ? 1 : 0;
              if (aTrialing !== bTrialing) return bTrialing - aTrialing;

              const aDate = new Date(a.current_period_start || a.created_date || 0).getTime();
              const bDate = new Date(b.current_period_start || b.created_date || 0).getTime();
              return bDate - aDate;
            });
            subscription = valid[0];
          }
        }
      } catch (err) {
        console.warn("[getCurrentUserWithSubscription] Subscription query failed:", err);
      }
    }

    return Response.json({
      user,
      subscription,
    });
  } catch (error) {
    console.error("[getCurrentUserWithSubscription] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});