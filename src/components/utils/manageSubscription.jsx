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
    let portalUrl = null;

    if (user?.stripe_customer_id) {
      // Try to create portal session with customer ID
      try {
        const result = await base44.functions.invoke('createCustomerPortalSessionForMe', {});
        if (result?.data?.url) {
          portalUrl = result.data.url;
        }
      } catch (e) {
        console.error("Failed to create customer portal session, using fallback:", e);
      }
    }

    // Use fallback portal URL if no session URL available
    if (!portalUrl) {
      portalUrl = STRIPE_PORTAL_URL;
    }

    // Open portal (use location.href if window.open is blocked)
    try {
      window.open(portalUrl, "_blank");
    } catch (e) {
      console.warn("window.open blocked, redirecting:", e);
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
    // On web, direct user to App Store (must manage on device)
    window.open("https://apps.apple.com/app/pipekeeper/id1234567890?action=write-review", "_blank");
    return;
  }

  // No provider set: navigate to Subscribe
  navigate(createPageUrl("Subscription"));
}