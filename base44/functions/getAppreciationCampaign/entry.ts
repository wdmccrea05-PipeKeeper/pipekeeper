import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  normEmail,
  loadCampaignConfig,
  loadUserGrants,
  loadUserSubscriptions,
  loadUserRecord,
  evaluateEligibility,
  resolveGrantState,
  syncUserMirror,
  publicCampaign,
  resolveRedemptionWindow,
} from "../../shared/appreciationCampaign.ts";

/**
 * Campaign status for the signed-in collector.
 * Never grants anything — it only reports the campaign, eligibility and the
 * state of an existing grant.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const email = normEmail(me.email);
    const config = await loadCampaignConfig(base44);
    const [grants, subscriptions, userRecord] = await Promise.all([
      loadUserGrants(base44, email),
      loadUserSubscriptions(base44, email),
      loadUserRecord(base44, email),
    ]);

    const user = userRecord || me;
    const grant = grants.length > 0 ? grants[0] : null;
    const grantState = resolveGrantState(grant);

    const eligibility = evaluateEligibility({ config, user, grants, subscriptions });

    if (grantState.exists) {
      await syncUserMirror(base44, user.id, grantState);
    }

    return Response.json({
      campaign: publicCampaign(config),
      redemption: resolveRedemptionWindow(config),
      eligible: eligibility.eligible,
      reason: eligibility.code,
      welcome_trial_ends_at: eligibility.welcomeTrialEndsAt || null,
      grant: grantState,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}