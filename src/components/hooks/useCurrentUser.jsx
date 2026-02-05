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
  const email = normEmail(authUser?.email);
  if (!email) throw new Error("Auth user missing email");

  // UserProfile (canonical)
  let userProfile = null;
  try {
    const profiles = await base44.entities.UserProfile.filter({ user_email: email });
    userProfile = Array.isArray(profiles) ? (profiles[0] || null) : null;

    // If missing, try to create it (so first login actually works)
    if (!userProfile) {
      try {
        userProfile = await base44.entities.UserProfile.create({
          user_email: email,
          display_name: authUser?.name || authUser?.full_name || "",
          subscription_tier: "free",
        });
      } catch (e) {
        // If create is blocked by permissions/RLS, don't hard fail
        console.warn("[useCurrentUser] UserProfile create failed:", e);
      }
    }
  } catch (e) {
    console.warn("[useCurrentUser] UserProfile lookup failed:", e);
  }

  // Subscription (optional)
  let subscription = null;
  try {
    const subs = await base44.entities.Subscription.filter({ user_email: email });
    subscription = Array.isArray(subs) ? (subs[0] || null) : null;
  } catch (e) {
    console.warn("[useCurrentUser] Subscription lookup failed:", e);
  }

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
    id: authUser?.id || authUser?.user_id || null,
    email,
    name: authUser?.name || authUser?.full_name || null,
    full_name: authUser?.full_name || authUser?.name || null,
    role: authUser?.role || "user",
    created_date: authUser?.created_at || authUser?.created_date || null,

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
    queryKey: ["current-user"], // IMPORTANT: match the rest of the app
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: "always",
  });

  // Backward compatibility layer:
  // - supports const { data } = useCurrentUser()
  // - supports const { user } = useCurrentUser()
  const user = q.data || null;

  return {
    ...q,
    user,
    ...(user || {}),
  };
}