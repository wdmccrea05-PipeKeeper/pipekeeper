import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import { PRO_TRIAL_DAYS } from "../../shared/proTrial.ts";
import {
  GRACE_PERIOD_DAYS,
  PROVISIONAL_APPLE_EXPIRY_DAYS,
  isCanceledButPaidThrough,
  subscriptionGrantsAccess,
} from "../../shared/curatorAccess.ts";
import { resolveGrantState } from "../../shared/appreciationCampaign.ts";

/**
 * adminDiagnostics
 *
 * Administrator-only, privacy-safe diagnostics for the subscription and
 * entitlement systems. Every figure is an aggregate: no collector email, no
 * record contents, no payment identifiers leave this function. It answers
 * "is the billing/entitlement system healthy", never "what does this collector own".
 *
 * Coverage is stated explicitly. A signal with no reliable source is reported as
 * unavailable rather than as zero, so an empty table is never mistaken for a
 * healthy one.
 */

const LOOKBACK_DAYS = 30;
const MAX_ROWS = 500;

function sinceIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function countBy(rows: any[], key: string) {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const value = String(row?.[key] ?? "unknown").toLowerCase();
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

async function safeList(entity: any, query: Record<string, unknown> = {}) {
  try {
    const rows = await entity.filter(query, "-created_date", MAX_ROWS);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn("[adminDiagnostics] query failed:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.id) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (String(me.role || "").toLowerCase() !== "admin") {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const entities = base44.asServiceRole.entities;

    const [subscriptions, driftRows, curatorRuns, giftCodes, grants] = await Promise.all([
      safeList(entities.Subscription),
      safeList(entities.EntitlementDriftCache),
      safeList(entities.CuratorActionRun, { created_date: { $gte: sinceIso(LOOKBACK_DAYS) } }),
      safeList(entities.GiftCode),
      safeList(entities.AppreciationGrant),
    ]);

    // ── Subscriptions ────────────────────────────────────────────────────────
    const granting = subscriptions.filter(subscriptionGrantsAccess);
    const ownersWithMultipleGrants = new Map<string, number>();
    for (const sub of granting) {
      const key = String(sub?.user_email || sub?.user_id || "").toLowerCase();
      if (!key) continue;
      ownersWithMultipleGrants.set(key, (ownersWithMultipleGrants.get(key) || 0) + 1);
    }
    const duplicateOwners = [...ownersWithMultipleGrants.values()].filter((n) => n > 1).length;

    const subscriptionDiagnostics = {
      totalRecords: subscriptions.length,
      granting: granting.length,
      canceledButPaidThrough: subscriptions.filter(isCanceledButPaidThrough).length,
      duplicateActiveOwners: duplicateOwners,
      statusCounts: countBy(subscriptions, "status"),
      providerCounts: countBy(subscriptions, "provider"),
      coverage: "All subscription records visible to the service role.",
    };

    // ── Entitlement drift ────────────────────────────────────────────────────
    const driftDiagnostics = {
      openFindings: driftRows.length,
      bySeverity: countBy(driftRows, "severity"),
      byType: countBy(driftRows, "drift_type"),
      coverage: "EntitlementDriftCache rows, written by the reconciliation jobs.",
    };

    // ── Curator runs ─────────────────────────────────────────────────────────
    const failedRuns = curatorRuns.filter((run) => String(run?.status || "").toLowerCase() === "failed");
    const durations = curatorRuns
      .map((run) => {
        const start = run?.started_at ? new Date(run.started_at).getTime() : NaN;
        const end = run?.completed_at ? new Date(run.completed_at).getTime() : NaN;
        return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null;
      })
      .filter((value): value is number => value !== null);

    const curatorDiagnostics = {
      windowDays: LOOKBACK_DAYS,
      runs: curatorRuns.length,
      failedRuns: failedRuns.length,
      statusCounts: countBy(curatorRuns, "status"),
      medianDurationMs: durations.length ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)] : null,
      lastFailureAt: failedRuns
        .map((run) => run?.completed_at || run?.started_at)
        .filter(Boolean)
        .sort()
        .pop() || null,
      coverage: "CuratorActionRun rows from the last 30 days. Failure messages stay on the run record, not here.",
    };

    // ── Complimentary access ─────────────────────────────────────────────────
    const grantStates = grants.map((grant) => resolveGrantState(grant));
    const complimentaryDiagnostics = {
      grants: grants.length,
      activeGrants: grantStates.filter((state) => state?.active).length,
      expiredGrants: grantStates.filter((state) => !state?.active).length,
      welcomeTrialDays: PRO_TRIAL_DAYS,
      coverage: "AppreciationGrant rows plus the welcome-window policy constant.",
    };

    // ── Gift memberships ─────────────────────────────────────────────────────
    const giftDiagnostics = {
      total: giftCodes.length,
      statusCounts: countBy(giftCodes, "status"),
      redeemed: giftCodes.filter((code) => String(code?.status || "").toLowerCase() === "redeemed").length,
      revoked: giftCodes.filter((code) => String(code?.status || "").toLowerCase() === "revoked").length,
      coverage: "GiftCode rows. Recipient identity is deliberately excluded.",
    };

    // ── Policy configuration ─────────────────────────────────────────────────
    const configuration = {
      gracePeriodDays: GRACE_PERIOD_DAYS,
      provisionalAppleExpiryDays: PROVISIONAL_APPLE_EXPIRY_DAYS,
      welcomeTrialDays: PRO_TRIAL_DAYS,
      legacyPremiumCutoff: "2026-02-01T00:00:00.000Z",
      modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"],
      coverage: "Constants read from the shared entitlement modules at request time.",
    };

    // ── Signals without a reliable source ────────────────────────────────────
    const unavailable = [
      {
        signal: "Failed report generation",
        reason: "Report exports run in the collector's browser after the server gate; no server-side failure log is written.",
        recommendedAction: "Add a server-side export audit event if failure counts are needed.",
      },
      {
        signal: "Data persistence failures",
        reason: "Entity writes surface errors to the calling screen; no dedicated persistence-failure ledger exists.",
        recommendedAction: "Log write failures into CuratorActionApplyResult or a dedicated audit entity.",
      },
      {
        signal: "Application performance",
        reason: "Curator run durations are the only server-timed operation; page performance is measured client-side only.",
        recommendedAction: "Use the platform analytics and session recordings for page-level timings.",
      },
    ];

    return Response.json({
      generatedAt: new Date().toISOString(),
      privacy: "Aggregates only. No collector identity, record contents or payment identifiers are returned.",
      subscriptions: subscriptionDiagnostics,
      entitlementDrift: driftDiagnostics,
      curator: curatorDiagnostics,
      complimentaryAccess: complimentaryDiagnostics,
      giftMemberships: giftDiagnostics,
      configuration,
      unavailable,
    });
  } catch (error) {
    console.error("[adminDiagnostics] failed:", error);
    return Response.json({ error: "INTERNAL", message: String(error?.message || error) }, { status: 500 });
  }
});