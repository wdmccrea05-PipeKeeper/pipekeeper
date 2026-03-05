import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getEntitlementTier, isLegacyPremium as checkLegacyPremium } from "./premiumAccessResolver.ts";

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
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

  // FIX BUG-08: Also accept "trial" and "past_due" (with grace period) to match frontend
  const isActive = (s) => {
    const status = String(s?.status || "").toLowerCase();
    if (status === "active" || status === "trialing" || status === "trial") return true;
    
    // past_due: allow if period hasn't ended (grace period)
    if (status === "past_due") {
      const periodEnd = s?.current_period_end;
      return !periodEnd || new Date(periodEnd).getTime() > Date.now();
    }
    
    // Allow incomplete ONLY if period_end is in future
    if (status === "incomplete") {
      const periodEnd = s?.current_period_end;
      return periodEnd && new Date(periodEnd).getTime() > Date.now();
    }
    
    return false;
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