/**
 * Server-side helpers for the appreciation campaign email: audience building,
 * activation attribution and channel resolution. Kept apart from
 * appreciationEmail.ts so that module stays SDK-free and directly testable.
 */

import { fetchAllEntitiesServer } from "./fetchAllEntitiesServer.ts";
import { APPRECIATION_CAMPAIGN_ID, normEmail } from "./appreciationCampaign.ts";
import { EMAIL_TEMPLATE_KEY, classifyRecipient, summarizeAudience } from "./appreciationEmail.ts";

function groupByEmail(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const key = normEmail(row.email || row.user_email);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

/**
 * Recalculates the whole eligible population from live data.
 * Used by the dashboard preview and again by the sender, so the number an
 * administrator approves is the number that is actually mailed.
 */
export async function loadEmailAudience(base44, { config, languages = [], nowMs = Date.now() } = {}) {
  const [users, grants, subscriptions, suppressions, delivered] = await Promise.all([
    fetchAllEntitiesServer(base44.asServiceRole.entities.User, {}, "created_date", 5000, 40),
    fetchAllEntitiesServer(base44.asServiceRole.entities.AppreciationGrant, { campaign_id: APPRECIATION_CAMPAIGN_ID }, "created_date", 5000, 20),
    fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 20),
    fetchAllEntitiesServer(base44.asServiceRole.entities.EmailSuppression, {}, "-created_date", 5000, 20),
    fetchAllEntitiesServer(base44.asServiceRole.entities.EmailCampaignRecipient, { template_key: EMAIL_TEMPLATE_KEY, status: "sent" }, "-created_date", 5000, 20),
  ]);

  const grantsByEmail = groupByEmail(grants);
  const subsByEmail = groupByEmail(subscriptions);
  const suppressionByEmail = new Map();
  for (const row of suppressions) {
    const key = normEmail(row.email);
    if (key && !suppressionByEmail.has(key)) suppressionByEmail.set(key, row);
  }
  const emailed = new Set(delivered.map((row) => normEmail(row.email)).filter(Boolean));

  const results = [];
  const recipients = [];
  for (const user of users) {
    const email = normEmail(user.email);
    const verdict = classifyRecipient({
      user,
      grants: grantsByEmail.get(email) || [],
      subscriptions: subsByEmail.get(email) || [],
      suppression: suppressionByEmail.get(email) || null,
      alreadyEmailed: emailed.has(email),
      config,
      languages,
      nowMs,
    });
    results.push(verdict);
    if (verdict.eligible) {
      recipients.push({ email, user_id: user.id, language: verdict.language, created_date: user.created_date || null });
    }
  }

  return {
    results,
    recipients,
    summary: summarizeAudience(results),
    counts: {
      accounts: users.length,
      suppressed_addresses: suppressions.length,
      already_emailed: emailed.size,
    },
  };
}

/**
 * Marks the recipient row that drove an activation. Returns the campaign id when
 * the collector reached the offer through the campaign email, otherwise null.
 * Never creates or extends a grant — attribution only.
 */
export async function attributeEmailActivation(base44, email, nowIso) {
  const key = normEmail(email);
  if (!key) return null;
  const rows = await base44.asServiceRole.entities.EmailCampaignRecipient
    .filter({ email: key, clicked: true }, "-clicked_at", 5)
    .catch(() => []);
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) return null;

  if (!row.activated) {
    await base44.asServiceRole.entities.EmailCampaignRecipient.update(row.id, {
      activated: true,
      activated_at: nowIso,
    }).catch(() => {});
    await base44.asServiceRole.entities.EmailCampaignEvent.create({
      campaign_id: row.campaign_id,
      recipient_id: row.id,
      email: key,
      event_type: "activation",
      detail: "Complimentary Pro activated after the campaign email",
      occurred_at: nowIso,
    }).catch(() => {});
  }

  return { campaignId: row.campaign_id, recipientId: row.id };
}

/** Channel label recorded on the campaign event for reporting attribution. */
export function resolveActivationSurface(channel, emailAttribution) {
  if (emailAttribution) return "email_campaign";
  const normalized = String(channel || "").toLowerCase();
  if (normalized === "facebook") return "facebook_referral";
  if (normalized === "email") return "email_campaign";
  return "campaign_activation";
}