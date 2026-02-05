// src/components/hooks/useCurrentUser.jsx
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

function normEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

function normalizeTier(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";
  if (t === "free" || t === "premium" || t === "pro") return t;
  if (t === "prem") return "premium";
  return "free";
}

function is429(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("429") || msg.toLowerCase().includes("rate limit");
}

async function fetchCurrentUser() {
  const authUser = await base44.auth.me();
  const userId = authUser?.id || authUser?.user_id || null;
  const email = normEmail(authUser?.email);

  if (!userId || !email) throw new Error("Auth missing id or email");

  // IMPORTANT: keep entity calls minimal to avoid rate-limit storms.
  // 1) Try UserProfile by user_id first, fallback to email.
  let userProfile = null;
  try {
    const byId = await base44.entities.UserProfile.filter({ user_id: userId }, "-updated_date", 1);
    userProfile = Array.isArray(byId) ? byId[0] : null;

    if (!userProfile) {
      const byEmail = await base44.entities.UserProfile.filter({ user_email: email }, "-updated_date", 1);
      userProfile = Array.isArray(byEmail) ? byEmail[0] : null;
    }
  } catch (e) {
    console.warn("[useCurrentUser] UserProfile lookup failed:", e);
  }

  // 2) Subscription: try by user_id first, fallback to email. (NO created_by fan-out.)
  let subscription = null;
  try {
    const byId = await base44.entities.Subscription.filter({ user_id: userId }, "-updated_date", 1);
    subscription = Array.isArray(byId) ? byId[0] : null;

    if (!subscription) {
      const byEmail = await base44.entities.Subscription.filter({ user_email: email }, "-updated_date", 1);
      subscription = Array.isArray(byEmail) ? byEmail[0] : null;
    }
  } catch (e) {
    console.warn("[useCurrentUser] Subscription lookup failed:", e);
  }

  const profileTier = normalizeTier(userProfile?.subscription_tier);
  const subStatus = String(subscription?.status || "").toLowerCase();
  const subTier = normalizeTier(subscription?.tier || subscription?.subscription_tier);

  const subActive = ["active", "trialing"].includes(subStatus);
  const subTierValid = subTier === "premium" || subTier === "pro";
  const tier = subActive && subTierValid ? subTier : profileTier;

  const tos_accepted_at = userProfile?.tos_accepted_at || null;
  const tos_accepted = Boolean(userProfile?.tos_accepted) || Boolean(tos_accepted_at);

  const isPro = tier === "pro";
  const isPremium = tier === "premium" || tier === "pro";

  return {
    id: userId,
    email,
    name: authUser?.name || authUser?.full_name || null,
    full_name: authUser?.full_name || authUser?.name || null,
    role: String(authUser?.role || "user").toLowerCase(),

    userProfile,
    subscription,

    // Top-level flags used across app
    subscription_tier: tier,
    subscriptionTier: tier,
    subscription_status: subscription?.status || "free",
    isPro,
    isPremium,
    hasPremium: isPremium,
    hasPaid: isPremium,

    // Terms
    tos_accepted,
    tos_accepted_at,
  };
}

export function useCurrentUser() {
  const q = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,

    // Stop the storm:
    staleTime: 5 * 60_000, // 5 min
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,

    retry: (count, err) => {
      // Retry 429 a few times, then stop to avoid hammering the API
      if (is429(err)) return count < 3;
      return count < 1;
    },
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
  });

  const user = q.data || null;
  return { ...q, user, ...(user || {}) };
}