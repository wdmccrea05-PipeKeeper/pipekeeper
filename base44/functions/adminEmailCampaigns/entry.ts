import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { APPRECIATION_CAMPAIGN_ID, loadCampaignConfig, normEmail } from "../../shared/appreciationCampaign.ts";
import { loadEmailAudience } from "../../shared/appreciationEmailServer.ts";
import {
  EMAIL_TEMPLATE_KEY,
  EMAIL_TEMPLATE_NAME,
  buildHtml,
  buildPlainText,
  buildVariables,
  canDeliverCampaign,
  chunk,
  clickUrlFor,
  copyFor,
  normalizeEmailLang,
  redemptionUrl,
  unsubscribeUrlFor,
} from "../../shared/appreciationEmail.ts";

const CONCURRENCY = 5;
const MAX_BATCH = 60;
const BULK_SIZE = 200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadCampaign(base44, id) {
  if (!id) return null;
  return base44.asServiceRole.entities.EmailCampaign
    .get(id)
    .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
}

async function addSuppression(base44, email, reason, source, note) {
  const key = normEmail(email);
  if (!key) return;
  const existing = await base44.asServiceRole.entities.EmailSuppression
    .filter({ email: key }, "-created_date", 1)
    .catch(() => []);
  if (Array.isArray(existing) && existing.length > 0) return;
  await base44.asServiceRole.entities.EmailSuppression.create({
    email: key,
    reason,
    source: source || "provider",
    note: note || null,
    suppressed_at: new Date().toISOString(),
  }).catch(() => {});
}

async function recount(base44, campaignId) {
  const count = (status) =>
    base44.asServiceRole.entities.EmailCampaignRecipient.count({ campaign_id: campaignId, status }).catch(() => 0);
  const [queued, sent, failed, skipped, bounced, unsubscribed] = await Promise.all([
    count("queued"),
    count("sent"),
    count("failed"),
    count("skipped"),
    count("bounced"),
    count("unsubscribed"),
  ]);
  return { queued, sent, failed, skipped: skipped + bounced + unsubscribed, bounced, unsubscribed };
}

async function queueAudience(base44, campaign, audience) {
  const existing = await fetchAllEntitiesServer(
    base44.asServiceRole.entities.EmailCampaignRecipient,
    { campaign_id: campaign.id },
    "created_date",
    5000,
    40
  );
  const seen = new Set(existing.map((row) => normEmail(row.email)));
  const fresh = audience.recipients.filter((row) => !seen.has(row.email));
  const rows = fresh.map((row) => ({
    campaign_id: campaign.id,
    template_key: EMAIL_TEMPLATE_KEY,
    email: row.email,
    user_id: row.user_id || null,
    language: row.language,
    status: "queued",
    click_token: crypto.randomUUID(),
  }));

  for (const batch of chunk(rows, BULK_SIZE)) {
    await base44.asServiceRole.entities.EmailCampaignRecipient.bulkCreate(batch);
  }
  return rows.length;
}

/**
 * Delivers one queued recipient. Failures are contained here: a provider error
 * marks that one row and never interrupts the rest of the batch or the app.
 */
