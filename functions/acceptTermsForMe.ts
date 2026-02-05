// functions/acceptTermsForMe.ts
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.id || !me?.email) {
      return Response.json({ ok: false, error: "Missing auth identity" }, { status: 401 });
    }

    const userId = me.id;
    const email = (me.email || "").trim().toLowerCase();
    const srv = base44.asServiceRole;

    const now = new Date().toISOString();

    // Load all matching profiles (by user_id and by email)
    const [byId, byEmail] = await Promise.all([
      srv.entities.UserProfile.filter({ user_id: userId }).catch(() => []),
      srv.entities.UserProfile.filter({ user_email: email }).catch(() => []),
    ]);

    let profiles = [
      ...(Array.isArray(byId) ? byId : []),
      ...(Array.isArray(byEmail) ? byEmail : []),
    ].filter(Boolean);

    // De-dupe by id
    const seen = new Set<string>();
    profiles = profiles.filter((p: any) => {
      const id = p?.id;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // If none exist, create one
    if (!profiles.length) {
      const created = await srv.entities.UserProfile.create({
        user_id: userId,
        user_email: email,
        subscription_tier: "free",
        tos_accepted: true,
        tos_accepted_at: now,
      });
      return Response.json({ ok: true, updated: 1, created: created?.id || null });
    }

    // Update ALL matches so the gate clears regardless of which profile is chosen
    let updated = 0;
    for (const p of profiles as any[]) {
      try {
        await srv.entities.UserProfile.update(p.id, {
          user_id: userId,
          user_email: email,
          tos_accepted: true,
          tos_accepted_at: now,
        });
        updated += 1;
      } catch (e) {
        console.error("[acceptTermsForMe] update failed for profile", p?.id, e);
      }
    }

    return Response.json({ ok: true, updated });
  } catch (error: any) {
    console.error("[acceptTermsForMe]", error);
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
});