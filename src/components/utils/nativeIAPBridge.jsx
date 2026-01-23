// src/components/utils/nativeIAPBridge.jsx

export const isIOSWebView = () => {
  return !!window?.webkit?.messageHandlers?.pipekeeper;
};

export const openNativePaywall = () => {
  if (!isIOSWebView()) return false;
  window.webkit.messageHandlers.pipekeeper.postMessage({ action: "showPaywall" });
  return true;
};

export const requestNativeSubscriptionStatus = () => {
  if (!isIOSWebView()) return false;
  window.webkit.messageHandlers.pipekeeper.postMessage({ action: "getSubscriptionStatus" });
  return true;
};

export const openAppleSubscriptions = () => {
  if (!isIOSWebView()) return false;
  window.webkit.messageHandlers.pipekeeper.postMessage({ action: "openAppleSubscriptions" });
  return true;
};

export const registerNativeSubscriptionListener = (onStatus) => {
  if (typeof onStatus !== "function") return () => {};

  const handler = (e) => {
    const active = !!e?.detail?.active;
    onStatus(active);
  };

  window.addEventListener("pipekeeper_subscription_status", handler);
  return () => window.removeEventListener("pipekeeper_subscription_status", handler);
};

// Extra safety helper: detect Stripe portal URLs
export const isStripePortalUrl = (url) => {
  try {
    const u = new URL(url);
    const host = (u.host || "").toLowerCase();
    return host.includes("stripe.com") || host.includes("billing.stripe.com");
  } catch {
    return false;
  }
};