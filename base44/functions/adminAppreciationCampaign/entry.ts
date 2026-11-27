import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import {
  APPRECIATION_CAMPAIGN_ID,
  normEmail,
  loadCampaignConfig,
  evaluateEligibility,
  resolveGrantState,
  publicCampaign,
} from "../../shared/appreciationCampaign.ts";

function toMs(raw) {
  const parsed = new Date(raw || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function groupByEmail(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normEmail(row.user_email || row.email);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

/**
 * Administrative control and reporting for the appreciation campaign.
 * Admin-only. Actions: report | update | grants | grant_detail.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (String(me.role || "").toLowerCase() !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "report");

    if (action === "update") {
      const config = await loadCampaignConfig(base44);
      const patch = {};
      if (typeof body.is_enabled === "boolean") patch.is_enabled = body.is_enabled;
      if (body.eligibility_cutoff !== undefined) patch.eligibility_cutoff = body.eligibility_cutoff || null;
      if (body.redemption_deadline !== undefined) patch.redemption_deadline = body.redemption_deadline || null;
      if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).slice(0, 500) : null;
      patch.updated_by = normEmail(me.email);

      const saved = config.record
        ? await base44.asServiceRole.entities.AppreciationCampaignConfig.update(config.record.id, patch)
        : await base44.asServiceRole.entities.AppreciationCampaignConfig.create({
            campaign_id: APPRECIATION_CAMPAIGN_ID,
            is_enabled: true,
            eligibility_cutoff: publicCampaign(config).eligibility_cutoff,
            ...patch,
          });

      return Response.json({ ok: true, campaign: { ...publicCampaign(config), ...saved } });
    }

    if (action === "grants") {
      const grants = await fetchAllEntitiesServer(
        base44.asServiceRole.entities.AppreciationGrant,
        { campaign_id: APPRECIATION_CAMPAIGN_ID },
        "-created_date",
        500,
        20
      );
      const rows = grants.slice(0, 200).map((grant) => ({
        id: grant.id,
        user_email: grant.user_email,
        activated_at: grant.activated_at,
        expires_at: grant.expires_at,
        status: resolveGrantState(grant).status,
        source: grant.source,
      }));
      return Response.json({ ok: true, total: grants.length, grants: rows });
    }

    if (action === "grant_detail") {
      const email = normEmail(body?.email);
      if (!email) return Response.json({ error: "email is required" }, { status: 400 });
      const grants = await base44.asServiceRole.entities.AppreciationGrant
        .filter({ campaign_id: APPRECIATION_CAMPAIGN_ID, user_email: email }, "created_date", 20);
      const events = await base44.asServiceRole.entities.AppreciationCampaignEvent
        .filter({ campaign_id: APPRECIATION_CAMPAIGN_ID, user_email: email }, "-created_date", 50);
      return Response.json({
        ok: true,
        email,
        grants: (Array.isArray(grants) ? grants : []).map((grant) => ({
          ...grant,
          effective: resolveGrantState(grant),
        })),
        events: Array.isArray(events) ? events : [],
      });
    }

    // ---- report ----
    const config = await loadCampaignConfig(base44);
    const [users, grants, subscriptions, events] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.User, {}, "created_date", 5000, 20),
      fetchAllEntitiesServer(base44.asServiceRole.entities.AppreciationGrant, { campaign_id: APPRECIATION_CAMPAIGN_ID }, "created_date", 5000, 20),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 20),
      fetchAllEntitiesServer(base44.asServiceRole.entities.AppreciationCampaignEvent, { campaign_id: APPRECIATION_CAMPAIGN_ID }, "-created_date", 5000, 40),
    ]);

    const nowMs = Date.now();
    const grantsByEmail = groupByEmail(grants);
    const subsByEmail = groupByEmail(subscriptions);

    let eligibleNow = 0;
    let paidAccounts = 0;
    for (const user of users) {
      const email = normEmail(user.email);
      const userGrants = grantsByEmail.get(email) || [];
      const userSubs = subsByEmail.get(email) || [];
      if (user.has_paid_access === true) paidAccounts += 1;
      const result = evaluateEligibility({ config, user, grants: userGrants, subscriptions: userSubs, nowMs });
      if (result.eligible) eligibleNow += 1;
    }

    const grantStates = grants.map((grant) => resolveGrantState(grant, nowMs));
    const activeGrants = grantStates.filter((state) => state.active).length;
    const expiredGrants = grantStates.filter((state) => !state.active).length;

    const uniqueByEvent = (type) => new Set(events.filter((e) => e.event_type === type).map((e) => normEmail(e.user_email))).size;

    const featureCounts = {};
    for (const event of events) {
      if (event.event_type !== "feature_use" || !event.feature) continue;
      featureCounts[event.feature] = (featureCounts[event.feature] || 0) + 1;
    }

    // Attribution rule (documented in the campaign report): a conversion is the
    // first subscription created for a grant holder at or after that grant's
    // activation. Revenue counts that subscription's first-invoice amount once.
    const conversions = [];
    for (const grant of grants) {
      const email = normEmail(grant.user_email);
      const state = resolveGrantState(grant, nowMs);
      const activatedMs = toMs(grant.activated_at);
      const expiresMs = toMs(state.expiresAt || grant.expires_at);
      const candidates = (subsByEmail.get(email) || [])
        .map((sub) => ({ sub, at: toMs(sub.started_at || sub.subscriptionStartedAt || sub.created_date) }))
        .filter((row) => row.at >= activatedMs)
        .sort((a, b) => a.at - b.at);
      if (candidates.length === 0) continue;
      conversions.push({
        email,
        grantActivatedAt: grant.activated_at,
        convertedAt: new Date(candidates[0].at).toISOString(),
        amount: Number(candidates[0].sub.amount || 0),
        within7: candidates[0].at <= expiresMs + 7 * 86400000,
        within14: candidates[0].at <= expiresMs + 14 * 86400000,
        within30: candidates[0].at <= expiresMs + 30 * 86400000,
      });
    }

    const activations = grants.length;
    const revenue = conversions.reduce((sum, row) => sum + row.amount, 0);

    return Response.json({
      ok: true,
      campaign: publicCampaign(config),
      generated_at: new Date().toISOString(),
      population: {
        total_accounts: users.length,
        paid_accounts: paidAccounts,
        eligible_now: eligibleNow,
      },
      funnel: {
        impressions: uniqueByEvent("impression"),
        dismissals: uniqueByEvent("dismissal"),
        activations,
        activation_rate: eligibleNow > 0 ? Number((activations / (eligibleNow + activations)).toFixed(4)) : 0,
      },
      grants: { active: activeGrants, expired: expiredGrants, total: grants.length },
      engagement: { by_feature: featureCounts },
      conversion: {
        conversions_total: conversions.length,
        conversions_within_7d: conversions.filter((c) => c.within7).length,
        conversions_within_14d: conversions.filter((c) => c.within14).length,
        conversions_within_30d: conversions.filter((c) => c.within30).length,
        campaign_conversion_rate: activations > 0 ? Number((conversions.length / activations).toFixed(4)) : 0,
        attributed_first_invoice_revenue: Number(revenue.toFixed(2)),
        attribution_rule:
          "First subscription created at or after the grant activation for a grant holder; first-invoice amount counted once.",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}