async function deliverOne(base44, campaign, row) {
  const nowIso = new Date().toISOString();
  try {
    const options = {
      mailingAddress: campaign.mailing_address,
      ctaUrl: clickUrlFor(row.click_token),
      unsubscribeUrl: unsubscribeUrlFor(row.click_token),
      campaignId: campaign.id,
      subject: campaign.subject || copyFor(row.language).subject,
    };

    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      to: row.email,
      subject: options.subject,
      html: buildHtml(row.language, options),
      text: buildPlainText(row.language, options),
      from_name: "CollectionKeeper",
      category: "marketing",
    });

    if (result && result.success === false) {
      const reason = String(result.reason || "").toLowerCase();
      const detail = result.message || result.reason || "provider refused delivery";
      const status = reason === "unsubscribed" ? "unsubscribed" : reason === "bounced" ? "bounced" : "failed";
      await base44.asServiceRole.entities.EmailCampaignRecipient.update(row.id, { status, detail });
      await base44.asServiceRole.entities.EmailCampaignEvent.create({
        campaign_id: campaign.id,
        recipient_id: row.id,
        email: row.email,
        event_type:
          reason === "unsubscribed" ? "unsubscribed" : reason === "bounced" ? "bounced" : reason === "spam" ? "complaint" : "failed",
        detail,
        occurred_at: nowIso,
      }).catch(() => {});
      if (reason === "unsubscribed" || reason === "bounced" || reason === "spam") {
        const suppressionReason = reason === "spam" ? "complaint" : reason;
        await addSuppression(base44, row.email, suppressionReason, "provider", detail);
      }
      return { ok: false };
    }

    await base44.asServiceRole.entities.EmailCampaignRecipient.update(row.id, { status: "sent", detail: null, sent_at: nowIso });
    await base44.asServiceRole.entities.EmailCampaignEvent.create({
      campaign_id: campaign.id,
      recipient_id: row.id,
      email: row.email,
      event_type: "sent",
      detail: row.language,
      occurred_at: nowIso,
    }).catch(() => {});
    return { ok: true };
  } catch (error) {
    await base44.asServiceRole.entities.EmailCampaignRecipient.update(row.id, {
      status: "failed",
      detail: String(error?.message || "send failed").slice(0, 300),
    }).catch(() => {});
    return { ok: false };
  }
}

async function processQueue(base44, campaign, limit) {
  const queued = await base44.asServiceRole.entities.EmailCampaignRecipient.filter(
    { campaign_id: campaign.id, status: "queued" },
    "created_date",
    limit
  );
  const rows = Array.isArray(queued) ? queued : [];
  let sent = 0;
  let failed = 0;

  for (const batch of chunk(rows, CONCURRENCY)) {
    const settled = await Promise.allSettled(batch.map((row) => deliverOne(base44, campaign, row)));
    for (const item of settled) {
      if (item.status === "fulfilled" && item.value.ok) sent += 1;
      else failed += 1;
    }
    await sleep(120);
  }

  const counts = await recount(base44, campaign.id);
  const done = counts.queued === 0;
  await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
    status: done ? "sent" : "sending",
    sent_at: done ? new Date().toISOString() : null,
    queued_count: counts.queued,
    sent_count: counts.sent,
    failed_count: counts.failed,
    skipped_count: counts.skipped,
  }).catch(() => {});

  return { processed: rows.length, sent, failed, remaining: counts.queued, counts, status: done ? "sent" : "sending" };
}

async function runCampaign(base44, campaign, limit) {
  const window = canDeliverCampaign(await loadCampaignConfig(base44));
  if (!window.deliverable) {
    return { error: "redemption_deadline_passed", status: 409, window };
  }

  if (campaign.status === "sent" || campaign.status === "cancelled") {
    return { error: "campaign_closed", status: 409 };
  }

  let queued = campaign.queued_count || 0;
  if (campaign.status !== "sending" && queued === 0) {
    const config = await loadCampaignConfig(base44);
    const audience = await loadEmailAudience(base44, {
      config,
      languages: Array.isArray(campaign.languages) ? campaign.languages : [],
    });
    queued = await queueAudience(base44, campaign, audience);
    await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
      status: "sending",
      audience_snapshot: {
        eligible: audience.summary.eligible,
        excluded: audience.results.length - audience.summary.eligible,
        by_language: audience.summary.byLanguage,
        captured_at: new Date().toISOString(),
      },
      queued_count: queued,
    });
  }

  const result = await processQueue(base44, campaign, limit);
  return { result };
}

