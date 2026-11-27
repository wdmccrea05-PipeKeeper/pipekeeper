import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { normEmail } from "../../shared/appreciationCampaign.ts";
import { copyFor } from "../../shared/appreciationEmail.ts";

function page(title, message, tone = "#0f0e0e") {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Wix Madefor Text',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;">
<tr><td style="background:#ff773c;padding:18px 28px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#000;">CollectionKeeper</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 10px 0;font-family:Georgia,serif;font-size:22px;color:${tone};">${title}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#5d5d5d;">${message}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * One-click unsubscribe for campaign email.
 *
 * The token is unguessable and belongs to a single recipient row, so a link can
 * only ever unsubscribe the address it was sent to. Records a permanent
 * suppression that every future campaign send honours.
 */
export default async function (req) {
  try {
    const url = new URL(req.url);
    const token = String(url.searchParams.get("t") || "").trim();

    if (!token || token === "test") {
      return new Response(
        page(
          "This is a test copy",
          "No action was taken. Real campaign emails include a working unsubscribe link for each collector."
        ),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.EmailCampaignRecipient
      .filter({ click_token: token }, "-created_date", 1)
      .catch(() => []);
    const recipient = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!recipient) {
      return new Response(
        page("This link is no longer active", "Please reply to the campaign email and we will remove you from our list."),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const email = normEmail(recipient.email);
    const nowIso = new Date().toISOString();
    const existing = await base44.asServiceRole.entities.EmailSuppression
      .filter({ email }, "-created_date", 1)
      .catch(() => []);

    if (!Array.isArray(existing) || existing.length === 0) {
      await base44.asServiceRole.entities.EmailSuppression.create({
        email,
        reason: "unsubscribed",
        source: "unsubscribe_link",
        note: `Unsubscribed from campaign ${recipient.campaign_id}`,
        suppressed_at: nowIso,
      }).catch(() => {});
    }

    await base44.asServiceRole.entities.EmailCampaignRecipient.update(recipient.id, {
      status: "unsubscribed",
      detail: "Unsubscribed via the email footer link",
    }).catch(() => {});

    await base44.asServiceRole.entities.EmailCampaignEvent.create({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      email,
      event_type: "unsubscribed",
      detail: "Unsubscribe link clicked",
      occurred_at: nowIso,
    }).catch(() => {});

    return new Response(
      page(
        copyFor("en").unsubscribe + " confirmed",
        "You will no longer receive promotional email from CollectionKeeper. Account, billing and security messages are unaffected."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch {
    return new Response(page("Something went wrong", "Please try the unsubscribe link again in a moment."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}