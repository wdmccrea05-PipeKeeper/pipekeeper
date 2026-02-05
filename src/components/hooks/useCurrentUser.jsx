// components/hooks/useCurrentUser.jsx
// CANONICAL USER STATE HOOK - Account-linked subscription system
// Resolves entitlements by user_id first, then email fallback for legacy Stripe
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hasPremiumAccess, hasPaidAccess } from "@/components/utils/premiumAccess";
import { hasTrialAccess, isTrialWindow, getTrialDaysRemaining } from "@/components/utils/trialAccess";
import { isIOSCompanion, isCompanionApp } from "@/components/utils/companion";
import { isAppleBuild } from "@/components/utils/appVariant";
import { ensureFreeGrandfatherFlag } from "@/components/utils/freeGrandfathering";

import { useEffect, useState } from "react";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// Detect platform
function detectPlatform() {
  if (isIOSCompanion?.()) return "ios";
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('platform') === 'android') return "android";
    } catch {
      // URL parsing failed, fall through to default
    }
  }
  return "web";
}

export function useCurrentUser() {
  const [ensuredUser, setEnsuredUser] = useState(false);

  // Fetch auth user
  const { data: rawUser, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const authUser = await base44.auth.me();
        const email = normEmail(authUser?.email || "");

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

        // Merge auth + entity - PRESERVE AUTH ID as canonical
        return {
          ...entityUser,
          ...authUser,
          id: authUser.id,
          auth_user_id: authUser.id,
          entity_user_id: entityUser?.id || null,
          email: authUser?.email || entityUser?.email,
        };
      } catch (err) {
        console.error('[useCurrentUser] Critical error:', err);
        throw err;
      }
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const email = normEmail(rawUser?.email || "");
  const userId = rawUser?.auth_user_id || rawUser?.id;

  // Fetch subscriptions by user_id (account-linked) with email fallback
  const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ["subscription", userId, email],
    queryFn: async () => {
      try {
        if (!userId && !email) return null;
        
        let subs = [];
        
        // PRIORITY 1: Query by user_id (account-linked - Apple + modern Stripe)
        if (userId) {
          const byUserId = await base44.entities.Subscription.filter({ user_id: userId });
          subs = byUserId || [];
        }
        
        // PRIORITY 2: Fallback to email for legacy Stripe subscriptions
        if (subs.length === 0 && email) {
          const byEmail = await base44.entities.Subscription.filter({ 
            user_email: email,
            provider: 'stripe'
          });
          subs = byEmail || [];
        }
        
        if (!subs.length) return null;
        
        // Filter out incomplete_expired
        const validSubs = subs.filter(s => {
          const status = (s.status || '').toLowerCase();
          if (status === 'incomplete_expired') return false;
          
          // Allow incomplete if period_end is in future
          if (status === 'incomplete') {
            const periodEnd = s.current_period_end;
            return periodEnd && new Date(periodEnd).getTime() > Date.now();
          }
          
          return true;
        });
        
        if (!validSubs.length) return null;
        
        // Prefer active/trialing/incomplete, then most recent by period_end
        const bestSub = validSubs.find((s) => 
          s.status === "active" || s.status === "trialing" || s.status === "incomplete"
        ) || validSubs[0];
        
        return bestSub;
      } catch (err) {
        console.error('[useCurrentUser] Subscription fetch error:', err);
        return null;
      }
    },
    enabled: !!(userId || email),
    staleTime: 5_000,
    retry: 1,
  });

  // Load UserProfile (authoritative source for provider)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile-provider", userId, email],
    queryFn: async () => {
      try {
        if (!userId && !email) return null;
        let rows = [];
        
        // Prefer user_id lookup
        if (userId) {
          const byUserId = await base44.entities.UserProfile.filter({ user_id: userId });
          if (Array.isArray(byUserId) && byUserId.length) rows = rows.concat(byUserId);
        }
        
        // Fallback to email
        if (email && rows.length === 0) {
          const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
          if (Array.isArray(byEmail) && byEmail.length) rows = rows.concat(byEmail);
        }
        
        return rows?.[0] || null;
      } catch (e) {
        console.warn("[useCurrentUser] Could not load UserProfile for provider:", e);
        return null;
      }
    },
    enabled: !!(userId || email),
    staleTime: 15_000,
    retry: 1,
  });

  // Ensure User entity exists and has platform set
  useEffect(() => {
    if (userLoading || !rawUser?.email || ensuredUser) return;
    
    const needsEnsure = !rawUser?.platform;
    if (!needsEnsure) {
      setEnsuredUser(true);
      return;
    }

    const platform = detectPlatform();
    
    (async () => {
      try {
        await base44.functions.invoke('ensureUserRecord', { platform });
        await refetchUser();
        setEnsuredUser(true);
      } catch (e) {
        console.error('[useCurrentUser] ensureUserRecord failed:', e);
        setEnsuredUser(true);
      }
    })();
  }, [userLoading, rawUser?.email, ensuredUser, refetchUser]);

  // Compute provider from UserProfile (authoritative source)
  const computedProvider = resolveProviderFromProfile(profile);

  // Compute derived flags
  const isLoading = userLoading || subLoading;
  const hasPremium = hasPremiumAccess(rawUser, subscription);
  const hasPaid = hasPaidAccess(rawUser, subscription);

  // Pro check: Must have paid access AND be on pro tier
  const subTier = (subscription?.tier || "").toLowerCase();
  const userTier = (rawUser?.subscription_tier || rawUser?.tier || "").toLowerCase();
  const isPro = hasPaid && (subTier === 'pro' || userTier === 'pro');

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
    if (typeof window !== 'undefined' && import.meta.env.DEV && !isLoading && rawUser?.email) {
      const debugInfo = {
        user_id: userId,
        email: rawUser.email,
        emailNormalized: email,
        tier: subscription?.tier || 'free',
        provider: computedProvider || 'none',
        isOnTrial: isInTrial,
        isLegacyPremium: subscription?.tier === 'premium' && subscription?.subscriptionStartedAt && 
          new Date(subscription.subscriptionStartedAt) < new Date('2026-02-01T00:00:00.000Z'),
        isFoundingMember: rawUser.isFoundingMember === true,
        subscriptionStartedAt: subscription?.subscriptionStartedAt || subscription?.started_at || 'N/A',
        hasPaid,
        hasPremium,
        platform: rawUser.platform || 'unknown',
      };
      console.log('[PipeKeeper Dev] Entitlements:', debugInfo);
    }
  }, [isLoading, rawUser, subscription, isInTrial, hasPaid, hasPremium, email, userId, computedProvider]);

  return {
    user: rawUser,
    subscription,
    subscriptionProvider: computedProvider,
    provider: computedProvider,
    isLoading,
    error: userError,
    hasPremium,
    hasPaid,
    hasPaidAccess: hasPaid,
    isPro,
    hasTrial,
    isInTrial,
    trialDaysRemaining,
    isIOS,
    isCompanion,
    isApple,
    isAdmin,
    refetch: async () => {
      try {
        await refetchUser();
        await refetchSubscription();
      } catch (err) {
        console.error('[useCurrentUser] Refetch failed:', err);
        throw err;
      }
    },
  };
}