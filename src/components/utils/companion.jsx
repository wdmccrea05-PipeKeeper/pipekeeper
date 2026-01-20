/**
 * Companion detection:
 * - iOS wrapper should append ?platform=ios (per your current approach)
 * - Optional: user agent contains markers like "PipeKeeperiOS" / "PipeKeeperCompanion"
 */

export function getCompanionPlatform() {
  try {
    if (typeof window === "undefined") return null;

    const url = new URL(window.location.href);
    const platformParam = (url.searchParams.get("platform") || "").toLowerCase();

    if (platformParam === "ios") return "ios";

    const ua = (navigator.userAgent || "").toLowerCase();
    if (ua.includes("pipekeeperios") || ua.includes("pipekeeper-companion") || ua.includes("pipekeepercompanion")) {
      return "ios";
    }

    // If you later add Android wrapper markers, detect them here.
    // Example:
    // if (platformParam === "android") return "android";
    // if (ua.includes("pipekeeperandroid")) return "android";

    return null;
  } catch {
    return null;
  }
}

export function isIOSCompanion() {
  return getCompanionPlatform() === "ios";
}

export function isCompanionApp() {
  return !!getCompanionPlatform();
}

/**
 * IMPORTANT (Apple compliance):
 * If running inside iOS companion wrapper, do NOT show external purchase UI
 * (Stripe checkout, billing portal, external upgrade links).
 */
export function shouldShowPurchaseUI() {
  // iOS companion -> purchases must be Apple IAP, handled natively
  if (isIOSCompanion()) return false;

  // Web / Android web app can show Stripe purchase UI (if you still use Stripe there)
  return true;
}

export function getPremiumGateMessage() {
  if (isIOSCompanion()) {
    return "Upgrade to Premium via the App Store to unlock this feature.";
  }
  return "Upgrade to Premium to unlock this feature.";
}

export function getSubscriptionManagementMessage() {
  if (isIOSCompanion()) {
    return "Manage your subscription on the web at pipekeeper.app";
  }
  return "Upgrade to Premium to unlock this feature.";
}