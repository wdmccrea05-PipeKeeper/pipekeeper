// Detect whether we are running inside the iOS/Android native wrapper (WebView)
// so we can enforce App Store / Play Store compliance (no external checkout UI).

export function isIOSCompanionApp() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    // common patterns used by wrappers:
    // - a custom UA token (recommended)
    // - iOS WebView markers
    const hasCustomToken = ua.includes("pipekeeper") && (ua.includes("ios") || ua.includes("companion"));
    const isIOSWebView = /iphone|ipad|ipod/.test(ua) && (ua.includes("wv") || ua.includes("webkit"));
    const url = new URL(window.location.href);
    const platformParam = (url.searchParams.get("platform") || "").toLowerCase();
    return hasCustomToken || isIOSWebView || platformParam === "ios";
  } catch {
    return false;
  }
}

export function isAndroidCompanionApp() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    // Android WebView commonly includes "; wv" in UA and "version/x.x"
    const isAndroid = ua.includes("android");
    const isWebView = ua.includes(" wv") || ua.includes("; wv") || ua.includes("version/");
    const hasCustomToken = ua.includes("pipekeeper") && (ua.includes("android") || ua.includes("companion"));

    const url = new URL(window.location.href);
    const platformParam = (url.searchParams.get("platform") || "").toLowerCase();

    return (isAndroid && isWebView) || hasCustomToken || platformParam === "android";
  } catch {
    return false;
  }
}

export function isCompanionApp() {
  return isIOSCompanionApp() || isAndroidCompanionApp();
}

/**
 * Controls whether we show ANY external purchase UI (Stripe checkout, web purchase links, etc.).
 * - Web browser: true
 * - iOS companion: false (must use IAP; we are a companion wrapper)
 * - Android companion: false (Play Billing required; we are a companion wrapper)
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