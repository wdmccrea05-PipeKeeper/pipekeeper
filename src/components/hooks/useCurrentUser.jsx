import { useQuery } from "@tanstack/react-query";
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
import { resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";
import { useEffect, useRef } from "react";

const normEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Infer subscription provider from evidence
 * Priority: Stripe evidence > iOS/Apple evidence
 */
function inferProvider(user, subscription) {
  // Check for Stripe evidence first
  const hasStripeCustomer = !!(user?.stripe_customer_id || user?.stripeCustomerId);
  const hasStripeSubscription = subscription?.provider === "stripe" || subscription?.stripe_subscription_id;
  const isWebPlatform = user?.platform === "web";
  const hasActiveStatus = ["active", "trialing"].includes(user?.subscription_status || subscription?.status);

  // Strong Stripe evidence
  if (hasStripeCustomer || hasStripeSubscription || (isWebPlatform && hasActiveStatus)) {
    return "stripe";
  }

  // Check for Apple evidence
  const hasAppleTransaction = !!(user?.apple_original_transaction_id || user?.appleOriginalTransactionId);
  const hasAppleSubscription = subscription?.provider === "apple";
  const isIOSPlatform = user?.platform === "ios";

  // Apple evidence (only if no Stripe evidence)
  if (hasAppleTransaction || hasAppleSubscription || isIOSPlatform) {
    return "apple";
  }

  // Fallback to stored provider if it exists
  if (user?.subscription_provider === "stripe" || user?.subscription_provider === "apple") {
    return user.subscription_provider;
  }

  return null;
}

export function useCurrentUser() {
  const backfillAttempted = useRef(false);

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        const authUser = await base44.auth.me();
        if (!authUser?.email) return null;

        const email = normEmail(authUser.email);
        const userId = authUser.id || authUser.auth_user_id;

        // Use auth user directly - all relevant fields are already included
        // (Base44's auth.me() includes all user entity fields)
        return {
          ...authUser,
          id: userId,
          email,
        };
      } catch (error) {
        console.error("[useCurrentUser] Error:", error);
        throw error;
      }
    },
    staleTime: 5000,
    retry: 2,
  });

  const userId = user?.id || user?.auth_user_id;
  const email = user?.email ? normEmail(user.email) : null;

  const {
    data: subscription,
    isLoading: subLoading,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: ["subscription", userId, email],
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

        // Filter to valid active or in-progress plans
        const valid = subs.filter((s) => {
          const status = s.status || "";
          return ["active", "trialing", "trial", "past_due", "incomplete"].includes(status);
        });

        if (valid.length === 0) return null;

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
        console.error("[useCurrentUser] Subscription query error:", error);
        return null;
      }
    },
    enabled: !!(userId || email),
    staleTime: 30_000,
  });

  // Ensure user record exists with platform info
  useEffect(() => {
    if (userLoading || !user?.email) return;
    if (user?.platform) return; // Already has platform

    let cancelled = false;

    (async () => {
      try {
        await base44.functions.invoke("ensureUserRecord", {});
        if (!cancelled) {
          await refetchUser();
        }
      } catch (err) {
        console.warn("[useCurrentUser] ensureUserRecord failed (non-fatal):", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLoading, user?.email, user?.platform, refetchUser]);

  // Infer provider from evidence
  const provider = inferProvider(user, subscription);

  // Backfill user.subscription_provider if it's wrong or missing
  useEffect(() => {
    if (userLoading || !user?.email || !provider) return;
    if (backfillAttempted.current) return;
    if (user?.subscription_provider === provider) return;

    backfillAttempted.current = true;

    (async () => {
      try {
        console.log(`[useCurrentUser] Backfilling subscription_provider: ${provider}`);
        await base44.auth.updateMe({ subscription_provider: provider });
        await refetchUser();
      } catch (err) {
        console.warn("[useCurrentUser] Failed to backfill subscription_provider:", err);
      }
    })();
  }, [userLoading, user?.email, user?.subscription_provider, provider, refetchUser]);

  // Use CANONICAL resolver functions (single source of truth)
  const tier = getEntitlementTier(user, subscription);
  const hasPaid = hasPaidAccess(user, subscription);
  const hasPremium = hasPremiumAccess(user, subscription);
  const hasPro = hasProAccess(user, subscription);
  const isTrial = isTrialingAccess(user, subscription);
  const planLabel = getPlanLabel(user, subscription);
  const isAdmin = user?.role === "admin";
  const isFounding = isFoundingMember(user);

  // Dev mode: Log canonical entitlements for debugging
  useEffect(() => {
    if (import.meta?.env?.DEV && user?.email) {
      console.log('[useCurrentUser] Canonical Entitlements:', {
        email: user.email,
        tier,
        hasPaid,
        hasPremium,
        hasPro,
        isTrial,
        planLabel,
        provider,
        subscriptionStatus: subscription?.status,
        subscriptionTier: subscription?.tier,
      });
    }
  }, [user?.email, tier, hasPaid, hasPremium, hasPro, isTrial, planLabel, provider, subscription?.status, subscription?.tier]);

  const isLoading = userLoading || subLoading;

  const refetch = async () => {
    await Promise.all([refetchUser(), refetchSubscription()]);
  };

  return {
    user,
    subscription,
    provider, // Inferred provider (stripe, apple, or null)
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