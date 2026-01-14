// Apple In-App Purchase utility for iOS builds
// Handles opening App Store subscription settings on iOS

export async function openAppleSettings() {
  if (!window.__PIPEKEEPER_VARIANT__ || window.__PIPEKEEPER_VARIANT__ !== 'apple') {
    console.warn('openAppleSettings called on non-Apple build');
    return;
  }

  try {
    // For iOS WKWebView, use custom scheme to open App Store subscription settings
    if (typeof window.webkit !== 'undefined' && window.webkit.messageHandlers?.openSettings) {
      window.webkit.messageHandlers.openSettings.postMessage({});
    } else {
      // Fallback: Apple's App Store URL scheme for subscription management
      window.location.href = 'itms-apps://apps.apple.com/subscription/settings';
    }
  } catch (error) {
    console.error('[openAppleSettings] Error:', error);
    alert('Unable to open App Store settings. Please manage your subscription in the Settings app.');
  }
}