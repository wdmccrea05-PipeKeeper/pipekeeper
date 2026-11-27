import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { APPRECIATION_CAMPAIGN_ID, normEmail } from "../../shared/appreciationCampaign.ts";

function toMs(raw) {
  const parsed = new Date(raw || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

/**
 * Campaign email performance, joined with the appreciation campaign's own
 * reporting so email-driven activations and conversions are visible next to
 * Facebook and organic in-app activations.
 * Admin-only.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (String(me.role || "").toLowerCase() !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [campaigns, recipients, events, appreciationEvents, subscriptions] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.EmailCampaign, {}, "-created_date", 500, 20),
      fetchAllEntitiesServer(base44.asServiceRole.entities.EmailCampaignRecipient, {}, "-created_date", 5000, 40),
      fetchAllEntitiesServer(base44.asServiceRole.entities.EmailCampaignEvent, {}, "-created_date", 5000, 40),
      fetchAllEntitiesServer(base44.asServiceRole.entities.AppreciationCampaignEvent, { campaign_id: APPRECIATION_CAMPAIGN_ID }, "-created_date", 5000, 40),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 20),
    ]);

    const byStatus = (status) => recipients.filter((row) => row.status === status).length;
    const clicks = recipients.filter((row) => row.clicked === true).length;
    const activatedRows = recipients.filter((row) => row.activated === true);
    const sent = byStatus("sent");

    const subsByEmail = new Map();
    for (const sub of subscriptions) {
      const key = normEmail(sub.user_email);
      if (!key) continue;
      if (!subsByEmail.has(key)) subsByEmail.set(key, []);
      subsByEmail.get(key).push(sub);
    }

    let conversions = 0;
    let revenue = 0;
    for (const row of activatedRows) {
      const activatedMs = toMs(row.activated_at);
      const candidates = (subsByEmail.get(normEmail(row.email)) || [])
        .map((sub) => ({ sub, at: toMs(sub.started_at || sub.subscriptionStartedAt || sub.created_date) }))
        .filter((item) => item.at >= activatedMs)
        .sort((a, b) => a.at - b.at);
      if (candidates.length === 0) continue;
      conversions += 1;
      revenue += Number(candidates[0].sub.amount || 0);
    }

    const surfaces = {};
    for (const event of appreciationEvents) {
      if (event.event_type !== "activation") continue;
      const surface = String(event.surface || "campaign_activation");
      surfaces[surface] = (surfaces[surface] || 0) + 1;
    }

    const eventCounts = {};
    for (const event of events) {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    }

    const campaignRows = campaigns.map((campaign) => {
      const own = recipients.filter((row) => row.campaign_id === campaign.id);
      const ownSent = own.filter((row) => row.status === "sent").length;
      const ownClicks = own.filter((row) => row.clicked === true).length;
      const ownActivations = own.filter((row) => row.activated === true).length;
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        created_date: campaign.created_date,
        scheduled_at: campaign.scheduled_at || null,
        approved_by: campaign.approved_by || null,
        sent_at: campaign.sent_at || null,
        eligible: campaign.audience_snapshot?.eligible ?? null,
        queued: campaign.queued_count || own.length,
        sent: ownSent,
        failed: own.filter((row) => row.status === "failed").length,
        bounced: own.filter((row) => row.status === "bounced").length,
        unsubscribed: own.filter((row) => row.status === "unsubscribed").length,
        clicks: ownClicks,
        activations: ownActivations,
        click_rate: rate(ownClicks, ownSent),
        activation_rate: rate(ownActivations, ownSent),
      };
    });

    return Response.json({
      ok: true,
      generated_at: new Date().toISOString(),
      totals: {
        eligible: campaigns.reduce((max, campaign) => Math.max(max, campaign.audience_snapshot?.eligible || 0), 0),
        queued: recipients.length,
        sent,
        delivered: sent,
        failed: byStatus("failed"),
        bounced: byStatus("bounced"),
        unsubscribed: byStatus("unsubscribed"),
        clicks,
        activations: activatedRows.length,
        conversions,
        attributable_revenue: Number(revenue.toFixed(2)),
        click_rate: rate(clicks, sent),
        activation_rate: rate(activatedRows.length, sent),
        conversion_rate: rate(conversions, activatedRows.length),
      },
      events: eventCounts,
      activation_channels: {
        email: surfaces.email_campaign || 0,
        facebook: surfaces.facebook_referral || 0,
        organic: surfaces.campaign_activation || 0,
      },
      campaigns: campaignRows,
      attribution_rule:
        "Email activations are counted when a collector clicked the campaign email and then activated; conversions are the first subscription created at or after that activation, first-invoice amount counted once.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}