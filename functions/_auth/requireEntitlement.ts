import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function requireEntitlement(req) {
  const base44 = createClientFromRequest(req);
  const me = await base44.auth.me();
  
  if (!me?.id) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" };
  }

  const email = normEmail(me.email);

  const isActive = (s) => {
    const status = String(s?.status || "").toLowerCase();
    if (status === "active" || status === "trialing") return true;
    
    // Allow incomplete ONLY if period_end is in future
    if (status === "incomplete") {
      const periodEnd = s?.current_period_end;
      return periodEnd && new Date(periodEnd).getTime() > Date.now();
    }
    
    return false;
  };

  // 1) Preferred: active sub by user_id (either provider)
  try {
    const byUserId = await base44.entities.Subscription.filter({ user_id: me.id });
    if (Array.isArray(byUserId) && byUserId.some(isActive)) {
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
        return { ok: true, me };
      }
    } catch (e) {
      console.warn("[requireEntitlement] email lookup failed:", e);
    }
  }

  // 3) Denormalized fallback (failsafe)
  try {
    const users = await base44.entities.User.filter({ email });
    const u = Array.isArray(users) ? users[0] : null;
    if (u?.subscription_level === "paid") {
      return { ok: true, me };
    }
  } catch (e) {
    console.warn("[requireEntitlement] User entity fallback failed:", e);
  }

  return { ok: false, status: 403, error: "NO_ENTITLEMENT" };
}