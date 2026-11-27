import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { redemptionUrl } from "../../shared/appreciationEmail.ts";

/**
 * Public click-through endpoint for the campaign email.
 *
 * Anyone can reach this URL, so it only ever does two things: record a click for
 * an unguessable per-recipient token, then redirect to the app. It cannot grant,
 * extend or reset anything — the redemption screen and the activation endpoint
 * keep enforcing eligibility and the deadline on their own.
 */
export default async function (req) {
  try {
    const url = new URL(req.url);
    const token = String(url.searchParams.get("t") || "").trim();
    if (!token) return Response.redirect(redemptionUrl(), 302);

    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.EmailCampaignRecipient
      .filter({ click_token: token }, "-created_date", 1)
      .catch(() => []);
    const recipient = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!recipient) return Response.redirect(redemptionUrl(), 302);

    const nowIso = new Date().toISOString();
    if (!recipient.clicked) {
      await base44.asServiceRole.entities.EmailCampaignRecipient.update(recipient.id, {
        clicked: true,
        clicked_at: nowIso,
      }).catch(() => {});
      await base44.asServiceRole.entities.EmailCampaignEvent.create({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient.id,
        email: recipient.email,
        event_type: "click",
        detail: "Campaign email CTA opened",
        occurred_at: nowIso,
      }).catch(() => {});
    }

    return Response.redirect(redemptionUrl(recipient.campaign_id), 302);
  } catch {
    return Response.redirect(redemptionUrl(), 302);
  }
}