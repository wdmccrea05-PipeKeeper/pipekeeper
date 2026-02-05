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

function tierRank(tier) {
  const t = normalizeTier(tier);
  if (t === "pro") return 3;
  if (t === "premium") return 2;
  return 1;
}

function pickBestProfile(profiles = []) {
  if (!profiles.length) return null;

  const sorted = [...profiles].sort((a, b) => {
    const r = tierRank(b?.subscription_tier) - tierRank(a?.subscription_tier);
    if (r !== 0) return r;

    const ad = new Date(a?.updated_date || a?.updated_at || a?.created_date || 0).getTime();
    const bd = new Date(b?.updated_date || b?.updated_at || b?.created_date || 0).getTime();
    return bd - ad;
  });

  return sorted[0] || null;
}

function pickBestSubscription(subs = []) {
  if (!subs.length) return null;

  const uniq = [];
  const seen = new Set();
  for (const s of subs) {
    if (!s) continue;
    const id = s?.id || s?._id;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    uniq.push(s);
  }

  uniq.sort((a, b) => {
    const aActive = ["active", "trialing"].includes(String(a?.status || "").toLowerCase());
    const bActive = ["active", "trialing"].includes(String(b?.status || "").toLowerCase());
    if (aActive !== bActive) return (bActive ? 1 : 0) - (aActive ? 1 : 0);

    const ad = new Date(a?.updated_date || a?.updated_at || a?.created_date || 0).getTime();
    const bd = new Date(b?.updated_date || b?.updated_at || b?.created_date || 0).getTime();
    return bd - ad;
  });

  return uniq[0] || null;
}

async function fetchCurrentUser() {
  const authUser = await base44.auth.me();
  const userId = authUser?.id || authUser?.user_id || null;
  const email = normEmail(authUser?.email);

  if (!userId || !email) throw new Error("Auth missing id or email");

  // --- UserProfile: fetch both by user_id and by email; pick best; backfill user_id/email ---
  let userProfile = null;
  try {
    const [byId, byEmail] = await Promise.all([
      base44.entities.UserProfile.filter({ user_id: userId }).catch(() => []),
      base44.entities.UserProfile.filter({ user_email: email }).catch(() => []),
    ]);

    let allProfiles = [
      ...(Array.isArray(byId) ? byId : []),
      ...(Array.isArray(byEmail) ? byEmail : []),
    ].filter(Boolean);

    // de-dupe by id
    const seen = new Set();
    allProfiles = allProfiles.filter((p) => {
      const id = p?.id || p?._id;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    userProfile = pickBestProfile(allProfiles);

    // Only create if truly none exist
    if (!userProfile) {
      // If normal users aren't allowed to create, this will throw; we don't want to break the whole app.
      try {
        userProfile = await base44.entities.UserProfile.create({
          user_id: userId,
          user_email: email,
          display_name: authUser?.name || authUser?.full_name || "",
          subscription_tier: "free",
        });
      } catch (e) {
        console.warn("[useCurrentUser] UserProfile.create failed (likely permissions):", e);
        userProfile = null;
      }
    } else {
      // Backfill without overwriting tier
      const patch = {};
      if (!userProfile.user_id) patch.user_id = userId;
      if (userProfile.user_email && normEmail(userProfile.user_email) !== email) patch.user_email = email;
      if (!userProfile.user_email) patch.user_email = email;

      if (Object.keys(patch).length) {
        try {
          await base44.entities.UserProfile.update(userProfile.id, patch);
          userProfile = { ...userProfile, ...patch };
        } catch (e) {
          console.warn("[useCurrentUser] UserProfile.update(backfill) failed:", e);
        }
      }
    }
  } catch (e) {
    console.warn("[useCurrentUser] UserProfile lookup failed:", e);
  }

  // --- Subscription: robust lookup across likely keys ---
  let subscription = null;
  try {
    const candidates = [];

    // 1) by user_id
    try {
      const r = await base44.entities.Subscription.filter({ user_id: userId }, "-updated_date", 5);
      if (Array.isArray(r)) candidates.push(...r);
    } catch {}

    // 2) by user_email
    try {
      const r = await base44.entities.Subscription.filter({ user_email: email }, "-updated_date", 5);
      if (Array.isArray(r)) candidates.push(...r);
    } catch {}

    // 3) by created_by email
    try {
      const r = await base44.entities.Subscription.filter({ created_by: email }, "-updated_date", 5);
      if (Array.isArray(r)) candidates.push(...r);
    } catch {}

    // 4) by created_by auth id
    try {
      const r = await base44.entities.Subscription.filter({ created_by: userId }, "-updated_date", 5);
      if (Array.isArray(r)) candidates.push(...r);
    } catch {}

    subscription = pickBestSubscription(candidates);
  } catch (e) {
    console.warn("[useCurrentUser] Subscription lookup failed:", e);
  }

  // --- Decide tier (prefer active subscription tier if present) ---
  const profileTier = normalizeTier(userProfile?.subscription_tier);
  const subStatus = String(subscription?.status || "").toLowerCase();
  const subTier = normalizeTier(subscription?.tier || subscription?.subscription_tier);

  const subActive = ["active", "trialing"].includes(subStatus);
  const subTierValid = subTier === "premium" || subTier === "pro";

  const tier = subActive && subTierValid ? subTier : profileTier;

  // Optional: if subscription indicates paid and profile is free, attempt to backfill profile tier (non-fatal)
  if (userProfile?.id && tier !== profileTier && (tier === "premium" || tier === "pro")) {
    try {
      await base44.entities.UserProfile.update(userProfile.id, { subscription_tier: tier });
      userProfile = { ...userProfile, subscription_tier: tier };
    } catch (e) {
      // Ignore if user can't update; subscription still drives UI
      console.warn("[useCurrentUser] UserProfile.update(tier backfill) failed:", e);
    }
  }

  const isPro = tier === "pro";
  const isPremium = tier === "premium" || tier === "pro";

  return {
    // auth
    id: userId,
    email,
    name: authUser?.name || authUser?.full_name || null,
    full_name: authUser?.full_name || authUser?.name || null,
    role: String(authUser?.role || "user").toLowerCase(),
    created_date: authUser?.created_at || authUser?.created_date || null,

    // entities
    userProfile,
    subscription,

    // subscription fields
    subscription_tier: tier,
    subscriptionTier: tier,
    subscription_status: subscription?.status || "free",
    subscription_interval:
      userProfile?.subscription_interval ||
      subscription?.interval ||
      subscription?.subscription_interval ||
      null,

    // terms acceptance
    tos_accepted_at: userProfile?.tos_accepted_at || null,

    // flags
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

  // Backward-compatible API:
  // - const { data } = useCurrentUser()
  // - const { user, isPro, hasPaid } = useCurrentUser()
  return { ...q, user, ...(user || {}) };
}