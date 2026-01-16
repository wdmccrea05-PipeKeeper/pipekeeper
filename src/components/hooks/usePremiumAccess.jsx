import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Premium rules:
 * - If user has an active/trialing Stripe subscription row -> premium
 * - Else if account is < 7 days old -> premium (free trial for new accounts)
 * - Else -> free
 *
 * NOTE: We intentionally use the Subscription entity as source-of-truth
 * because Stripe can be active even if auth user fields didn't update.
 */
const TRIAL_DAYS = 7;

function isWithinNewUserTrial(user) {
  const created =
    user?.created_at ||
    user?.createdAt ||
    user?.created_date ||
    user?.createdDate ||
    null;

  if (!created) return false;

  const createdMs = Date.parse(created);
  if (!Number.isFinite(createdMs)) return false;

  const now = Date.now();
  const trialMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return now - createdMs < trialMs;
}

function subscriptionGrantsPremium(sub) {
  if (!sub) return false;

  const status = (sub.status || "").toLowerCase();
  const premiumStatuses = new Set(["active", "trialing"]);

  if (!premiumStatuses.has(status)) return false;

  // If we have an end date, enforce it (handles edge cases / stale rows)
  if (sub.current_period_end) {
    const endMs = Date.parse(sub.current_period_end);
    if (Number.isFinite(endMs) && endMs < Date.now()) return false;
  }

  return true;
}

export function usePremiumAccess(user) {
  const email = user?.email || null;

  const { data: subs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["subscription-status", email],
    enabled: !!email,
    queryFn: async () => {
      const rows = await base44.entities.Subscription.filter({ user_email: email });
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const hasSubscriptionPremium = React.useMemo(() => {
    return subs.some(subscriptionGrantsPremium);
  }, [subs]);

  const hasTrialPremium = React.useMemo(() => {
    return !hasSubscriptionPremium && isWithinNewUserTrial(user);
  }, [hasSubscriptionPremium, user]);

  return {
    hasPremium: hasSubscriptionPremium || hasTrialPremium,
    source: hasSubscriptionPremium ? "subscription" : hasTrialPremium ? "trial" : "free",
    isLoading,
    error,
    refetch,
    subscriptions: subs,
  };
}