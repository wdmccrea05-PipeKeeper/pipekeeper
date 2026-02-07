import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hasProAccess as canonicalHasProAccess, hasPremiumAccess as canonicalHasPremiumAccess } from "@/components/utils/entitlementCanonical";
import { isFoundingMember } from "@/components/utils/premiumAccess";
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
    data: response,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        // Call backend function to get user + subscription in one go
        const res = await base44.functions.invoke("getCurrentUserWithSubscription", {});
        return res.data || { user: null, subscription: null };
      } catch (error) {
        console.error("[useCurrentUser] Error:", error);
        throw error;
      }
    },
    staleTime: 0,
    retry: 2,
  });

  const user = response?.user || null;
  const subscription = response?.subscription || null;
  const subLoading = userLoading;

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

  // Derived access flags (CANONICAL: read from entitlement_tier only)
  const hasPro = canonicalHasProAccess(user);
  const hasPremium = canonicalHasPremiumAccess(user);
  const isAdmin = user?.role === "admin";
  const isFounding = isFoundingMember(user);

  // Logging for verification (Part H)
  if (user) {
    console.log("[ENTITLEMENT_CHECK]", {
      entitlement_tier: user?.entitlement_tier,
      effective: canonicalHasProAccess(user) ? "pro" : "free",
      hasPro,
    });
  }

  const isLoading = userLoading || subLoading;

  const refetch = async () => {
    await refetchUser();
  };

  return {
    user,
    subscription,
    provider, // Inferred provider (stripe, apple, or null)
    isLoading,
    error: userError,
    hasPremium,
    hasPaidAccess: hasPremium, // Kept for compatibility
    hasPro,
    isTrial: false, // Deprecated: trial logic removed
    isAdmin,
    isFoundingMember: isFounding,
    refetch,
  };
}