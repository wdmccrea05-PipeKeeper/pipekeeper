import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.id || !me?.email) {
      return Response.json({ ok: false, error: "Missing auth identity" }, { status: 401 });
    }

    const userId = me.id;
    const email = String(me.email).trim().toLowerCase();
    const srv = base44.asServiceRole;
    const now = new Date().toISOString();

    const buckets: any[] = [];

    const add = (arr: any) => {
      if (Array.isArray(arr)) buckets.push(...arr);
    };

    // Pull every plausible match (duplicates are common in your current state)
    add(await srv.entities.UserProfile.filter({ user_id: userId }).catch(() => []));
    add(await srv.entities.UserProfile.filter({ user_email: email }).catch(() => []));
    add(await srv.entities.UserProfile.filter({ created_by: userId }).catch(() => []));
    add(await srv.entities.UserProfile.filter({ created_by: email }).catch(() => []));

    // De-dupe by id
    const seen = new Set<string>();
    const profiles = buckets.filter((p: any) => {
      const id = p?.id;
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (!profiles.length) {
      const created = await srv.entities.UserProfile.create({
        user_id: userId,
        user_email: email,
        subscription_tier: "free",
        tos_accepted: true,
        tos_accepted_at: now,
      });

      return Response.json({
        ok: true,
        created: created?.id || null,
        updated: 1,
        matched: 0,
      });
    }

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
        console.error("[acceptTermsForMe] update failed:", p?.id, e);
      }
    }

    return Response.json({
      ok: true,
      matched: profiles.length,
      updated,
    });
  } catch (error: any) {
    console.error("[acceptTermsForMe]", error);
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
});