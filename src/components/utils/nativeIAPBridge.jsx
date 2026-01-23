/**
 * Native iOS In-App Purchase Bridge
 * Communicates with WKWebView message handler "pipekeeper" for StoreKit integration
 */

const HANDLER_NAME = "pipekeeper";
const STATUS_EVENT = "pipekeeper_subscription_status";

/**
 * Check if running in iOS WKWebView with pipekeeper handler
 */
export function isIOSWebView() {
  try {
    return !!(
      window.webkit?.messageHandlers?.[HANDLER_NAME]?.postMessage
    );
  } catch (e) {
    return false;
  }
}

/**
 * Open native StoreKit paywall
 */
export function openNativePaywall() {
  if (!isIOSWebView()) {
    console.warn("openNativePaywall called but not in iOS WebView");
    return false;
  }

  try {
    window.webkit.messageHandlers[HANDLER_NAME].postMessage({
      action: "showPaywall"
    });
    return true;
  } catch (e) {
    console.error("Failed to open native paywall:", e);
    return false;
  }
}

/**
 * Request current subscription status from native
 */
export function requestNativeSubscriptionStatus() {
  if (!isIOSWebView()) {
    return false;
  }

  try {
    window.webkit.messageHandlers[HANDLER_NAME].postMessage({
      action: "getSubscriptionStatus"
    });
    return true;
  } catch (e) {
    console.error("Failed to request subscription status:", e);
    return false;
  }
}

/**
 * Register listener for native subscription status updates
 * @param {Function} onStatus - Callback receiving { active: boolean }
 * @returns {Function} Cleanup function to remove listener
 */
export function registerNativeSubscriptionListener(onStatus) {
  const handler = (event) => {
    if (event.detail) {
      onStatus(event.detail);
    }
  };

  window.addEventListener(STATUS_EVENT, handler);

  // Return cleanup function
  return () => {
    window.removeEventListener(STATUS_EVENT, handler);
  };
}

/**
 * Dispatch subscription status event (called by native bridge)
 * This is exposed globally for native code to call
 */
export function dispatchSubscriptionStatus(active) {
  const event = new CustomEvent(STATUS_EVENT, {
    detail: { active: !!active }
  });
  window.dispatchEvent(event);
}

// Expose dispatchSubscriptionStatus globally for native bridge
if (typeof window !== "undefined") {
  window.pipekeeper_dispatchSubscriptionStatus = dispatchSubscriptionStatus;
}