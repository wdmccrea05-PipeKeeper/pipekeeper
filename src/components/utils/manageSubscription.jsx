/**
 * Canonical Manage Subscription handler
 * Routes based on subscription provider (Stripe vs Apple)
 */

import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  const provider = resolveSubscriptionProvider(subscription);

  // Stripe subscription: open customer portal
  if (provider === "stripe") {
    // Open Stripe portal in new tab (no proxy, no iframe)
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

  // No active subscription: navigate to Subscribe
  navigate(createPageUrl("Subscription"));
}