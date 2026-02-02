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
    premium: { monthly: 1.99, annual: 19.99 },
    pro: { monthly: 2.99, annual: 29.99 },
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

    // Non-iOS: Stripe customer portal
    try {
      await openManageSubscription();
    } catch (e) {
      setMessage("Error: Could not open subscription management");
    }
  };

  if (isIOSApp) {
    // iOS App Store subscriptions
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#e8d5b7]">PipeKeeper Subscriptions</h1>
          <Button variant="secondary" onClick={handleManage}>
            Manage
          </Button>
        </div>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">iOS App Store</CardTitle>
          </CardHeader>
          <CardContent className="text-[#e8d5b7]/80">
            <p className="mb-4">Purchases and subscription management are handled through Apple.</p>
            <Button className="w-full" onClick={handleUpgrade}>
              Upgrade (App Store)
            </Button>
            {isPro && <div className="mt-4 text-emerald-500">Status: Pro Active ✅</div>}
            {message && <div className="mt-4 text-red-500">{message}</div>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Web/Android subscriptions
  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">PipeKeeper Subscriptions</h1>
        <p className="text-[#e8d5b7]/70">Choose your plan and unlock premium features</p>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex gap-4 items-center">
        <span className="text-[#e8d5b7]">Billing:</span>
        <Button
          variant={selectedInterval === "monthly" ? "default" : "outline"}
          onClick={() => setSelectedInterval("monthly")}
          disabled={isLoading}
        >
          Monthly
        </Button>
        <Button
          variant={selectedInterval === "annual" ? "default" : "outline"}
          onClick={() => setSelectedInterval("annual")}
          disabled={isLoading}
        >
          Annual (Save {Math.round((1 - (tierPrices[selectedTier].annual / 12) / tierPrices[selectedTier].monthly) * 100)}%)
        </Button>
      </div>

      {/* Tier Selection */}
      <div className="grid gap-6 md:grid-cols-2">
        <TierCard
          tier="premium"
          interval={selectedInterval}
          price={tierPrices.premium[selectedInterval]}
          features={tierFeatures.premium}
          isSelected={selectedTier === "premium"}
          onSelect={() => setSelectedTier("premium")}
          isLoading={isLoading}
        />
        <TierCard
          tier="pro"
          interval={selectedInterval}
          price={tierPrices.pro[selectedInterval]}
          features={tierFeatures.pro}
          isSelected={selectedTier === "pro"}
          onSelect={() => setSelectedTier("pro")}
          isLoading={isLoading}
        />
      </div>

      {/* Upgrade Button */}
      <Button
        size="lg"
        className="w-full text-lg"
        onClick={handleUpgrade}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : `Upgrade to ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`}
      </Button>

      {/* Manage Subscription */}
      <Button variant="outline" className="w-full" onClick={handleManage} disabled={isLoading}>
        Manage Subscription
      </Button>

      {message && (
        <Card className={`border-${message.includes("Error") ? "red" : "green"}-500`}>
          <CardContent className={`pt-6 text-${message.includes("Error") ? "red" : "green"}-500`}>
            {message}
          </CardContent>
        </Card>
      )}
    </div>
  );
}