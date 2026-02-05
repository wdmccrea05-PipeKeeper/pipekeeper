import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * CRITICAL FIX:
 * Base44 no longer exposes an `entities.User` schema in this app.
 * The canonical per-user record is `UserProfile` (keyed by `user_email`).
 *
 * If anything touches `base44.entities.User`, Base44 will throw:
 *  - "Entity schema User not found in app"
 *  - and/or 404 on /entities/User/me
 *
 * This hook must never reference entities.User.
 */

function normalizeTier(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";
  if (t === "premium" || t === "pro" || t === "free") return t;
  // handle older uppercase values
  if (t === "prem") return "premium";
  return "free";
}

async function fetchCurrentUser() {
  // 1) Auth identity (this is the only "user" that is guaranteed to exist)
  const authUser = await base44.auth.me();
  const email = (authUser?.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Auth user missing email");
  }

  // 2) UserProfile record (safe canonical entity)
  let userProfile = null;
  try {
    const profiles = await base44.entities.UserProfile.filter({ user_email: email });
    userProfile = profiles?.[0] || null;
  } catch (e) {
    // Do not hard-fail login if profile lookup has a transient issue
    console.warn("[useCurrentUser] UserProfile lookup failed:", e);
  }

  // 3) Subscription record (your app already uses this in Profile.jsx)
  let subscription = null;
  try {
    const subs = await base44.entities.Subscription.filter({ user_email: email });
    subscription = subs?.[0] || null;
  } catch (e) {
    console.warn("[useCurrentUser] Subscription lookup failed:", e);
  }

  // 4) Normalize tier (always lowercase)
  const tier = normalizeTier(
    userProfile?.subscription_tier ||
    subscription?.tier ||
    subscription?.subscription_tier ||
    "free"
  );

  const interval =
    userProfile?.subscription_interval ||
    subscription?.interval ||
    subscription?.subscription_interval ||
    null;

  const legacyPremium =
    Boolean(userProfile?.legacy_premium) ||
    Boolean(subscription?.legacy_premium) ||
    false;

  return {
    // Auth
    id: authUser?.id || authUser?.user_id || null,
    email,
    name: authUser?.name || authUser?.full_name || null,
    full_name: authUser?.full_name || authUser?.name || null,
    role: authUser?.role || "user",
    created_date: authUser?.created_at || authUser?.created_date || null,
    tos_accepted_at: authUser?.tos_accepted_at || null,
    isFoundingMember: userProfile?.isFoundingMember || false,
    foundingMemberAcknowledged: userProfile?.foundingMemberAcknowledged || false,

    // Profile (canonical)
    userProfile,

    // Subscription
    subscription,
    subscription_tier: tier,
    subscriptionTier: tier,
    subscription_status: subscription?.status || "free",
    subscription_level: (tier !== "free") ? "paid" : "free",
    subscription_interval: interval,
    subscriptionInterval: interval,
    legacy_premium: legacyPremium,

    // Convenience flags (normalized lowercase)
    isPremium: tier === "premium" || tier === "pro",
    isPro: tier === "pro",
    hasPremium: tier === "premium" || tier === "pro",
    hasPaid: tier === "premium" || tier === "pro",
    isAdmin: authUser?.role === "admin",
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: 1,
  });
}