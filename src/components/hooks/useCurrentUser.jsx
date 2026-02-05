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

function tierRank(tier) {
  const t = normalizeTier(tier);
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

function pickBestProfile(profiles = []) {
  if (!profiles.length) return null;

  // Prefer highest tier, then most recently updated
  const sorted = [...profiles].sort((a, b) => {
    const r = tierRank(b?.subscription_tier) - tierRank(a?.subscription_tier);
    if (r !== 0) return r;

    const ad = new Date(a?.updated_date || a?.updated_at || a?.created_date || 0).getTime();
    const bd = new Date(b?.updated_date || b?.updated_at || b?.created_date || 0).getTime();
    return bd - ad;
  });

  return sorted[0] || null;
}

async function fetchCurrentUser() {
  const authUser = await base44.auth.me();
  const userId = authUser?.id;
  const email = normEmail(authUser?.email);

  if (!userId || !email) throw new Error("Auth missing id or email");

  // Load ALL candidate profiles (user_id and email) and choose best
  let userProfile = null;
  let allProfiles = [];

  try {
    const byId = await base44.entities.UserProfile.filter({ user_id: userId });
    const byEmail = await base44.entities.UserProfile.filter({ user_email: email });

    allProfiles = [
      ...(Array.isArray(byId) ? byId : []),
      ...(Array.isArray(byEmail) ? byEmail : []),
    ].filter(Boolean);

    // de-dupe by id
    const seen = new Set();
    allProfiles = allProfiles.filter((p) => {
      if (!p?.id) return true;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    userProfile = pickBestProfile(allProfiles);

    // Only create if truly none exist
    if (!userProfile) {
      userProfile = await base44.entities.UserProfile.create({
        user_id: userId,
        user_email: email,
        display_name: authUser?.name || authUser?.full_name || "",
        subscription_tier: "free",
      });
    } else {
      // Backfill user_id/email onto the chosen profile (do NOT overwrite tier)
      const patch = {};
      if (!userProfile.user_id) patch.user_id = userId;
      if (userProfile.user_email !== email) patch.user_email = email;

      if (Object.keys(patch).length) {
        await base44.entities.UserProfile.update(userProfile.id, patch);
        userProfile = { ...userProfile, ...patch };
      }
    }
  } catch (e) {
    console.warn("[useCurrentUser] UserProfile lookup/merge failed:", e);
  }

  // Subscription lookup (try user_id then email)
  let subscription = null;
  try {
    let subs = await base44.entities.Subscription.filter({ user_id: userId });
    subscription = Array.isArray(subs) ? subs[0] : null;

    if (!subscription) {
      subs = await base44.entities.Subscription.filter({ user_email: email });
      subscription = Array.isArray(subs) ? subs[0] : null;
    }
  } catch (e) {
    console.warn("[useCurrentUser] Subscription lookup failed:", e);
  }

  // Determine tier: subscription wins if active with valid tier, else profile tier
  const subTier = normalizeTier(subscription?.tier || subscription?.subscription_tier);
  const subStatus = String(subscription?.status || "").toLowerCase();
  const isActiveSub = subStatus === "active" || subStatus === "trialing";
  const hasValidSubTier = subTier === "premium" || subTier === "pro";

  const profileTier = normalizeTier(userProfile?.subscription_tier);
  const tier = (isActiveSub && hasValidSubTier) ? subTier : profileTier;

  const isPro = tier === "pro";
  const isPremium = tier === "premium" || tier === "pro";

  return {
    id: userId,
    email,
    name: authUser?.name || authUser?.full_name || null,
    full_name: authUser?.full_name || authUser?.name || null,
    role: String(authUser?.role || "").toLowerCase(),
    created_date: authUser?.created_at || authUser?.created_date || null,

    userProfile,
    subscription,

    subscription_tier: tier,
    subscriptionTier: tier,
    subscription_status: subscription?.status || "free",
    subscription_interval:
      userProfile?.subscription_interval ||
      subscription?.interval ||
      subscription?.subscription_interval ||
      null,

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

  const user = q.data || null;

  // Backward compatible API:
  // - const { data } = useCurrentUser()
  // - const { user, isPro } = useCurrentUser()
  return { ...q, user, ...(user || {}) };
}