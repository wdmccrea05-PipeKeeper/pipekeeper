/**
 * Canonical Manage Subscription handler
 * Routes based on subscription provider (Stripe vs Apple)
 * Uses new-tab first to avoid app-shell white-screen behavior.
 */

import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";
import { resolveProviderFromUser, resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const STRIPE_PORTAL_FALLBACK = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabm00";
const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

function openUrlSafely(url) {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup && !popup.closed) {
    return { openedInNewTab: true, redirectedInPlace: false };
  }
  return null;
}

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  const provider = resolveSubscriptionProvider(subscription) || resolveProviderFromUser(user);

  if (provider === "stripe") {
    let portalUrl = null;
    let portalError = null;

    try {
      const result = await base44.functions.invoke("createCustomerPortalSessionForMe", {});
      portalUrl = result?.data?.url || null;
      portalError = result?.data?.error || null;
    } catch (e) {
      portalError = e?.message || "Failed to create portal session";
      if (import.meta?.env?.DEV) {
        console.warn("[manageSubscription] Failed to create portal session:", e);
      }
    }

    if (!portalUrl && portalError) {
      const normalized = String(portalError).toLowerCase();
      if (
        normalized.includes("no stripe customer") ||
        normalized.includes("customer") ||
        normalized.includes("subscription") ||
        normalized.includes("portal")
      ) {
        navigate(createPageUrl("Subscription"));
        return { ok: false, reason: "no_customer", redirectedToSubscription: true };
      }
    }

    portalUrl = portalUrl || STRIPE_PORTAL_FALLBACK;

    const opened = openUrlSafely(portalUrl);
    if (opened) {
      return { ok: true, provider: "stripe", ...opened, url: portalUrl };
    }

    return {
      ok: false,
      reason: "popup_blocked_or_redirect_disallowed",
      provider: "stripe",
      url: portalUrl,
    };
  }

  if (provider === "apple") {
    if (isIOSWebView?.()) {
      openAppleSubscriptions();
      return { ok: true, provider: "apple", native: true };
    }

    const opened = openUrlSafely(APPLE_SUBSCRIPTIONS_URL);
    if (opened) {
      return { ok: true, provider: "apple", ...opened, url: APPLE_SUBSCRIPTIONS_URL };
    }

    return {
      ok: false,
      reason: "popup_blocked_or_redirect_disallowed",
      provider: "apple",
      url: APPLE_SUBSCRIPTIONS_URL,
    };
  }

  navigate(createPageUrl("Subscription"));
  return { ok: false, reason: "no_provider", redirectedToSubscription: true };
}
