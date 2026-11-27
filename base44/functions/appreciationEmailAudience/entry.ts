import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { APPRECIATION_CAMPAIGN_ID, loadCampaignConfig } from "../../shared/appreciationCampaign.ts";
import { loadEmailAudience } from "../../shared/appreciationEmailServer.ts";
import { EXCLUSION_LABELS, canDeliverCampaign } from "../../shared/appreciationEmail.ts";

/**
 * Eligible recipient population for the appreciation campaign email.
 * Admin-only. Recalculated from live data on every call so the count an
 * administrator sees is the count that will be mailed.
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
    const languages = Array.isArray(body?.languages) ? body.languages.filter(Boolean) : [];
    const sampleSize = Math.min(Math.max(Number(body?.sampleSize) || 25, 0), 200);

    const config = await loadCampaignConfig(base44);
    const nowMs = Date.now();
    const audience = await loadEmailAudience(base44, { config, languages, nowMs });
    const window = canDeliverCampaign(config, nowMs);
    const excluded = audience.results.length - audience.summary.eligible;

    return Response.json({
      ok: true,
      generated_at: new Date().toISOString(),
      campaign_id: APPRECIATION_CAMPAIGN_ID,
      deliverable: window.deliverable,
      redemption_deadline: window.deadlineIso,
      languages,
      totals: {
        accounts: audience.counts.accounts,
        eligible: audience.summary.eligible,
        excluded,
        suppressed_addresses: audience.counts.suppressed_addresses,
        already_emailed: audience.counts.already_emailed,
      },
      by_language: audience.summary.byLanguage,
      exclusions: Object.entries(audience.summary.excluded)
        .map(([reason, count]) => ({ reason, label: EXCLUSION_LABELS[reason] || reason, count }))
        .sort((a, b) => b.count - a.count),
      sample: audience.recipients.slice(0, sampleSize),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}