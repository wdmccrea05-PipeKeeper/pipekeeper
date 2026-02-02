import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import {
  isIOSWebView,
  openNativePaywall,
  openAppleSubscriptions,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
} from "@/components/utils/nativeIAPBridge";
import { openManageSubscription } from "@/components/utils/subscriptionManagement";

function TierCard({ tier, interval, price, features, isSelected, onSelect, isLoading }) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "border-[#A35C5C] bg-[#1A2B3A]/60" : "border-white/10 hover:border-white/20"
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <CardTitle className="text-[#e8d5b7]">
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </CardTitle>
        <div className="text-2xl font-bold text-[#A35C5C] mt-2">${price}</div>
        <div className="text-sm text-[#e8d5b7]/60">per {interval}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-sm text-[#e8d5b7]/80">{f}</span>
          </div>
        ))}
        <Button
          className="w-full mt-4"
          variant={isSelected ? "default" : "outline"}
          disabled={isLoading}
        >
          {isSelected ? "Selected" : "Choose"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionFull() {
  const isIOSApp = useMemo(() => isIOSWebView(), []);
  const [isPro, setIsPro] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTier, setSelectedTier] = useState("premium");
  const [selectedInterval, setSelectedInterval] = useState("monthly");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isIOSApp) return;

    // Ask native for current status
    requestNativeSubscriptionStatus();

    // Listen for native updates - payload is an object, not boolean
    const cleanup = registerNativeSubscriptionListener((payload) => {
      const active = !!payload.active;
      setIsPro(active);
      if (active) setMessage("Subscription active ✅");
    });

    return cleanup;
  }, [isIOSApp]);

  const tierPrices = {
    premium: { monthly: 4.99, annual: 49.99 },
    pro: { monthly: 9.99, annual: 99.99 },
  };

  const tierFeatures = {
    premium: [
      "Unlimited pipes and tobacco blends",
      "Unlimited notes and photos",
      "Cellar tracking and aging logs",
      "Smoking logs and history",
      "Advanced filters and sorting",
      "Cloud sync across devices",
    ],
    pro: [
      "Everything in Premium",
      "AI Identification tools",
      "Advanced analytics & insights",
      "Bulk editing tools",
      "Export & reports (CSV / PDF)",
      "Collection optimization tools",
    ],
  };

  const handleUpgrade = async () => {
    setMessage("");
    setIsLoading(true);

    // iOS WKWebView -> StoreKit paywall (native)
    if (isIOSApp) {
      openNativePaywall();
      setIsLoading(false);
      return;
    }

    // Non-iOS: Stripe checkout
    try {
      const response = await base44.functions.invoke("createCheckoutSession", {
        tier: selectedTier,
        interval: selectedInterval,
      });

      if (response?.data?.url) {
        window.location.href = response.data.url;
      } else {
        setMessage("Error: " + (response?.data?.error || "Could not start checkout"));
      }
    } catch (e) {
      setMessage("Error: " + (e?.message || "Could not start checkout"));
    } finally {
      setIsLoading(false);
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
      <h1 style={{ marginBottom: 8, color: "#E0D8C8", fontSize: 32, fontWeight: "bold" }}>PipeKeeper Premium</h1>

      <p style={{ marginTop: 0, lineHeight: 1.5, color: "#E0D8C8", fontSize: 16 }}>
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
          <div style={{ fontWeight: 600, marginBottom: 6, color: "#E0D8C8" }}>
            iOS App Store Subscriptions
          </div>
          <div style={{ opacity: 0.85, fontSize: 14, color: "#E0D8C8" }}>
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
            background: "#A35C5C",
            color: "#E0D8C8",
          }}
        >
          {isIOSApp ? "Upgrade (App Store)" : "Upgrade"}
        </button>

        <button
          onClick={handleManage}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(224, 216, 200, 0.3)",
            cursor: "pointer",
            fontWeight: 600,
            background: "transparent",
            flex: "1 1 auto",
            minWidth: 0,
            color: "#E0D8C8",
          }}
        >
          {isIOSApp ? "Manage (Apple)" : "Manage Subscription"}
        </button>
      </div>

      {isIOSApp && (
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.85, color: "#E0D8C8" }}>
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