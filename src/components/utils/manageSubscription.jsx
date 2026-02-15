/**
 * Canonical Manage Subscription handler
 * Routes based on subscription provider (Stripe vs Apple)
 */

import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";
import { resolveProviderFromUser, resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const STRIPE_PORTAL_FALLBACK = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  const provider = resolveProviderFromUser(user) || resolveSubscriptionProvider(subscription);

  // Stripe subscription: create portal session
  if (provider === "stripe") {
    let portalUrl = null;

    try {
      const result = await base44.functions.invoke('createCustomerPortalSessionForMe', {});
      if (result?.data?.url) {
        portalUrl = result.data.url;
      }
    } catch (e) {
      if (import.meta?.env?.DEV) {
        console.warn("[manageSubscription] Failed to create portal session:", e);
      }
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
      if (import.meta?.env?.DEV) {
        console.warn("[manageSubscription] Popup blocked, using redirect:", e);
      }
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
