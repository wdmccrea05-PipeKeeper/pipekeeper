// src/components/utils/nativeIAPBridge.jsx

export const isIOSWebView = () => {
  return !!window?.webkit?.messageHandlers?.pipekeeper;
};

const safePost = (payload) => {
  try {
    const handler = window?.webkit?.messageHandlers?.pipekeeper;
    if (!handler || typeof handler.postMessage !== "function") return false;
    handler.postMessage(payload);
    return true;
  } catch {
    return false;
  }
};

export const openNativePaywall = () => {
  return safePost({ action: "showPaywall" });
};

export const requestNativeSubscriptionStatus = () => {
  return safePost({ action: "getSubscriptionStatus" });
};

export const openAppleSubscriptions = () => {
  return safePost({ action: "openAppleSubscriptions" });
};

// ✅ REQUIRED by Layout.jsx (was missing in your build)
export const nativeDebugPing = (label = "ping") => {
  // Also useful for native-side confirmation/logging
  return safePost({ action: "debugToast", label });
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

// Optional helper (kept)
export const isStripePortalUrl = (url) => {
  try {
    const u = new URL(url);
    const host = (u.host || "").toLowerCase();
    return host.includes("stripe.com") || host.includes("billing.stripe.com");
  } catch {
    return false;
  }
};