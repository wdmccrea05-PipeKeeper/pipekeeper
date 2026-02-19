// src/components/utils/nativeIAPBridge.jsx

export const isIOSWebView = () => {
  const handlers = window?.webkit?.messageHandlers;
  if (!handlers) return false;
  return !!(
    handlers.pipekeeper ||
    handlers.pipeKeeper ||
    handlers.PipeKeeper ||
    handlers.ios ||
    handlers.nativeApp
  );
};

export const isIOSCompanion = () => {
  return isIOSWebView();
};

const safePost = (payload) => {
  try {
    const handlers = window?.webkit?.messageHandlers;
    if (!handlers) return false;

    const candidates = [
      handlers.pipekeeper,
      handlers.pipeKeeper,
      handlers.PipeKeeper,
      handlers.ios,
      handlers.nativeApp,
    ];

    for (const handler of candidates) {
      if (handler && typeof handler.postMessage === "function") {
        handler.postMessage(payload);
        return true;
      }
    }
    return false;
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

export const openAppleManageSubscriptions = () => {
  return safePost({ action: "openAppleSubscriptions" });
};

export const startApplePurchaseFlow = (tier) => {
  return safePost({ action: "showPaywall", tier: tier || "premium" });
};

export const nativeDebugPing = (label = "ping") => {
  return safePost({ action: "debugToast", label });
};

/**
 * Register listener for Apple subscription status updates.
 * iOS wrapper should dispatch full payload:
 * {
 *   active: boolean,
 *   tier?: "premium" | "pro",
 *   expiresAt?: ISO date string,
 *   productId?: string,
 *   originalTransactionId?: string (REQUIRED for proper account linking)
 * }
 */
export const registerNativeSubscriptionListener = (onStatus) => {
  if (typeof onStatus !== "function") return () => {};

  const handler = (e) => {
    // Pass full payload detail object
    const payload = e?.detail || {};
    onStatus(payload);
  };

  window.addEventListener("pipekeeper_subscription_status", handler);
  return () => window.removeEventListener("pipekeeper_subscription_status", handler);
};
