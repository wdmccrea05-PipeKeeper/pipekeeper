/**
 * Canonical Manage Subscription handler
 * Routes based on subscription provider (Stripe vs Apple)
 */

import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";

const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  // Provider is AUTHORITATIVE from user.subscription_provider
  const provider = user?.subscription_provider;

  // Stripe subscription: open customer portal using stored customer ID
  if (provider === "stripe") {
    if (user?.stripe_customer_id) {
      // Use stored customer ID for customer portal
      try {
        const result = await base44.functions.invoke('createCustomerPortalSessionForMe', {});
        if (result?.data?.url) {
          window.open(result.data.url, "_blank");
          return;
        }
      } catch (e) {
        console.error("Failed to create customer portal session:", e);
      }
    }
    // Fallback to direct Stripe portal
    window.open(STRIPE_PORTAL_URL, "_blank");
    return;
  }

  // Apple subscription: open Apple settings
  if (provider === "apple") {
    if (isIOSWebView?.()) {
      openAppleSubscriptions();
      return;
    }
    // On web, direct user to App Store (must manage on device)
    window.open("https://apps.apple.com/app/pipekeeper/id1234567890?action=write-review", "_blank");
    return;
  }

  // No provider set: navigate to Subscribe
  navigate(createPageUrl("Subscription"));
}