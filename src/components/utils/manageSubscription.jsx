/**
 * Canonical Manage Subscription handler
 * Routes based on subscription provider (Stripe vs Apple)
 */

import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  const provider = subscription?.provider ? (subscription.provider).toLowerCase() : null;

  // Stripe subscription: open customer portal
  if (provider === "stripe") {
    try {
      const res = await base44.functions.invoke("createCustomerPortalSession", {
        return_url: window.location.origin + createPageUrl("Profile"),
      });

      if (res?.data?.url) {
        window.location.href = res.data.url;
        return;
      }

      // Fallback to Stripe billing login (explicitly allowed)
      window.location.href = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";
      return;
    } catch (err) {
      console.error("[manageSubscription] Stripe portal error:", err);
      // Fallback
      window.location.href = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";
    }
    return;
  }

  // Apple subscription: open Apple settings
  if (provider === "apple") {
    if (isIOSWebView?.()) {
      openAppleSubscriptions();
      return;
    }
    // Web: navigate to App Store (user must manage on device)
    return;
  }

  // No active subscription: navigate to Subscribe
  navigate(createPageUrl("Subscription"));
}