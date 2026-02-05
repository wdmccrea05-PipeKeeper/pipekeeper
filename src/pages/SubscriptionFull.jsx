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
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";

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
  const { t } = useTranslation();
  const isIOSApp = useMemo(() => isIOSWebView(), []);
  const { user, refetch } = useCurrentUser();
  const queryClient = useQueryClient();
  const [isPro, setIsPro] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTier, setSelectedTier] = useState("premium");
  const [selectedInterval, setSelectedInterval] = useState("monthly");
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [refreshTimeout, setRefreshTimeout] = useState(null);

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

  // Auto-sync on window refocus (Option A)
  useEffect(() => {
    if (isIOSApp) return;

    const handleFocus = async () => {
      try {
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      } catch (e) {
        console.warn("[SubscriptionFull] Auto-sync on refocus failed:", e);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isIOSApp, refetch, queryClient]);

  const tierPrices = {
    premium: { monthly: 1.99, annual: 19.99 },
    pro: { monthly: 2.99, annual: 29.99 },
  };

  const freeFeatures = [
    "Basic item records",
    "Notes and photos",
    "Manual organization",
  ];

  const tierDescriptions = {
    free: "Core cataloging for pipes and cellar items.",
    premium: "Premium adds expanded insights, reports, and advanced organization tools for collectors who actively manage and grow their collections.",
    pro: "Pro is designed for collectors who want deep analytics and optional AI-assisted tools for advanced organization and analysis.",
  };

  const tierTaglines = {
    premium: "For active collectors",
    pro: "For advanced collectors",
  };

  const tierFeatures = {
    premium: [
      "Collection insights and summaries",
      "Reports and exports",
      "Advanced organization tools",
      "Priority access to new features",
    ],
    pro: [
      "Deep collection analytics",
      "AI-assisted organization tools",
      "Power-user features",
    ],
  };

  const handleUpgrade = async () => {
    // iOS WKWebView -> StoreKit paywall (native)
    if (isIOSApp) {
      openNativePaywall();
      return;
    }

    // Non-iOS: Open backup modal with direct Stripe links
    setShowBackupModal(true);
  };

  const handleManage = async () => {
    setMessage("");

    // iOS WKWebView -> Apple subscriptions (native)
    if (isIOSApp) {
      openAppleSubscriptions();
      return;
    }

    // Non-iOS: Stripe customer portal with backup fallback
    try {
      await openManageSubscription(() => setShowBackupModal(true));
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
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">Continue using Premium tools for your collection</h1>
        <p className="text-[#e8d5b7]/70">You've had full access — choose how you'd like to continue.</p>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex gap-4 items-center">
         <span className="text-[#e8d5b7]">Billing:</span>
         <Button
           variant={selectedInterval === "monthly" ? "default" : "outline"}
           onClick={() => setSelectedInterval("monthly")}
         >
           Monthly
         </Button>
         <Button
           variant={selectedInterval === "annual" ? "default" : "outline"}
           onClick={() => setSelectedInterval("annual")}
         >
           Annual (Save {Math.round((1 - (tierPrices[selectedTier].annual / 12) / tierPrices[selectedTier].monthly) * 100)}%)
         </Button>
       </div>

      {/* Tier Selection */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Tier */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Free</CardTitle>
            <p className="text-sm text-[#e8d5b7]/70 mt-2">{tierDescriptions.free}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {freeFeatures.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm text-[#e8d5b7]/80">{f}</span>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4" disabled>
              Continue with Free
            </Button>
          </CardContent>
        </Card>

        {/* Premium Tier - Emphasized */}
        <Card className="border-[#A35C5C] bg-[#1A2B3A]/60 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#A35C5C] text-white px-3 py-1 rounded-full text-xs font-semibold">
            Recommended
          </div>
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Premium</CardTitle>
            <p className="text-xs text-[#A35C5C] font-semibold">{tierTaglines.premium}</p>
            <p className="text-sm text-[#e8d5b7]/70 mt-2">{tierDescriptions.premium}</p>
            <div className="text-2xl font-bold text-[#A35C5C] mt-3">${tierPrices.premium[selectedInterval]}</div>
            <div className="text-sm text-[#e8d5b7]/60">
              per {selectedInterval === "monthly" ? "month" : "year"}
            </div>
            {selectedInterval === "annual" && (
              <p className="text-xs text-emerald-500 mt-1">{t("subscription.annualSavings")}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {tierFeatures.premium.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm text-[#e8d5b7]/80">{f}</span>
              </div>
            ))}
            <Button
              className="w-full mt-4"
              onClick={() => {
                setSelectedTier("premium");
                setSelectedInterval("monthly");
                handleUpgrade();
              }}
            >
              Continue with Premium
            </Button>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Pro</CardTitle>
            <p className="text-xs text-[#A35C5C] font-semibold">{tierTaglines.pro}</p>
            <p className="text-sm text-[#e8d5b7]/70 mt-2">{tierDescriptions.pro}</p>
            <div className="text-2xl font-bold text-[#A35C5C] mt-3">${tierPrices.pro[selectedInterval]}</div>
            <div className="text-sm text-[#e8d5b7]/60">
              per {selectedInterval === "monthly" ? "month" : "year"}
            </div>
            {selectedInterval === "annual" && (
              <p className="text-xs text-emerald-500 mt-1">{t("subscription.annualSavings")}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {tierFeatures.pro.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm text-[#e8d5b7]/80">{f}</span>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                setSelectedTier("pro");
                setSelectedInterval("monthly");
                handleUpgrade();
              }}
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reassurance Copy */}
      <div className="text-center space-y-2 text-sm text-[#e8d5b7]/60">
         <p>• Cancel anytime</p>
         <p>• Subscription managed through {isIOSApp ? "Apple" : "Stripe"}</p>
         <p>• Your existing data is never affected</p>
       </div>

       {/* Manage Subscription */}
       <Button variant="outline" className="w-full" onClick={handleManage}>
         Manage Subscription
       </Button>

       {/* Direct Stripe checkout modal - PRIMARY METHOD */}
       <SubscriptionBackupModeModal
         isOpen={showBackupModal}
         onClose={() => setShowBackupModal(false)}
         user={user}
       />
    </div>
  );
}