import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { base44 } from "@/api/base44Client";
import { resolveProviderFromUser, resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";
import { hasPaidAccess } from "@/components/utils/premiumAccess";

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

function openUrlSafely(url) {
  try {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup && !popup.closed) {
      return { ok: true, openedInNewTab: true, url };
    }
  } catch (e) {
    console.error("[manageSubscription] openUrlSafely failed:", e);
  }

  // Fallback for popup blockers and Android webviews
  window.location.assign(url);
  return { ok: true, openedInCurrentTab: true, url };
}

export async function handleManageSubscription(user, subscription, navigate, createPageUrl) {
  // iOS WebView always uses native Apple flow regardless of provider
  if (isIOSWebView?.()) {
    openAppleSubscriptions();
    return { ok: true, provider: "apple", native: true };
  }

  const paid = hasPaidAccess(user, subscription);
  if (!paid) {
    navigate(createPageUrl("Subscription"));
    return { ok: true, redirectedToSubscription: true, freeUser: true };
  }

  const provider = resolveSubscriptionProvider(subscription) || resolveProviderFromUser(user);

  if (provider === "stripe") {
    try {
      const response = await base44.functions.invoke("createCustomerPortalSessionForMe", {});
      const url = response?.data?.url || response?.url;
      if (!url) {
        throw new Error("No customer portal URL returned");
      }
      return openUrlSafely(url);
    } catch (e) {
      console.error("[manageSubscription] Stripe portal error:", e);
      navigate(createPageUrl("Subscription"));
      return { ok: false, provider: "stripe", reason: "portal_failed" };
    }
  }

  if (provider === "apple") {
    return openUrlSafely(APPLE_SUBSCRIPTIONS_URL);
  }

  navigate(createPageUrl("Subscription"));
  return { ok: false, reason: "no_provider", redirectedToSubscription: true };
}
