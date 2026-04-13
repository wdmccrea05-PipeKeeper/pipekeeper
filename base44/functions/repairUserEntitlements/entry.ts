/**
 * repairUserEntitlements — comprehensive admin entitlement repair.
 *
 * Implements the admin repair tool specified by FIX RULE #1–#6:
 *
 *   1. Read subscription records from Stripe (all customers / all plan types)
 *   2. Restore ALL paid flags on the User entity:
 *        entitlement_tier, has_paid_access, pipekeeper_paid, whiskeykeeper_paid,
 *        paid_modules_csv, subscription_tier, subscription_level, subscription_status
 *   3. Create/update the Subscription entity so the live record matches Stripe
 *   4. Clear stale cache state (force updated_date so React Query re-fetches)
 *   5. Log a repair event to the RepairLog entity (if available)
 *
 * Admin only. Supports dryRun=true (default) for safe preview.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";
import Stripe from "npm:stripe@13.11.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

function normEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

function mapStripeStatus(status: string): string {
  switch (status) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "incomplete": return "incomplete";
    case "canceled": return "canceled";
    default: return "inactive";
  }
}

function isActiveStatus(status: string): boolean {
  return ["active", "trialing", "past_due", "incomplete"].includes(
    String(status || "").toLowerCase()
  );
}

function statusRank(status: string): number {
  const s = String(status || "").toLowerCase();
  if (s === "active") return 4;
  if (s === "trialing") return 3;
  if (s === "past_due") return 2;
  if (s === "incomplete") return 1;
  return 0;
}

/** Derive plan key from price env var mappings (matches syncSubscriptionForMe logic). */
function determinePlanKeyFromPrice(priceId: string | null): string | null {
  if (!priceId) return null;
  const priceMap: Record<string, string> = {
    [Deno.env.get("VITE_STRIPE_PIPEKEEPER_MONTHLY") || ""]: "pipekeeper_pro_monthly",
    [Deno.env.get("VITE_STRIPE_PIPEKEEPER_ANNUAL") || ""]: "pipekeeper_pro_annual",
    [Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_MONTHLY") || ""]: "whiskeykeeper_pro_monthly",
    [Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_ANNUAL") || ""]: "whiskeykeeper_pro_annual",
    [Deno.env.get("VITE_STRIPE_CIGARKEEPER_MONTHLY") || ""]: "cigarkeeper_pro_monthly",
    [Deno.env.get("VITE_STRIPE_CIGARKEEPER_ANNUAL") || ""]: "cigarkeeper_pro_annual",
    [Deno.env.get("VITE_STRIPE_WINEKEEPER_MONTHLY") || ""]: "winekeeper_pro_monthly",
    [Deno.env.get("VITE_STRIPE_WINEKEEPER_ANNUAL") || ""]: "winekeeper_pro_annual",
    [Deno.env.get("VITE_STRIPE_THREE_BUNDLE_MONTHLY") || ""]: "three_module_bundle_monthly",
    [Deno.env.get("VITE_STRIPE_THREE_BUNDLE_ANNUAL") || ""]: "three_module_bundle_annual",
    [Deno.env.get("VITE_STRIPE_FOUR_BUNDLE_MONTHLY") || ""]: "four_module_bundle_monthly",
    [Deno.env.get("VITE_STRIPE_FOUR_BUNDLE_ANNUAL") || ""]: "four_module_bundle_annual",
    [Deno.env.get("VITE_STRIPE_FOUNDERS_MONTHLY") || ""]: "founders_bundle_monthly",
    [Deno.env.get("VITE_STRIPE_FOUNDERS_ANNUAL") || ""]: "founders_bundle_annual",
    // Legacy single-price env vars
    [Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || ""]: "pipekeeper_pro_monthly",
    [Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || ""]: "pipekeeper_pro_annual",
  };
  return priceMap[priceId] || null;
}

/** Derive modules from plan key (Founders bundle = PK + WK only, per canonical rule). */
function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || "").toLowerCase();
  if (key.startsWith("pipekeeper_")) return ["pipekeeper"];
  if (key.startsWith("whiskeykeeper_")) return ["whiskeykeeper"];
  if (key.startsWith("cigarkeeper_")) return ["cigarkeeper"];
  if (key.startsWith("winekeeper_")) return ["winekeeper"];
  if (key.includes("four_module")) return ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
  if (key.includes("three_module")) return ["pipekeeper", "whiskeykeeper", "cigarkeeper"];
  // Founders bundle = PipeKeeper + WhiskeyKeeper ONLY (2 modules)
  if (key.includes("founders")) return ["pipekeeper", "whiskeykeeper"];
  return [];
}

