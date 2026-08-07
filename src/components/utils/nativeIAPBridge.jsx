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
 * iOS wrapper should dispatch full payload via a CustomEvent named
 * "pipekeeper_subscription_status" on window, with the payload in e.detail:
 * {
 *   active: boolean,
 *   tier?: "pro" (legacy "premium" normalizes to "pro"),
 *   expiresAt?: ISO date string,
 *   productId?: string,                          // CURRENT active product ID (Transaction.productID)
 *   originalTransactionId?: string,              // REQUIRED for verified sync — see StoreKit 2 mapping below
 *   pendingProductId?: string,                   // Apple autoRenewalPreference — the product the sub will renew into
 *   pendingUpgradeEffectiveDate?: ISO date string // Apple renewal date — when the pending product takes effect
 * }
 *
 * ── StoreKit 2 field mapping (NATIVE iOS TEAM — READ THIS) ──
 * The native iOS code must read these StoreKit 2 (Swift) Transaction properties
 * and serialize them into the payload using the key names shown:
 *
 *   StoreKit 2 (Swift)              →  Payload key
 *   ────────────────────────────────┼──────────────────────────────
 *   Transaction.originalID          →  originalTransactionId       ← CRITICAL: use originalID, NOT id
 *   Transaction.productID           →  productId
 *   Transaction.expirationDate      →  expiresAt (ISO 8601 string)
 *   Transaction.jsonRepresentation  →  verificationProof (JWS token for server-side verification)
 *
 * COMMON NATIVE BUG: Reading Transaction.id instead of Transaction.originalID.
 *   - Transaction.id changes on every renewal (current transaction's ID)
 *   - Transaction.originalID is stable across the entire subscription lifecycle
 *   - For the FIRST purchase, originalID == id, so the bug is invisible initially
 *   - For renewals, using id breaks subscription lifecycle tracking and account linking
 *
 * If the native wrapper cannot read originalID (e.g. StoreKit 1 fallback), it
 * should send whatever transaction identifier is available as "transactionId".
 * The sync layer will use it as a last-resort fallback (marked unverified).
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