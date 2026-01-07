// Companion detection: rely ONLY on explicit UA flags set by the native wrappers.
// Do NOT use URL query params (like ?platform=ios) because that breaks the web UI.

export function isCompanionApp() {
  if (typeof window === "undefined") return false;

  const ua = (navigator.userAgent || "").toLowerCase();
  return ua.includes("pipekeeperios") || ua.includes("pipekeeperandroid");
}

export function shouldShowPurchaseUI() {
  // Hide any purchase/upgrade/billing portal UI in iOS + Android companion wrappers
  return !isCompanionApp();
}

export function getPremiumGateMessage() {
  return isCompanionApp()
    ? "Premium feature. Available for Premium accounts."
    : "Premium feature. Upgrade to unlock this feature.";
}

export function getSubscriptionManagementMessage() {
  return isCompanionApp()
    ? "Subscription management isn't available in the companion app."
    : "Manage your subscription from your Profile page.";
}