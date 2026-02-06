/**
 * Canonical Manage Subscription handler
 * Routes based on subscription provider (Stripe vs Apple)
 */

import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";

const STRIPE_PORTAL_FALLBACK = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";

/**
 * Infer subscription provider from evidence
 * Same logic as useCurrentUser for consistency
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

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  // Infer provider from evidence (not just user.subscription_provider)
  const provider = inferProvider(user, subscription);

  // Stripe subscription: create portal session
  if (provider === "stripe") {
    let portalUrl = null;

    try {
      const result = await base44.functions.invoke('createCustomerPortalSessionForMe', {});
      if (result?.data?.url) {
        portalUrl = result.data.url;
      }
    } catch (e) {
      console.error("[manageSubscription] Failed to create portal session:", e);
    }

    // Use fallback if portal session failed
    if (!portalUrl) {
      portalUrl = STRIPE_PORTAL_FALLBACK;
    }

    // Open portal - try popup, fallback to redirect if blocked
    try {
      const popup = window.open(portalUrl, "_blank");
      if (!popup || popup.closed) {
        throw new Error("Popup blocked");
      }
    } catch (e) {
      console.warn("[manageSubscription] Popup blocked, using redirect:", e);
      window.location.href = portalUrl;
    }
    return;
  }

  // Apple subscription: open Apple settings
  if (provider === "apple") {
    if (isIOSWebView?.()) {
      openAppleSubscriptions();
      return;
    }
    // On web, direct to Apple subscription management (NOT review link)
    window.open("https://apps.apple.com/account/subscriptions", "_blank");
    return;
  }

  // No provider detected: navigate to Subscribe page
  navigate(createPageUrl("Subscription"));
}