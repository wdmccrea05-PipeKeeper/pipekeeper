import { isIOSWebView, openAppleSubscriptions } from "@/components/utils/nativeIAPBridge";
import { resolveProviderFromUser, resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";

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

  const provider = resolveSubscriptionProvider(subscription) || resolveProviderFromUser(user);

  if (provider === "stripe") {
    return openUrlSafely(STRIPE_PORTAL_URL);
  }

  if (provider === "apple") {
    return openUrlSafely(APPLE_SUBSCRIPTIONS_URL);
  }

  navigate(createPageUrl("Subscription"));
  return { ok: false, reason: "no_provider", redirectedToSubscription: true };
}