/** Extract modules from Stripe subscription metadata or plan key. */
function extractModules(sub: Stripe.Subscription, planKey: string | null): string[] {
  const csv = String(sub.metadata?.modules_csv || "")
    .split(",")
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
  if (csv.length > 0) return csv;
  const fromKey = modulesFromPlanKey(planKey || "");
  if (fromKey.length > 0) return fromKey;
  // Legacy Pro fallback: grant pipekeeper at minimum
  return ["pipekeeper"];
}

/** Pick the best qualifying Stripe subscription across all customers for the email. */
async function findBestStripeSubscription(email: string) {
  const customers = await stripe.customers.list({ email, limit: 20 });
  if (!customers.data.length) return null;

  const realCustomers = customers.data.filter(
    (c) => typeof c.id === "string" && c.id.startsWith("cus_")
  );
  const pool = realCustomers.length ? realCustomers : customers.data;

  const qualifying: Array<{ customerId: string; subscription: Stripe.Subscription }> = [];

  for (const customer of pool) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 50,
    });
    for (const sub of subs.data || []) {
      if (isActiveStatus(String(sub.status || ""))) {
        qualifying.push({ customerId: customer.id, subscription: sub });
      }
    }
  }

  if (!qualifying.length) return null;

  const sorted = [...qualifying].sort((a, b) => {
    const rankDiff = statusRank(b.subscription.status) - statusRank(a.subscription.status);
    if (rankDiff !== 0) return rankDiff;
    return Number(b.subscription.current_period_end || 0) - Number(a.subscription.current_period_end || 0);
  });

  return sorted[0];
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ ok: false, error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (me?.role !== "admin") {
      return Response.json({ ok: false, error: "FORBIDDEN", message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = normEmail(body.email || "");
    const dryRun = body.dryRun !== false;

    if (!email) {
      return Response.json({ ok: false, error: "EMAIL_REQUIRED", message: "Email is required" }, { status: 400 });
    }

    console.log(`[repairUserEntitlements] Processing: ${email}, dryRun=${dryRun}`);

    // ── Step 1: Find local user ──────────────────────────────────────────────
    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const userRow = userRows?.[0];
    if (!userRow) {
      return Response.json({ ok: false, error: "USER_NOT_FOUND", message: `No User entity for ${email}` });
    }

    const userId = userRow.id;

    const before = {
      entitlement_tier: userRow.entitlement_tier,
      subscription_tier: userRow.subscription_tier,
      subscription_level: userRow.subscription_level,
      subscription_status: userRow.subscription_status,
      pipekeeper_paid: userRow.pipekeeper_paid,
      whiskeykeeper_paid: userRow.whiskeykeeper_paid,
      paid_modules_csv: userRow.paid_modules_csv,
      has_paid_access: userRow.has_paid_access,
    };

    // ── Step 2: Check live Stripe subscription ───────────────────────────────
    let stripeResult: { customerId: string; subscription: Stripe.Subscription } | null = null;
    try {
      stripeResult = await findBestStripeSubscription(email);
    } catch (e) {
      console.warn(`[repairUserEntitlements] Stripe lookup failed:`, e?.message);
    }

    // ── Step 3: Check Apple subscription in DB ───────────────────────────────
    let appleActiveSub: any = null;
    try {
      const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_id: userId,
        provider: "apple",
      });
      appleActiveSub = (appleSubs || []).find((s: any) => isActiveStatus(String(s.status || ""))) || null;
    } catch (e) {
      console.warn(`[repairUserEntitlements] Apple DB check failed:`, e?.message);
    }

    // ── Step 4: Determine final entitlement state ────────────────────────────
    let finalTier = "free";
    let activeModules: string[] = [];
    let providerUsed = "none";
    let subId: string | null = null;
    let subscriptionPayload: Record<string, unknown> | null = null;

    if (stripeResult) {
      const sub = stripeResult.subscription;
      const customerId = stripeResult.customerId;
      const item = sub.items?.data?.[0];
      const priceId = item?.price?.id || null;
      const planKey = determinePlanKeyFromPrice(priceId);
      activeModules = extractModules(sub, planKey);
      finalTier = "pro";
      providerUsed = "stripe";
      subId = sub.id;

      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      subscriptionPayload = {
        user_id: userId,
        user_email: email,
        provider: "stripe",
        provider_subscription_id: sub.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        price_id: priceId,
        status: mapStripeStatus(sub.status),
        tier: "pro",
        planKey,
        modules_csv: activeModules.join(","),
        primary_module: activeModules[0] || null,
        current_period_start: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: currentPeriodEnd,
        billing_interval: item?.price?.recurring?.interval || null,
        cancel_at_period_end: !!sub.cancel_at_period_end,
        updated_date: new Date().toISOString(),
      };
    } else if (appleActiveSub) {
      finalTier = "pro";
      providerUsed = "apple";
      const appleModules = String(appleActiveSub.modules_csv || "")
        .split(",")
        .map((m: string) => m.trim())
        .filter(Boolean);
      activeModules = appleModules.length ? appleModules : ["pipekeeper"];
    } else {
      // No active subscription found — preserve existing tier if it was paid
      const existingTier = String(userRow.entitlement_tier || userRow.subscription_tier || "").toLowerCase();
      if (existingTier === "pro" || existingTier === "premium") {
        finalTier = "pro";
        providerUsed = "preserved";
        activeModules = String(userRow.paid_modules_csv || "")
          .split(",")
          .map((m: string) => m.trim())
          .filter(Boolean);
        if (!activeModules.length) activeModules = ["pipekeeper"];
      } else {
        return Response.json({
          ok: false,
          error: "NO_ACTIVE_SUBSCRIPTION",
          message: `No active subscription found for ${email} via Stripe or Apple`,
          email,
          before,
        });
      }
    }

    const pipekeeper_paid = activeModules.includes("pipekeeper");
    const whiskeykeeper_paid = activeModules.includes("whiskeykeeper");
    const hasPaidAccess = finalTier === "pro";

    // ── Step 5: Build user update payload ────────────────────────────────────
    const userUpdatePayload: Record<string, unknown> = {
      // Canonical entitlement field — primary source checked by getEntitlementTier
      entitlement_tier: finalTier,
      has_paid_access: hasPaidAccess,
      // Per-module paid flags
      pipekeeper_paid,
      whiskeykeeper_paid,
      paid_modules_csv: activeModules.join(","),
      // Legacy fields for backward compatibility
      subscription_tier: finalTier,
      subscription_level: hasPaidAccess ? "paid" : "free",
      subscription_status: stripeResult ? mapStripeStatus(stripeResult.subscription.status) : "active",
      subscription_provider: providerUsed !== "none" && providerUsed !== "preserved" ? providerUsed : userRow.subscription_provider,
      // Clear stale cache — update updated_date so React Query re-fetches
      updated_date: new Date().toISOString(),
    };

    if (stripeResult) {
      userUpdatePayload.stripe_customer_id = stripeResult.customerId;
    }

    const after = { ...userUpdatePayload };

    if (!dryRun) {
      // ── Step 6: Upsert Subscription entity ──────────────────────────────────
      if (subscriptionPayload && stripeResult) {
        let existingSub: any = null;
        try {
          const byProviderId = await base44.asServiceRole.entities.Subscription.filter({
            provider_subscription_id: stripeResult.subscription.id,
          });
          existingSub = byProviderId?.[0] || null;
        } catch { /* ignore */ }

        if (!existingSub) {
          try {
            const byUserId = await base44.asServiceRole.entities.Subscription.filter({
              user_id: userId, provider: "stripe",
            });
            existingSub = byUserId?.[0] || null;
          } catch { /* ignore */ }
        }
        if (!existingSub) {
          try {
            const byEmail = await base44.asServiceRole.entities.Subscription.filter({
              user_email: email, provider: "stripe",
            });
            existingSub = byEmail?.[0] || null;
          } catch { /* ignore */ }
        }

        if (existingSub?.id) {
          await base44.asServiceRole.entities.Subscription.update(existingSub.id, subscriptionPayload);
          console.log(`[repairUserEntitlements] Updated subscription: ${existingSub.id}`);
        } else {
          const created = await base44.asServiceRole.entities.Subscription.create({
            ...subscriptionPayload,
            created_date: new Date().toISOString(),
          });
          console.log(`[repairUserEntitlements] Created subscription: ${created?.id}`);
        }
      }

      // ── Step 7: Update user entity ───────────────────────────────────────────
      await base44.asServiceRole.entities.User.update(userId, userUpdatePayload);
      console.log(`[repairUserEntitlements] User ${userId} (${email}) repaired to tier=${finalTier}, modules=[${activeModules}]`);

      // ── Step 8: Log repair event (non-fatal) ─────────────────────────────────
      try {
        await base44.asServiceRole.entities.RepairLog?.create?.({
          email,
          user_id: userId,
          repaired_by: me?.email || "admin",
          repair_type: "repairUserEntitlements",
          provider_used: providerUsed,
          subscription_id: subId,
          before: JSON.stringify(before),
          after: JSON.stringify(after),
          created_date: new Date().toISOString(),
        });
      } catch { /* RepairLog entity may not exist — non-fatal */ }
    }

    return Response.json({
      ok: true,
      email,
      userId,
      dryRun,
      applied: !dryRun,
      finalTier,
      activeModules,
      pipekeeper_paid,
      whiskeykeeper_paid,
      providerUsed,
      subscriptionId: subId,
      before,
      after,
    });
  } catch (error) {
    console.error("[repairUserEntitlements] error:", error);
    return Response.json(
      { ok: false, error: "FUNCTION_ERROR", message: String(error?.message || error) },
      { status: 500 }
    );
  }
});
