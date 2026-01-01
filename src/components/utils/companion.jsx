// Detect the iOS companion wrapper (UA flag and/or ?platform=ios)
// and provide helpers to hide purchase flows in-app.

export function isIOSCompanionApp() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    const hasUAFlag = ua.includes("pipekeeperios"); // set by iOS wrapper user agent suffix
    const url = new URL(window.location.href);
    const platformFlag = (url.searchParams.get("platform") || "").toLowerCase() === "ios";
    return hasUAFlag || platformFlag;
  } catch {
    return false;
  }
}

export function shouldShowPurchaseUI() {
  // Worldwide companion mode: no purchase/upgrade/manage subscription CTAs in iOS wrapper
  return !isIOSCompanionApp();
}

export function premiumGateMessage() {
  // Keep this neutral (avoid "go to website to buy" inside iOS)
  return isIOSCompanionApp()
    ? "Premium feature. Available for Premium accounts."
    : "Premium feature. Upgrade to PipeKeeper Premium to unlock this feature.";
}

export function subscriptionManagementMessage() {
  return "Subscription management isn't available in the iOS companion app.";
}