/**
 * publicShare — the only way a share is read.
 *
 * The recipient never reads SharedRecord or a collection entity directly.
 * This function validates the link (revoked / inactive / expired), loads the
 * records with service role, and returns only the fields the canonical
 * projection allows. Owners can call it with preview:true to see exactly what
 * a recipient sees without counting a view.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import {
  buildSharePayload,
  shareState,
  SHARE_FIELDS,
  SHARE_MODULE_META,
  NEVER_SHARED,
  SHARE_DISCLOSURE,
} from "../../shared/shareProjection.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const srv = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "view");

    if (action === "catalog") {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return json(401, { error: "unauthorized" });
      return json(200, {
        modules: Object.entries(SHARE_MODULE_META).map(([key, meta]) => ({
          key,
          entity: meta.entity,
          label: meta.label,
          plural: meta.plural,
          fields: SHARE_FIELDS[key as keyof typeof SHARE_FIELDS] || [],
        })),
        never_shared: [...NEVER_SHARED],
        disclosure: SHARE_DISCLOSURE,
      });
    }

    const token = String(body.token || "").trim();
    if (!token) return json(400, { error: "token_required" });

    const shares = await srv.entities.SharedRecord.filter({ share_token: token });
    const share = Array.isArray(shares) ? shares[0] : null;
    if (!share) return json(404, { error: "not_found" });

    const preview = body.preview === true;
    if (preview) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || (user.email !== share.owner_email && user.role !== "admin")) {
        return json(403, { error: "forbidden" });
      }
    }

    const state = shareState(share);
    if (!state.active) return json(410, { error: state.reason });

    const meta = SHARE_MODULE_META[share.module_type as keyof typeof SHARE_MODULE_META];
    if (!meta) return json(400, { error: "unsupported_module" });
    const entity = srv.entities[meta.entity];
    if (!entity) return json(400, { error: "unsupported_module" });

    let records: any[] = [];
    if (share.share_kind === "record" || (!Array.isArray(share.record_ids) && share.record_id)) {
      const record = await entity.get(share.record_id).catch(() => null);
      if (record) records = [record];
    } else if (Array.isArray(share.record_ids) && share.record_ids.length > 0) {
      const ids = share.record_ids.slice(0, 200);
      const rows = await entity.filter({ id: { $in: ids } }).catch(() => []);
      const byId = new Map((Array.isArray(rows) ? rows : []).map((row: any) => [row.id, row]));
      records = ids.map((id: string) => byId.get(id)).filter(Boolean) as any[];
    }

    // Only records the owner actually created can travel through a share.
    records = records.filter((record) => !record.created_by || record.created_by === share.owner_email);

    const profileRows = await srv.entities.UserProfile.filter({ user_email: share.owner_email }).catch(() => []);
    const profile = Array.isArray(profileRows) ? profileRows[0] : null;

    const payload = buildSharePayload(share, records, profile);

    if (!preview) {
      await srv.entities.SharedRecord.update(share.id, {
        view_count: (share.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return json(200, { ...payload, preview });
  } catch (error: any) {
    return json(500, { error: "share_unavailable", message: String(error?.message || error) });
  }
});