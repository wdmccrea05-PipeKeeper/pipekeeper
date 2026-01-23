import React, { useEffect, useMemo, useState } from "react";
import {
  isIOSWebView,
  openAppleSubscriptions,
  openNativePaywall,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
  nativeDebugPing,
} from "../components/utils/nativeIAPBridge";

/**
 * Layout.js — Global iOS intercept (bulletproof)
 *
 * - Captures pointerdown/touchend/click (capture phase)
 * - Works even if "Manage subscription" is a DIV, custom component, etc.
 * - Shows toast so nothing fails silently
 * - Calls native bridge actions directly
 */

export default function Layout({ children }) {
  const ios = useMemo(() => isIOSWebView(), []);
  const [toast, setToast] = useState("");
  const [subActive, setSubActive] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2600);
  };

  // Keep subscription status wiring
  useEffect(() => {
    if (!ios) return undefined;

    // ping native once on mount so we can see if bridge works
    nativeDebugPing("Layout mounted (bridge ok)");

    requestNativeSubscriptionStatus();
    const cleanup = registerNativeSubscriptionListener((active) => {
      setSubActive(!!active);
    });
    return cleanup;
  }, [ios]);

  // Extremely robust text extraction (handles nested spans/icons/etc.)
  const getClickableText = (evtTarget) => {
    try {
      const path = typeof evtTarget?.composedPath === "function" ? evtTarget.composedPath() : [];
      const candidates = [];

      // Add target and ancestors
      let el = evtTarget;
      for (let i = 0; i < 8 && el; i++) {
        candidates.push(el);
        el = el.parentElement;
      }

      // Add composed path elements
      for (const p of path) {
        if (p && p.nodeType === 1) candidates.push(p);
      }

      // Try to find something with meaningful text
      for (const c of candidates) {
        const text = (c?.innerText || c?.textContent || "").trim();
        if (text && text.length <= 60) return text;
      }
      return "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!ios) return undefined;

    const shouldManage = (t) => {
      const text = (t || "").trim().toLowerCase();
      return (
        text.includes("manage subscription") ||
        text.includes("update subscription") ||
        text.includes("cancel subscription") ||
        text.includes("manage plan") ||
        text.includes("manage billing")
      );
    };

    const shouldUpgrade = (t) => {
      const text = (t || "").trim().toLowerCase();
      return (
        text === "upgrade" ||
        text.includes("upgrade to pro") ||
        text.includes("upgrade (app store)") ||
        text.includes("subscribe") ||
        text.includes("go pro")
      );
    };

    const intercept = (e, phaseLabel) => {
      const text = getClickableText(e.target);

      if (shouldManage(text)) {
        e.preventDefault();
        e.stopPropagation();

        // prove interception happened
        showToast("Opening Apple Subscriptions…");
        nativeDebugPing(`Intercepted manage (${phaseLabel})`);

        const ok = openAppleSubscriptions();
        if (!ok) showToast("Bridge not available: cannot open Apple subscriptions.");
        return;
      }

      if (shouldUpgrade(text)) {
        e.preventDefault();
        e.stopPropagation();

        showToast("Opening upgrade…");
        nativeDebugPing(`Intercepted upgrade (${phaseLabel})`);

        const ok = openNativePaywall();
        if (!ok) showToast("Bridge not available: cannot open upgrade.");
        return;
      }
    };

    // Capture phase handlers — these catch almost everything
    const onPointerDown = (e) => intercept(e, "pointerdown");
    const onTouchEnd = (e) => intercept(e, "touchend");
    const onClick = (e) => intercept(e, "click");

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("touchend", onTouchEnd, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [ios]);

  return (
    <>
      {/* Debug pill (remove later) */}
      {ios && (
        <div
          style={{
            position: "fixed",
            right: 10,
            bottom: 10,
            padding: "6px 10px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.18)",
            fontSize: 12,
            zIndex: 999999,
            pointerEvents: "none",
          }}
        >
          Bridge: ✅ | {subActive ? "Pro ✅" : "Free"}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.85)",
            color: "white",
            zIndex: 999999,
            fontSize: 14,
            maxWidth: 360,
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}

      {children}
    </>
  );
}