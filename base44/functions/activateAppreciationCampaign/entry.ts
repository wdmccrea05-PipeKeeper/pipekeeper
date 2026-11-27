import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  APPRECIATION_CAMPAIGN_ID,
  APPRECIATION_GRANT_MS,
  normEmail,
  loadCampaignConfig,
  loadUserGrants,
  loadUserSubscriptions,
  loadUserRecord,
  evaluateEligibility,
  resolveGrantState,
  resolveRedemptionWindow,
  syncUserMirror,
} from "../../shared/appreciationCampaign.ts";

/**
 * Redeem the existing-collector appreciation offer.
 *
 * Timestamps are issued here, never by the client. Redemption is idempotent:
 * a repeated click, retry or concurrent request resolves to the SAME single
 * grant (earliest created record wins and duplicates are removed), so the
 * window can never be restarted or extended.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const email = normEmail(me.email);
    const config = await loadCampaignConfig(base44);
    const [userRecord, grants, subscriptions] = await Promise.all([
      loadUserRecord(base44, email),
      loadUserGrants(base44, email),
      loadUserSubscriptions(base44, email),
    ]);

    const user = userRecord || me;
    const eligibility = evaluateEligibility({ config, user, grants, subscriptions });

    // Already active → idempotent success, same grant, same expiration.
    // Checked BEFORE the deadline gate so a grant issued before the deadline
    // keeps resolving normally, and access continues after the campaign closes.
    if (eligibility.code === "already_active" && eligibility.grant) {
      return Response.json({ ok: true, activated: false, already_active: true, grant: eligibility.grant });
    }

    // Hard redemption deadline — enforced here, never by the client alone.
    const redemption = resolveRedemptionWindow(config);
    if (redemption.closed) {
      return Response.json(
        {
          ok: false,
          activated: false,
          code: "redemption_deadline_passed",
          redemption,
          grant: eligibility.grant || null,
        },
        { status: 410 }
      );
    }

    if (!eligibility.eligible) {
      return Response.json(
        { ok: false, activated: false, code: eligibility.code, grant: eligibility.grant || null },
        { status: 409 }
      );
    }

    const nowMs = Date.now();
    const activatedAt = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + APPRECIATION_GRANT_MS).toISOString();

    const created = await base44.asServiceRole.entities.AppreciationGrant.create({
      campaign_id: APPRECIATION_CAMPAIGN_ID,
      user_id: user.id,
      user_email: email,
      status: "active",
      activated_at: activatedAt,
      expires_at: expiresAt,
      grant_hours: 168,
      source: "appreciation_campaign",
      reason: "Existing collector thank-you — 7 days of complimentary Pro access",
      redeemed_by: email,
      redeemed_at: activatedAt,
    });

    // Atomicity without a transaction: after inserting, keep exactly one grant
    // for this collector — the earliest — and remove any concurrent duplicate.
    const after = await loadUserGrants(base44, email);
    const sorted = after
      .slice()
      .sort((a, b) => {
        const at = new Date(a.created_date || 0).getTime();
        const bt = new Date(b.created_date || 0).getTime();
        if (at !== bt) return at - bt;
        return String(a.id).localeCompare(String(b.id));
      });
    const keeper = sorted[0] || created;
    for (const extra of sorted.slice(1)) {
      if (extra.id === keeper.id) continue;
      await base44.asServiceRole.entities.AppreciationGrant.delete(extra.id).catch(() => {});
    }

    const state = resolveGrantState(keeper);
    await syncUserMirror(base44, user.id, state);

    await base44.asServiceRole.entities.AppreciationCampaignEvent.create({
      campaign_id: APPRECIATION_CAMPAIGN_ID,
      user_email: email,
      event_type: "activation",
      module: "account",
      surface: "campaign_activation",
      occurred_at: activatedAt,
      grant_id: keeper.id,
    }).catch(() => {});

    return Response.json({ ok: true, activated: true, grant: state });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}