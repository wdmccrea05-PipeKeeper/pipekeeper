// Detect whether we are running inside the iOS/Android native wrapper (WebView)
// so we can enforce App Store / Play Store compliance (no external checkout UI).

const isBrowser = typeof window !== "undefined";

function getPlatformParam() {
  if (!isBrowser) return null;
  try {
    return new URLSearchParams(window.location.search).get("platform");
  } catch {
    return null;
  }
}

function isAndroidWebView() {
  if (!isBrowser) return false;
  const ua = navigator.userAgent || "";
  // Common Android WebView markers: "; wv" or " wv)" and not Chrome Custom Tab
  return ua.includes("; wv") || ua.includes(" wv)");
}

function isIOSWebView() {
  if (!isBrowser) return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua);
  const isWebKit = /AppleWebKit/i.test(ua);
  // iOS WKWebView typically: iOS + WebKit + NOT Safari
  return isIOS && isWebKit && !isSafari;
}

// Only treat platform param as "companion" if you're actually in a WebView.
export function isAndroidCompanionApp() {
  const platform = getPlatformParam();
  return platform === "android" && isAndroidWebView();
}

export function isIOSCompanionApp() {
  if (!isBrowser) return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  // Only treat as iOS companion if the embedded app sets a custom UA flag
  // This prevents accidentally hiding subscription UI on the normal web app.
  return ua.includes('pipekeeperios');
}

export function isCompanionApp() {
  return isIOSCompanionApp() || isAndroidCompanionApp();
}

/**
 * Controls whether we show ANY external purchase UI (Stripe checkout, web purchase links, etc.).
 * - Web browser: true
 * - Companion builds: do not show external purchase UI inside the wrapper.
 */
export function shouldShowPurchaseUI() {
  return !isCompanionApp();
}

/**
 * A neutral message for store reviewers: no mention of web checkout, no links out.
 */
export function getPurchaseBlockedMessage() {
  return "Purchases are not available in this companion app. If you already have a subscription, sign in to access premium features.";
}

/**
 * Premium gate messaging for users inside/outside companion apps
 * IMPORTANT: In iOS/Android companion builds, keep this neutral:
 * - Do NOT mention Stripe
 * - Do NOT link out or instruct users to buy on the web
 */
export function getPremiumGateMessage() {
  if (isCompanionApp()) {
    return "This feature requires Premium. If you already have Premium, sign in with the same account to access it.";
  }
  return "This feature requires Premium.";
}

/**
 * Subscription management messaging
 * IMPORTANT: No purchase/management flows inside companion builds.
 */
export function getSubscriptionManagementMessage() {
  if (isCompanionApp()) {
    return "Subscription purchases and management are not available in this companion app.";
  }
  return null;
}