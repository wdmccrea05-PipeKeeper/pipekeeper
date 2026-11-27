import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  APPRECIATION_CAMPAIGN_ID,
  normEmail,
  loadUserGrants,
  resolveGrantState,
} from "../../shared/appreciationCampaign.ts";

const ALLOWED_EVENTS = new Set([
  "impression",
  "dismissal",
  "activation_confirmation_view",
  "expired_notice",
  "feature_use",
]);

/**
 * Aggregate funnel event recorder. Client-supplied email, ids, status or
 * timestamps are never trusted: the collector is taken from the session and
 * the timestamp is server-generated.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const eventType = String(body?.event_type || "").trim();
    if (!ALLOWED_EVENTS.has(eventType)) {
      return Response.json({ error: "Unsupported event_type" }, { status: 400 });
    }

    const email = normEmail(me.email);
    const feature = body?.feature ? String(body.feature).slice(0, 80) : null;
    const module = body?.module ? String(body.module).slice(0, 40) : "account";
    const surface = body?.surface ? String(body.surface).slice(0, 60) : null;

    const grants = await loadUserGrants(base44, email);
    const grant = grants.length > 0 ? grants[0] : null;
    const state = resolveGrantState(grant);

    // Feature usage only counts while complimentary access is live.
    if (eventType === "feature_use" && !state.active) {
      return Response.json({ ok: true, recorded: false, reason: "no_active_grant" });
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (eventType === "impression") {
      const existing = await base44.asServiceRole.entities.AppreciationCampaignEvent
        .filter({ campaign_id: APPRECIATION_CAMPAIGN_ID, user_email: email, event_type: "impression" }, "-created_date", 1)
        .catch(() => []);
      if (Array.isArray(existing) && existing.length > 0) {
        return Response.json({ ok: true, recorded: false, reason: "duplicate_impression" });
      }
    }

    if (eventType === "feature_use" && feature) {
      const dayStart = new Date(nowMs - (nowMs % 86400000)).toISOString();
      const today = await base44.asServiceRole.entities.AppreciationCampaignEvent
        .filter({ campaign_id: APPRECIATION_CAMPAIGN_ID, user_email: email, event_type: "feature_use", feature }, "-created_date", 20)
        .catch(() => []);
      const already = (Array.isArray(today) ? today : []).some(
        (row) => new Date(row.created_date || row.occurred_at || 0).getTime() >= new Date(dayStart).getTime()
      );
      if (already) {
        return Response.json({ ok: true, recorded: false, reason: "already_recorded_today" });
      }
    }

    await base44.asServiceRole.entities.AppreciationCampaignEvent.create({
      campaign_id: APPRECIATION_CAMPAIGN_ID,
      user_email: email,
      event_type: eventType,
      feature,
      module,
      surface,
      occurred_at: nowIso,
      grant_id: state.grantId || null,
    });

    return Response.json({ ok: true, recorded: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}