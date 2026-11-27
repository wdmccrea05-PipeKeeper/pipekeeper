import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import { resolveProTrial } from "./proTrial.ts";
import { resolveGrantState } from "./appreciationCampaign.ts";

/**
 * Server-side Curator access.
 *
 * Mirrors the precedence the frontend already applies in resolveModuleAccess:
 * administrator, active paid subscription (including grace and canceled-but-paid
 * through), explicit grandfathered provenance, then complimentary Pro (welcome
 * window or appreciation grant). Anything else is free.
 *
 * Deliberately broader than the frontend on module scope: the server allows any
 * granting subscription regardless of which module it covers, because Curator is
 * cross-module. This means no collector who can open Curator today loses it.
 *
 * If a lookup itself fails (infrastructure, not a missing entitlement) access is
 * allowed and the source is marked `unverified_lookup_error`. Denying there would
 * remove a paying collector's access because of an outage, which is the worse
 * failure; the call is logged so the gap is visible in diagnostics.
 */

export const GRACE_PERIOD_DAYS = 5;
export const PROVISIONAL_APPLE_EXPIRY_DAYS = 30;

const LEGACY_PREMIUM_CUTOFF = "2026-02-01T00:00:00.000Z";
const APPRECIATION_CAMPAIGN_ID = "collector_appreciation_black_friday_2026";

function normEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function withinGracePeriod(subscription: any) {
  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return false;
  const endMs = new Date(periodEnd).getTime();
  if (!Number.isFinite(endMs)) return false;
  return Date.now() <= endMs + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
}

/** Canceled but still inside the period the collector already paid for. */
export function isCanceledButPaidThrough(subscription: any) {
  const status = String(subscription?.status || "").toLowerCase();
  if (status !== "canceled" && status !== "cancelled") return false;
  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return false;
  const endMs = new Date(periodEnd).getTime();
  return Number.isFinite(endMs) && endMs > Date.now();
}

/** One definition of "this subscription currently grants Pro access". */
export function subscriptionGrantsAccess(subscription: any) {
  if (!subscription) return false;
  const status = String(subscription?.status || "").toLowerCase();
  if (status === "active" || status === "trialing" || status === "trial") return true;
  if (status === "past_due" || status === "incomplete" || status === "unpaid") {
    return withinGracePeriod(subscription);
  }
  return isCanceledButPaidThrough(subscription);
}

export function isLegacyPremium(subscription: any) {
  if (!subscription) return false;
  if (String(subscription?.tier || "").toLowerCase() === "pro") return false;
  const startedAt = subscription?.subscriptionStartedAt || subscription?.started_at;
  if (!startedAt) return false;
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return false;
  return startMs < new Date(LEGACY_PREMIUM_CUTOFF).getTime();
}

/**
 * @returns {Promise<{ok: boolean, me?: any, source: string, status?: number, error?: string, reason?: string}>}
 */
export async function resolveCuratorAccess(req: Request) {
  const base44 = createClientFromRequest(req);

  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED", source: "none" };
  }

  const role = String(me.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || me.is_admin === true) {
    return { ok: true, me, source: "admin" };
  }

  const email = normEmail(me.email);

  let account: any = null;
  try {
    const rows = await base44.entities.User.filter({ email });
    account = Array.isArray(rows) ? rows[0] : null;
  } catch (error) {
    console.warn("[curatorAccess] account lookup failed:", error);
  }

  if (account) {
    if (resolveProTrial(account).active) {
      return { ok: true, me, source: "complimentary_pro" };
    }
    if (account.isFoundingMember || account.legacy_broad_module_access) {
      return { ok: true, me, source: "grandfathered" };
    }
  }

  try {
    const grants = await base44.entities.AppreciationGrant.filter(
      { campaign_id: APPRECIATION_CAMPAIGN_ID, user_email: email },
      "-created_date",
      5
    );
    const grant = Array.isArray(grants) && grants.length > 0 ? grants[0] : null;
    if (resolveGrantState(grant).active) {
      return { ok: true, me, source: "appreciation_grant" };
    }
  } catch (error) {
    console.warn("[curatorAccess] appreciation grant lookup failed:", error);
  }

  let subscriptions: any[] = [];
  try {
    const byUser = await base44.entities.Subscription.filter({ user_id: me.id });
    subscriptions = Array.isArray(byUser) ? byUser : [];
    if (subscriptions.length === 0 && email) {
      const byEmail = await base44.entities.Subscription.filter({ user_email: email });
      subscriptions = Array.isArray(byEmail) ? byEmail : [];
    }
  } catch (error) {
    console.warn("[curatorAccess] subscription lookup failed:", error);
    return { ok: true, me, source: "unverified_lookup_error" };
  }

  const granting = subscriptions.find(subscriptionGrantsAccess);
  if (granting) {
    return {
      ok: true,
      me,
      source: isLegacyPremium(granting) ? "legacy_premium" : "paid_subscription",
    };
  }

  return {
    ok: false,
    status: 403,
    error: "CURATOR_REQUIRES_PRO",
    reason: "No active, complimentary or grandfathered Pro access",
    source: "free",
  };
}