/**
 * Administrative control of appreciation campaign emails.
 * Admin-only. Actions: preview | create | update | test | approve | schedule |
 * send | run_due | cancel | suppressions | suppression_add | suppression_remove
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
    const action = String(body?.action || "preview");
    const adminEmail = normEmail(me.email);

    if (action === "preview") {
      const language = normalizeEmailLang(body?.language);
      const mailingAddress = String(body?.mailing_address || "").trim();
      const campaignId = body?.campaign_id || null;
      const previewOptions = {
        mailingAddress,
        campaignId,
        ctaUrl: redemptionUrl(campaignId),
        unsubscribeUrl: unsubscribeUrlFor("test"),
      };
      return Response.json({
        ok: true,
        language,
        subject: copyFor(language).subject,
        preview_text: copyFor(language).preview,
        copy: copyFor(language),
        variables: buildVariables(language, previewOptions),
        html: buildHtml(language, previewOptions),
        plain_text: buildPlainText(language, previewOptions),
      });
    }

    if (action === "create") {
      const name = String(body?.name || "").trim();
      if (!name) return Response.json({ error: "name is required" }, { status: 400 });
      const config = await loadCampaignConfig(base44);
      const audience = await loadEmailAudience(base44, {
        config,
        languages: Array.isArray(body?.languages) ? body.languages : [],
      });
      const created = await base44.asServiceRole.entities.EmailCampaign.create({
        name,
        campaign_id: APPRECIATION_CAMPAIGN_ID,
        template_key: EMAIL_TEMPLATE_KEY,
        template_name: EMAIL_TEMPLATE_NAME,
        status: "draft",
        subject: body?.subject ? String(body.subject).slice(0, 200) : copyFor("en").subject,
        mailing_address: body?.mailing_address ? String(body.mailing_address).slice(0, 300) : "",
        languages: Array.isArray(body?.languages) ? body.languages.filter(Boolean) : [],
        created_by_admin: adminEmail,
        audience_snapshot: {
          eligible: audience.summary.eligible,
          excluded: audience.results.length - audience.summary.eligible,
          by_language: audience.summary.byLanguage,
          captured_at: new Date().toISOString(),
        },
        queued_count: 0,
        sent_count: 0,
        failed_count: 0,
        skipped_count: 0,
      });
      return Response.json({ ok: true, campaign: created });
    }

    if (action === "update") {
      const campaign = await loadCampaign(base44, body?.campaign_id);
      if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
      if (["sending", "sent", "cancelled"].includes(campaign.status)) {
        return Response.json({ error: "campaign_locked", status: campaign.status }, { status: 409 });
      }
      const patch = {};
      if (body?.name !== undefined) patch.name = String(body.name).slice(0, 120);
      if (body?.subject !== undefined) patch.subject = String(body.subject).slice(0, 200);
      if (body?.mailing_address !== undefined) patch.mailing_address = String(body.mailing_address).slice(0, 300);
      if (body?.languages !== undefined) patch.languages = Array.isArray(body.languages) ? body.languages.filter(Boolean) : [];
      if (body?.scheduled_at !== undefined) patch.scheduled_at = body.scheduled_at || null;
      if (body?.notes !== undefined) patch.notes = body.notes ? String(body.notes).slice(0, 500) : null;
      const updated = await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, patch);
      return Response.json({ ok: true, campaign: updated });
    }

    if (action === "test") {
      const campaign = await loadCampaign(base44, body?.campaign_id);
      if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
      // Review copies go to the administrator only, so they do not require the
      // compliance footer details that a real distribution does.
      const language = normalizeEmailLang(body?.language || "en");
      const options = {
        mailingAddress: campaign.mailing_address,
        ctaUrl: redemptionUrl(campaign.id),
        unsubscribeUrl: unsubscribeUrlFor("test"),
        campaignId: campaign.id,
        subject: campaign.subject || copyFor(language).subject,
      };
      const result = await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        subject: options.subject,
        html: buildHtml(language, options),
        text: buildPlainText(language, options),
        from_name: "CollectionKeeper",
        category: "marketing",
      });
      const nowIso = new Date().toISOString();
      const accepted = !(result && result.success === false);
      await base44.asServiceRole.entities.EmailCampaignEvent.create({
        campaign_id: campaign.id,
        email: adminEmail,
        event_type: accepted ? "test_sent" : "failed",
        detail: accepted ? `Test email (${language})` : result?.message || result?.reason || "provider refused",
        occurred_at: nowIso,
      }).catch(() => {});
      return Response.json({
        ok: accepted,
        language,
        to: adminEmail,
        message: accepted ? "Test email sent" : result?.message || result?.reason || "Provider refused the test email",
      }, { status: accepted ? 200 : 502 });
    }

    if (action === "approve") {
      const campaign = await loadCampaign(base44, body?.campaign_id);
      if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
      if (!String(campaign.mailing_address || "").trim()) {
        return Response.json({ error: "mailing_address_required" }, { status: 400 });
      }
      if (campaign.status === "sent" || campaign.status === "cancelled") {
        return Response.json({ error: "campaign_closed" }, { status: 409 });
      }
      const updated = await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
        status: campaign.status === "scheduled" ? "scheduled" : "approved",
        approved_by: adminEmail,
        approved_at: new Date().toISOString(),
      });
      return Response.json({ ok: true, campaign: updated });
    }

    if (action === "schedule") {
      const campaign = await loadCampaign(base44, body?.campaign_id);
      if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
      if (!campaign.approved_by) return Response.json({ error: "approval_required" }, { status: 409 });
      const scheduledAt = body?.scheduled_at ? new Date(body.scheduled_at) : null;
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        return Response.json({ error: "scheduled_at is required" }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
      });
      return Response.json({ ok: true, campaign: updated });
    }

    if (action === "cancel") {
      const campaign = await loadCampaign(base44, body?.campaign_id);
      if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
      const updated = await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, { status: "cancelled" });
      return Response.json({ ok: true, campaign: updated });
    }

    if (action === "send") {
      const campaign = await loadCampaign(base44, body?.campaign_id);
      if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
      if (!String(campaign.mailing_address || "").trim()) {
        return Response.json({ error: "mailing_address_required" }, { status: 400 });
      }
      if (!campaign.approved_by) return Response.json({ error: "approval_required" }, { status: 409 });
      const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), MAX_BATCH);
      const outcome = await runCampaign(base44, campaign, limit);
      if (outcome.error) return Response.json({ ok: false, error: outcome.error, window: outcome.window }, { status: outcome.status });
      return Response.json({ ok: true, ...outcome.result });
    }

    if (action === "run_due") {
      const nowMs = Date.now();
      const [scheduled, delivering] = await Promise.all([
        fetchAllEntitiesServer(
          base44.asServiceRole.entities.EmailCampaign,
          { status: "scheduled" },
          "created_date",
          100,
          5
        ),
        fetchAllEntitiesServer(
          base44.asServiceRole.entities.EmailCampaign,
          { status: "sending" },
          "created_date",
          100,
          5
        ),
      ]);
      const dueScheduled = scheduled.filter(
        (row) => row.scheduled_at && new Date(row.scheduled_at).getTime() <= nowMs && row.approved_by
      );
      // A campaign that is already delivering only sent its first batch: processQueue
      // leaves it in "sending" until its queue drains, and it never returns to
      // "scheduled". Resuming it here is what lets the rest of its audience be mailed.
      const resume = delivering.filter((row) => row.approved_by && (row.queued_count || 0) > 0);
      const due = [...resume, ...dueScheduled];
      const processed = [];
      for (const campaign of due.slice(0, 2)) {
        const outcome = await runCampaign(base44, campaign, MAX_BATCH);
        processed.push({ campaign_id: campaign.id, ...(outcome.result || { error: outcome.error }) });
      }
      return Response.json({ ok: true, due: due.length, processed });
    }

    if (action === "suppressions") {
      const rows = await fetchAllEntitiesServer(
        base44.asServiceRole.entities.EmailSuppression,
        {},
        "-created_date",
        1000,
        20
      );
      return Response.json({ ok: true, total: rows.length, suppressions: rows.slice(0, 300) });
    }

    if (action === "suppression_add") {
      const email = normEmail(body?.email);
      if (!email) return Response.json({ error: "email is required" }, { status: 400 });
      const reason = ["unsubscribed", "bounced", "complaint", "manual", "invalid"].includes(body?.reason)
        ? body.reason
        : "manual";
      await addSuppression(base44, email, reason, "admin", body?.note || null);
      return Response.json({ ok: true });
    }

    if (action === "suppression_remove") {
      const id = body?.id;
      if (!id) return Response.json({ error: "id is required" }, { status: 400 });
      await base44.asServiceRole.entities.EmailSuppression.delete(id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}