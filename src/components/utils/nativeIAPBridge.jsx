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
  // COLLAPSE: Premium → Pro for all new purchases
  const normalizedTier = String(tier || "pro").toLowerCase() === "premium" ? "pro" : (tier || "pro");
  return safePost({ action: "showPaywall", tier: normalizedTier });
};

export const nativeDebugPing = (label = "ping") => {
  return safePost({ action: "debugToast", label });
};

/**
 * Register listener for Apple subscription status updates.
 * iOS wrapper should dispatch full payload:
 * {
 *   active: boolean,
 *   tier?: "pro" (legacy "premium" normalizes to "pro"),
 *   expiresAt?: ISO date string,
 *   productId?: string,                          // CURRENT active product ID
 *   originalTransactionId?: string,              // REQUIRED for proper account linking
 *   pendingProductId?: string,                   // Apple autoRenewalPreference — the product the sub will renew into
 *   pendingUpgradeEffectiveDate?: ISO date string // Apple renewal date — when the pending product takes effect
 * }
 *
 * Deferred upgrade handling:
 *   When a user schedules an upgrade (e.g. 3 Modules → All Modules effective Aug 16),
 *   Apple's StoreKit 2 exposes autoRenewalPreference (pendingProductId) and the
 *   renewal date (pendingUpgradeEffectiveDate). The backend grants the CURRENT
 *   product's modules until the effective date, then switches automatically.
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