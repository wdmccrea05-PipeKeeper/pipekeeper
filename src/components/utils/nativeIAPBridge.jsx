// src/components/utils/nativeIAPBridge.jsx

export const isIOSWebView = () => {
  return !!window?.webkit?.messageHandlers?.pipekeeper;
};

const safePost = (payload) => {
  try {
    const handler = window?.webkit?.messageHandlers?.pipekeeper;
    if (!handler || typeof handler.postMessage !== "function") return false;
    handler.postMessage(payload);
    return true;
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

// ✅ REQUIRED: Layout.jsx calls this. Native handles action "debugToast".
export const nativeDebugPing = (label = "ping") => {
  return safePost({ action: "debugToast", label });
};

export const registerNativeSubscriptionListener = (onStatus) => {
  if (typeof onStatus !== "function") return () => {};

  const handler = (e) => {
    const active = !!e?.detail?.active;
    onStatus(active);
  };

  window.addEventListener("pipekeeper_subscription_status", handler);
  return () => window.removeEventListener("pipekeeper_subscription_status", handler);
};