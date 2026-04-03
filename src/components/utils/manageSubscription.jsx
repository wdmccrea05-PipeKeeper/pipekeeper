import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";
import { resolveProviderFromUser, resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

function openUrlSafely(url) {
  try {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup && !popup.closed) {
      return { ok: true, openedInNewTab: true, url };
    }
    return { ok: false, reason: "popup_blocked_or_redirect_disallowed", url };
  } catch (e) {
    console.error("[manageSubscription] openUrlSafely failed:", e);
    return { ok: false, reason: "popup_blocked_or_redirect_disallowed", url };
  }
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

    if (!portalUrl) {
      navigate(createPageUrl("Subscription"));
      return { ok: false, reason: "missing_portal_url", redirectedToSubscription: true };
    }

    return openUrlSafely(portalUrl);
  }

  if (provider === "apple") {
    if (isIOSWebView?.()) {
      openAppleSubscriptions();
      return { ok: true, provider: "apple", native: true };
    }

    return openUrlSafely(APPLE_SUBSCRIPTIONS_URL);
  }

  navigate(createPageUrl("Subscription"));
  return { ok: false, reason: "no_provider", redirectedToSubscription: true };
}
