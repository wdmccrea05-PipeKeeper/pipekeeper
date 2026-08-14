import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ============================================================================
// GRACE PERIOD POLICY (centralized constant)
// ============================================================================
const GRACE_PERIOD_DAYS = 5;

function isSubscriptionInGracePeriod(subscription) {
  if (!subscription) return false;
  
  const status = String(subscription?.status || "").toLowerCase();
  if (status !== "past_due" && status !== "incomplete" && status !== "unpaid") {
    return false;
  }
  
  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return false;
  
  try {
    const endDate = new Date(periodEnd);
    const graceEnd = new Date(endDate.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    return Date.now() <= graceEnd.getTime();
  } catch {
    return false;
  }
}

function subscriptionGrantsPaidAccess(subscription) {
  if (!subscription) return false;
  
  const status = String(subscription?.status || "").toLowerCase();
  
  if (status === "active" || status === "trialing" || status === "trial") {
    return true;
  }
  
  if (status === "past_due" || status === "incomplete" || status === "unpaid") {
    return isSubscriptionInGracePeriod(subscription);
  }
  
  return false;
}

// ============================================================================
// TIER RESOLUTION
// ============================================================================
const LEGACY_PREMIUM_CUTOFF = "2026-02-01T00:00:00.000Z";

function normalizeTier(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";
  if (t === "pro") return "pro";
  if (t === "premium") return "premium";
  if (t === "paid" || t === "plus" || t === "subscriber" || t === "subscribed") return "premium";
  return "free";
}

function getEntitlementTier(user, subscription) {
  const role = (user?.role || "").toLowerCase();
  if (role === "admin" || role === "owner" || user?.is_admin === true) {
    return "pro";
  }

  const fromUserEntitlement =
    user?.data?.entitlement_tier ??
    user?.entitlement_tier ??
    user?.entitlementTier ??
    user?.entitlement ??
    user?.tier;

  const t1 = normalizeTier(fromUserEntitlement);
  if (t1 !== "free") return t1;

  const fromUserLegacy =
    user?.subscription_tier ??
    user?.subscriptionTier ??
    user?.subscriptionLevel ??
    user?.plan ??
    user?.plan_level;

  const t2 = normalizeTier(fromUserLegacy);
  if (t2 !== "free") return t2;

  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    const fromSub =
      subscription?.tier ??
      subscription?.subscription_tier ??
      subscription?.plan ??
      subscription?.plan_level;

    const t3 = normalizeTier(fromSub);
    if (t3 !== "free") return t3;
  }

  return "free";
}

function checkLegacyPremium(subscription) {
  if (!subscription) return false;
  const tier = (subscription.tier || "").toLowerCase();
  if (tier === "pro") return false;
  const startDate = subscription.subscriptionStartedAt || subscription.started_at;
  if (!startDate) return false;
  try {
    const cutoff = new Date(LEGACY_PREMIUM_CUTOFF);
    const start = new Date(startDate);
    return start < cutoff;
  } catch {
    return false;
  }
}

// FIX BUG-06: Add optional requiredTier parameter for Pro-tier backend gating
// FIX BUG-08: Align isActive with frontend — add "trial" and "past_due" (with grace period)
export async function requireEntitlement(req, requiredTier = "paid") {
  const base44 = createClientFromRequest(req);
  const me = await base44.auth.me();
  
  if (!me?.id) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" };
  }

  const email = normEmail(me.email);

  // Use centralized grace period helper
  const isActive = (s) => {
    return subscriptionGrantsPaidAccess(s);
  };

  // FIX BUG-06: Helper to check tier when requiredTier === "pro"
  const checkTier = async (activeSub, userRecord = null) => {
    if (requiredTier !== "pro") return { ok: true };
    const tier = getEntitlementTier(userRecord || me, activeSub);
    const isLegacy = checkLegacyPremium(activeSub);
    if (tier !== "pro" && !isLegacy) {
      return { ok: false, status: 403, error: "REQUIRES_PRO_TIER" };
    }
    return { ok: true };
  };

  // 1) Preferred: active sub by user_id (either provider)
  try {
    const byUserId = await base44.entities.Subscription.filter({ user_id: me.id });
    if (Array.isArray(byUserId) && byUserId.some(isActive)) {
      const activeSub = byUserId.find(isActive);
      const tierCheck = await checkTier(activeSub);
      if (!tierCheck.ok) return { ...tierCheck, me };
      return { ok: true, me };
    }
  } catch (e) {
    console.warn("[requireEntitlement] user_id lookup failed:", e);
  }

  // 2) Legacy fallback: stripe by email
  if (email) {
    try {
      const byEmail = await base44.entities.Subscription.filter({ 
        provider: "stripe", 
        user_email: email 
      });
      if (Array.isArray(byEmail) && byEmail.some(isActive)) {
        const activeSub = byEmail.find(isActive);
        const tierCheck = await checkTier(activeSub);
        if (!tierCheck.ok) return { ...tierCheck, me };
        return { ok: true, me };
      }
    } catch (e) {
      console.warn("[requireEntitlement] email lookup failed:", e);
    }
  }

  // 3) Denormalized fallback (failsafe)
  let activeSub = null;
  try {
    const users = await base44.entities.User.filter({ email });
    const u = Array.isArray(users) ? users[0] : null;
    if (u?.subscription_level === "paid") {
      // Collect active sub for potential tier check below
      try {
        const byUserId = await base44.entities.Subscription.filter({ user_id: me.id });
        activeSub = Array.isArray(byUserId) ? byUserId.find(isActive) || null : null;
        if (!activeSub && email) {
          const byEmail = await base44.entities.Subscription.filter({ provider: "stripe", user_email: email });
          activeSub = Array.isArray(byEmail) ? byEmail.find(isActive) || null : null;
        }
      } catch { /* non-fatal */ }
      
      // FIX BUG-06: Pro-tier check when subscription_level === "paid" via User entity fallback
      const tierCheck = await checkTier(activeSub, u);
      if (!tierCheck.ok) return { ...tierCheck, me };
      
      return { ok: true, me };
    }
  } catch (e) {
    console.warn("[requireEntitlement] User entity fallback failed:", e);
  }

  return { ok: false, status: 403, error: "NO_ENTITLEMENT" };
}