import { base44 } from "@/api/base44Client";
import { 
  getEntitlementTier, 
  hasPaidAccess, 
  hasProAccess, 
  hasPremiumAccess, 
  isTrialingAccess, 
  getPlanLabel,
  isFoundingMember
} from "@/components/utils/premiumAccess";
import { resolveProviderFromUser, resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";
import { useEffect } from "react";
import { useQuery as useQueryRQ, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// Module-level in-flight locks — prevent duplicate calls when multiple components mount simultaneously
let ensureUserInFlight = false;
let syncSubscriptionInFlight = false;

export function useCurrentUser() {
  const queryClient = useQueryClient();

  // Use the user already fetched by AuthContext to avoid a duplicate base44.auth.me() call
  // on startup. The queryFn still runs on explicit invalidateQueries/refetch calls.
  const { user: authUser, isLoadingAuth, isAuthenticated } = useAuth();

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQueryRQ({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const freshUser = await base44.auth.me();
        if (!freshUser?.email) return null;

        const email = normEmail(freshUser.email);
        const userId = freshUser.id || freshUser.auth_user_id;

        // Use auth user directly - all relevant fields are already included
        // (Base44's auth.me() includes all user entity fields)
        return {
          ...freshUser,
          id: userId,
          email,
        };
      } catch (error) {
        if (import.meta?.env?.DEV) {
          console.warn("[useCurrentUser] Error:", error);
        }
        throw error;
      }
    },
    // Seed the cache with the user already fetched by AuthContext so no duplicate
    // base44.auth.me() call is made on startup. Explicit invalidateQueries/refetch
    // calls still trigger the queryFn to get fresh data.
    // When authUser is null (not logged in), initialData is undefined so the queryFn
    // will run — but AuthenticatedApp blocks rendering until auth is resolved, so this
    // case only occurs when an explicit refetch is triggered post-logout.
    initialData: authUser
      ? {
          ...authUser,
          id: authUser.id || authUser.auth_user_id,
          email: authUser.email ? normEmail(authUser.email) : authUser.email,
        }
      : undefined,
    // Mark initialData as fresh as-of now. AuthenticatedApp blocks child rendering
    // until auth completes, so the delta between auth fetch and hook mount is negligible
    // (sub-second). Together with staleTime below this prevents an immediate re-fetch.
    initialDataUpdatedAt: authUser ? Date.now() : 0,
    // Keep data fresh for 5 minutes to avoid redundant background refetches.
    staleTime: 5 * 60 * 1000,
    // Don't start the query until auth has resolved so the initialData is available.
    // If auth completes with no user (logged-out state), the queryFn runs and correctly
    // handles the 401 from base44.auth.me() while AuthenticatedApp redirects to login.
    enabled: !isLoadingAuth && !!authUser && isAuthenticated,
    retry: 2,
  });

  const userId = user?.id || user?.auth_user_id;
  const email = user?.email ? normEmail(user.email) : null;

  // Fetch UserProfile for module enablement fields
  const {
    data: userProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useQueryRQ({
    queryKey: ["user-profile", email],
    queryFn: async () => {
      if (!email) return null;
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: email });
        const profile = profiles?.[0] || null;
        if (import.meta?.env?.DEV) {
          console.log('[useCurrentUser] UserProfile loaded:', profile?.id ? 'found' : 'not found');
        }
        return profile;
      } catch (error) {
        if (import.meta?.env?.DEV) {
          console.warn("[useCurrentUser] UserProfile fetch error:", error);
        }
        return null;
      }
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: subscription,
    isLoading: subLoading,
    refetch: refetchSubscription,
  } = useQueryRQ({
    // FIX BUG-02: Use stable key that invalidates when primary lookup changes
    queryKey: ["subscription", userId || email],
    queryFn: async () => {
      if (!userId && !email) return null;

      try {
        // Prefer user_id lookup (account-linked), fallback to email (legacy Stripe)
        let subs = [];
        if (userId) {
          subs = await base44.entities.Subscription.filter({ user_id: userId });
        }
        if (subs.length === 0 && email) {
          subs = await base44.entities.Subscription.filter({ user_email: email });
        }

        if (!subs || subs.length === 0) return null;

        // Filter to subscriptions that grant paid access (including grace period)
        const { subscriptionGrantsPaidAccess } = await import("@/components/utils/gracePeriod");
        const valid = subs.filter((s) => subscriptionGrantsPaidAccess(s));

        if (valid.length === 0) {
          // FIX BUG-04: When all subscriptions are in a non-active state (e.g. "canceled"
          // immediately after a Stripe deletion event), return the most recently updated one
          // as a fallback so user-level entitlement fields remain the tiebreaker.
          const fallback = [...subs].sort((a, b) => {
            const aDate = new Date(a.updated_date || a.created_date || 0).getTime();
            const bDate = new Date(b.updated_date || b.created_date || 0).getTime();
            return bDate - aDate;
          });
          return fallback[0] || null;
        }

        // Pick best subscription: pro > premium, then active > trialing > most recent
        valid.sort((a, b) => {
          // Prioritize pro tier
          const aPro = (a.tier || '').toLowerCase() === 'pro' ? 1 : 0;
          const bPro = (b.tier || '').toLowerCase() === 'pro' ? 1 : 0;
          if (aPro !== bPro) return bPro - aPro;

          // Then active status
          const aActive = a.status === "active" ? 1 : 0;
          const bActive = b.status === "active" ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;

          // Then trialing
          const aTrialing = a.status === "trialing" || a.status === "trial" ? 1 : 0;
          const bTrialing = b.status === "trialing" || b.status === "trial" ? 1 : 0;
          if (aTrialing !== bTrialing) return bTrialing - aTrialing;

          // Finally most recent
          const aDate = new Date(a.current_period_start || a.created_date || 0).getTime();
          const bDate = new Date(b.current_period_start || b.created_date || 0).getTime();
          return bDate - aDate;
        });

        return valid[0];
      } catch (error) {
        if (import.meta?.env?.DEV) {
          console.warn("[useCurrentUser] Subscription query error:", error);
        }
        return null;
      }
    },
    enabled: !!(userId || email),
    // FIX: Set reasonable staleTime to reduce unnecessary refetches
    // Subscription data is mostly static; sync logic handles webhook delays
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Invalidate profile cache when email changes
  useEffect(() => {
    if (email) {
      queryClient.invalidateQueries({ 
        queryKey: ["user-profile", email],
        exact: true 
      });
    }
  }, [email, queryClient]);

  // Ensure user record exists with platform info
  useEffect(() => {
    if (userLoading || !user?.email) return;
    
    const sessionKey = `pk_user_ensured_${user.email}`;
    if (sessionStorage.getItem(sessionKey) || ensureUserInFlight) return;

    ensureUserInFlight = true;
    let cancelled = false;

    (async () => {
      try {
        await base44.functions.invoke("ensureUserRecord", {});
        if (!cancelled) {
          sessionStorage.setItem(sessionKey, 'true');
          await Promise.all([refetchUser(), refetchProfile()]);
        }
      } catch (err) {
        if (!cancelled) sessionStorage.setItem(sessionKey, 'true');
        if (import.meta?.env?.DEV) {
          console.warn("[useCurrentUser] ensureUserRecord failed (non-fatal):", err?.message || err);
        }
      } finally {
        ensureUserInFlight = false;
      }
    })();

    return () => { cancelled = true; };
  }, [userLoading, user?.email, refetchUser, refetchProfile]);

  // Subscription sync on mount
  useEffect(() => {
    if (userLoading || !user?.email) return;

    const sessionKey = `pk_subscription_sync_${user.email}`;
    const lastSync = sessionStorage.getItem(sessionKey);
    const SYNC_INTERVAL = 10 * 60 * 1000;
    
    if ((lastSync && Date.now() - Number(lastSync) < SYNC_INTERVAL) || syncSubscriptionInFlight) return;

    syncSubscriptionInFlight = true;
    let cancelled = false;

    (async () => {
      try {
        await base44.functions.invoke("syncSubscriptionForMe", {});
      } catch (err) {
        if (import.meta?.env?.DEV) {
          console.warn("[useCurrentUser] syncSubscriptionForMe failed (non-fatal):", err?.message || err);
        }
      } finally {
        syncSubscriptionInFlight = false;
        if (!cancelled) {
          sessionStorage.setItem(sessionKey, String(Date.now()));
          await queryClient.invalidateQueries({ 
            queryKey: ["subscription", userId || email],
            exact: true 
          });
          await Promise.all([refetchUser(), refetchSubscription()]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userLoading, user?.email, refetchUser, refetchSubscription]);

  // Authoritative provider: user.subscription_provider, then subscription.provider.
  const provider = resolveProviderFromUser(user) || resolveSubscriptionProvider(subscription);

  // Use CANONICAL resolver functions (single source of truth)
  // Fast-path: if user.has_paid_access is explicitly true (written by webhook/sync), trust it
  const tier = getEntitlementTier(user, subscription);
  const hasPaid = hasPaidAccess(user, subscription);
  // No premium tier — hasPremium === hasPro === hasPaid
  const hasPremium = hasPaid;
  const hasPro = hasPaid;
  const isTrial = isTrialingAccess(user, subscription);
  const planLabel = getPlanLabel(user, subscription);
  const isAdmin = user?.role === "admin";
  const isFounding = isFoundingMember(user);

  // Merge user with userProfile for module fields
  const mergedUser = userProfile ? { ...user, ...userProfile } : user;

  const isLoading = userLoading || subLoading || profileLoading;

  const refetch = async () => {
    await Promise.all([refetchUser(), refetchSubscription()]);
  };

  return {
    user: mergedUser,
    subscription,
    provider, // Canonical provider (stripe, apple, or null)
    tier, // Canonical tier from getEntitlementTier
    isLoading,
    error: userError,
    hasPremium,
    hasPaid,
    hasPro,
    isTrial,
    planLabel, // Canonical plan label
    isAdmin,
    isFoundingMember: isFounding,
    refetch,
  };
}