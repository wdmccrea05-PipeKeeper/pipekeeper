// components/hooks/useCurrentUser.jsx
// CANONICAL USER STATE HOOK - Use this everywhere instead of direct base44.auth.me() calls
// Single source of truth for user data, subscription status, and premium access
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hasPremiumAccess, hasPaidAccess } from "@/components/utils/premiumAccess";
import { hasTrialAccess, isTrialWindow, getTrialDaysRemaining } from "@/components/utils/trialAccess";
import { isIOSCompanion, isCompanionApp } from "@/components/utils/companion";
import { isAppleBuild } from "@/components/utils/appVariant";
import { ensureFreeGrandfatherFlag } from "@/components/utils/freeGrandfathering";
import { useEffect } from "react";

export function useCurrentUser() {
  // Fetch auth user + entity User + Subscription in parallel
  const { data: rawUser, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const authUser = await base44.auth.me();
      const email = (authUser?.email || "").trim().toLowerCase();

      // Fetch entity User record
      const entityUser = await (async () => {
        try {
          if (!email) return null;
          const rows = await base44.entities.User.filter({ email });
          return rows?.[0] || null;
        } catch (e) {
          console.warn("[useCurrentUser] Could not load entities.User:", e);
          return null;
        }
      })();

      // Merge auth + entity
      return {
        ...authUser,
        ...(entityUser || {}),
        email: authUser?.email || entityUser?.email,
      };
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ["subscription", rawUser?.email],
    queryFn: async () => {
      try {
        if (!rawUser?.email) return null;
        const subs = await base44.entities.Subscription.filter(
          { user_email: rawUser.email },
          "-current_period_end",
          5
        );
        if (!subs?.length) return null;
        
        // Prefer active/trialing
        return subs.find((s) => s.status === "active" || s.status === "trialing") || subs[0];
      } catch {
        return null;
      }
    },
    enabled: !!rawUser?.email,
    staleTime: 30_000,
    retry: 1,
  });

  // Compute derived flags
  const isLoading = userLoading || subLoading;
  const hasPremium = hasPremiumAccess(rawUser, subscription);
  const hasPaid = hasPaidAccess(rawUser, subscription);
  const isPro = hasPaid && subscription?.tier === 'pro';
  const hasTrial = hasTrialAccess(rawUser);
  const isInTrial = isTrialWindow(rawUser);
  const trialDaysRemaining = getTrialDaysRemaining(rawUser);
  const isIOS = isIOSCompanion();
  const isCompanion = isCompanionApp();
  const isApple = isAppleBuild;
  const isAdmin = (rawUser?.role || "").toLowerCase() === "admin";

  // Auto-grandfather free users who exceed limits
  useEffect(() => {
    if (!isLoading && rawUser && !hasPaid) {
      ensureFreeGrandfatherFlag(rawUser);
    }
  }, [isLoading, rawUser, hasPaid]);

  // Dev-only tier/entitlement debug output
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && !isLoading && rawUser?.email) {
      const debugInfo = {
        email: rawUser.email,
        tier: subscription?.tier || 'free',
        isOnTrial: isInTrial,
        isLegacyPremium: subscription?.tier === 'premium' && subscription?.subscriptionStartedAt && 
          new Date(subscription.subscriptionStartedAt) < new Date('2026-02-01T00:00:00.000Z'),
        isFoundingMember: rawUser.isFoundingMember === true,
        subscriptionStartedAt: subscription?.subscriptionStartedAt || subscription?.started_at || 'N/A',
        hasPaid,
        hasPremium,
      };
      console.log('[PipeKeeper Dev] Entitlements:', debugInfo);
    }
  }, [isLoading, rawUser, subscription, isInTrial, hasPaid, hasPremium]);

  return {
    user: rawUser,
    subscription,
    isLoading,
    error: userError,
    hasPremium,
    hasPaid,
    isPro,
    hasTrial,
    isInTrial,
    trialDaysRemaining,
    isIOS,
    isCompanion,
    isApple,
    isAdmin,
    refetch: async () => {
      await refetchUser();
      await refetchSubscription();
    },
  };
}