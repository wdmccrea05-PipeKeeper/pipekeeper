import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  isIOSWebView,
  openNativePaywall,
  openAppleSubscriptions,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
} from "@/components/utils/nativeIAPBridge";
import { openManageSubscription } from "@/components/utils/subscriptionManagement";

export default function SubscriptionFull() {
  const isIOSApp = useMemo(() => isIOSWebView(), []);
  const [isPro, setIsPro] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isIOSApp) return;

    // Ask native for current status
    requestNativeSubscriptionStatus();

    // Listen for native updates
    const cleanup = registerNativeSubscriptionListener((active) => {
      setIsPro(active);
      if (active) setMessage("Subscription active ✅");
    });

    return cleanup;
  }, [isIOSApp]);

  const handleUpgrade = async () => {
    setMessage("");

    // iOS WKWebView -> StoreKit paywall (native)
    if (isIOSApp) {
      openNativePaywall();
      return;
    }

    // Non-iOS: keep existing Stripe checkout
    try {
      const response = await base44.functions.invoke('createCheckoutSession', { 
        tier: 'premium', 
        interval: 'annual' 
      });
      
      if (response?.data?.url) {
        window.location.href = response.data.url;
      } else {
        setMessage("Could not start checkout. Please try again.");
      }
    } catch (e) {
      setMessage("Could not start checkout. Please try again.");
    }
  };

  const handleManage = async () => {
    setMessage("");

    // iOS WKWebView -> Apple subscriptions (native)
    if (isIOSApp) {
      openAppleSubscriptions();
      return;
    }

    // Non-iOS: keep existing Stripe customer portal
    try {
      await openManageSubscription();
    } catch (e) {
      setMessage("Could not open subscription management. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>PipeKeeper Premium</h1>

      <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.5 }}>
        Unlock unlimited pipes and tobacco blends, cellar tracking, smoking logs, AI-powered insights, and advanced collection management tools.
      </p>

      {isIOSApp && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(0,0,0,0.06)",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            iOS App Store Subscriptions
          </div>
          <div style={{ opacity: 0.85, fontSize: 14 }}>
            Purchases and subscription management are handled through Apple.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          onClick={handleUpgrade}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {isIOSApp ? "Upgrade (App Store)" : "Upgrade"}
        </button>

        <button
          onClick={handleManage}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
            cursor: "pointer",
            fontWeight: 600,
            background: "transparent",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {isIOSApp ? "Manage (Apple)" : "Manage Subscription"}
        </button>
      </div>

      {isIOSApp && (
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
          {isPro ? "Status: Pro Active ✅" : "Status: Free / Not Active"}
        </div>
      )}

      {message && (
        <div style={{ marginTop: 12, color: message.includes("✅") ? "green" : "crimson" }}>
          {message}
        </div>
      )}

      {/* IMPORTANT SAFETY NOTE:
          On iOS WKWebView, do NOT render any Stripe portal links or buttons.
          If your existing page includes those elsewhere, Base44 should remove them
          from the iOS WKWebView conditional path. */}
    </div>
  );
}