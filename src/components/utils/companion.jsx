// Companion detection: rely ONLY on explicit UA flags set by the native wrappers.
// Do NOT use URL query params (like ?platform=ios) because that breaks the web UI.

export function isIOSCompanion() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // URL query flag set by iOS wrapper (?platform=ios)
  try {
    const params = new URLSearchParams(window.location.search);
    const p = (params.get("platform") || "").toLowerCase();
    if (p === "ios") return true;
  } catch (_e) {}

  // UA suffix (set by iOS wrapper customUserAgent)
  const ua = (navigator.userAgent || "").toLowerCase();
  if (ua.includes("pipekeepercompanionios") || ua.includes("pipekeeperios")) return true;

  return false;
}

export function isAndroidCompanion() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  try {
    const params = new URLSearchParams(window.location.search);
    const p = (params.get("platform") || "").toLowerCase();
    if (p === "android") return true;
  } catch (_e) {}

  const ua = (navigator.userAgent || "").toLowerCase();
  if (ua.includes("pipekeepercompanionandroid") || ua.includes("pipekeeperandroid")) return true;
  return false;
}

export function isCompanionApp() {
  return isIOSCompanion() || isAndroidCompanion();
}

export function shouldShowPurchaseUI() {
  // iOS companion MUST NOT show any purchase UI (App Store compliance)
  if (isIOSCompanion()) return false;
  // Android can show purchase UI
  return true;
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