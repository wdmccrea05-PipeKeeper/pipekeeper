// Companion detection: rely on explicit UA flags set by the native wrapper.
// This prevents accidental gating on the normal web app.

export function isCompanionApp() {
  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    return ua.includes("pipekeeperios") || ua.includes("pipekeeperandroid");
  } catch {
    return false;
  }
}

export function shouldShowPurchaseUI() {
  // Hide any purchase/upgrade/billing portal CTAs in native companion wrappers
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