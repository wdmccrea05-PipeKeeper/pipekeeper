import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

function normEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

function normalizeTier(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return "free";
  if (t === "premium" || t === "pro" || t === "free") return t;
  if (t === "prem") return "premium";
  return "free";
}

async function fetchCurrentUser() {
  // Auth identity
  const authUser = await base44.auth.me();
  const userId = authUser?.id;
  const email = normEmail(authUser?.email);
  
  if (!userId || !email) {
    throw new Error("Auth missing id or email");
  }

  // Find canonical profile: prefer user_id, fallback email
  let userProfile = null;
  try {
    // Try by user_id first
    let profiles = await base44.entities.UserProfile.filter({ user_id: userId });
    userProfile = Array.isArray(profiles) ? (profiles[0] || null) : null;

    // Fallback: try by email
    if (!userProfile) {
      profiles = await base44.entities.UserProfile.filter({ user_email: email });
      userProfile = Array.isArray(profiles) ? (profiles[0] || null) : null;
    }

    // Create if missing
    if (!userProfile) {
      userProfile = await base44.entities.UserProfile.create({
        user_id: userId,
        user_email: email,
        display_name: authUser?.name || authUser?.full_name || "",
        subscription_tier: "free",
      });
    } else if (!userProfile.user_id || userProfile.user_email !== email) {
      // Backfill user_id or fix email casing
      await base44.entities.UserProfile.update(userProfile.id, {
        user_id: userId,
        user_email: email,
      });
      // Refresh the profile
      userProfile = {
        ...userProfile,
        user_id: userId,
        user_email: email,
      };
    }
  } catch (e) {
    console.warn("[useCurrentUser] UserProfile lookup/create failed:", e);
    // Don't hard-fail, continue without profile
  }

  // Subscription (optional) - try user_id first, then email
  let subscription = null;
  try {
    let subs = await base44.entities.Subscription.filter({ user_id: userId });
    subscription = Array.isArray(subs) ? (subs[0] || null) : null;

    if (!subscription) {
      subs = await base44.entities.Subscription.filter({ user_email: email });
      subscription = Array.isArray(subs) ? (subs[0] || null) : null;
    }
  } catch (e) {
    console.warn("[useCurrentUser] Subscription lookup failed:", e);
  }

  // Normalize tier (always lowercase)
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
    Boolean(userProfile?.legacy_premium) || Boolean(subscription?.legacy_premium) || false;

  const isPro = tier === "pro";
  const isPremium = tier === "premium" || tier === "pro";

  return {
    // auth
    id: userId,
    email,
    name: authUser?.name || authUser?.full_name || null,
    full_name: authUser?.full_name || authUser?.name || null,
    role: String(authUser?.role || "").toLowerCase(),
    created_date: authUser?.created_at || authUser?.created_date || null,
    tos_accepted_at: userProfile?.tos_accepted_at || authUser?.tos_accepted_at || null,

    // canonical entities
    userProfile,
    subscription,

    // subscription fields
    subscription_tier: tier,
    subscriptionTier: tier,
    subscription_status: subscription?.status || "free",
    subscription_interval: interval,
    subscriptionInterval: interval,
    legacy_premium: legacyPremium,

    // convenience flags
    isPro,
    isPremium,
    hasPremium: isPremium,
    hasPaid: isPremium,
    isAdmin: String(authUser?.role || "").toLowerCase() === "admin",
  };
}

export function useCurrentUser() {
  const q = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: "always",
  });

  // Backward compatibility: support both `.data` and `.user`
  const user = q.data || null;

  return {
    ...q,
    user,
    ...(user || {}),
  };
}