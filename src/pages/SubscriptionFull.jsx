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
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/components/utils/createPageUrl";

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

  // Backward compatibility: older checkout links return to /Subscription?success=1.
  useEffect(() => {
    if (isIOSApp) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") !== "1") return;

    (async () => {
      try {
        await base44.functions.invoke("syncSubscriptionForMe", {});
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      } catch (e) {
        if (import.meta?.env?.DEV) {
          console.warn("[SubscriptionFull] success sync failed:", e);
        }
      } finally {
        window.history.replaceState({}, document.title, createPageUrl("SubscriptionSuccess"));
        window.location.href = createPageUrl("SubscriptionSuccess");
      }
    })();
  }, [isIOSApp, refetch, queryClient]);

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

  const freeFeatures = t("subscription.freeFeatures").split(", ");

  const tierDescriptions = {
    free: t("subscription.tierDescFree"),
    premium: t("subscription.tierDescPremium"),
    pro: t("subscription.tierDescPro"),
  };

  const tierTaglines = {
    premium: t("subscription.taglinePremium"),
    pro: t("subscription.taglinePro"),
  };

  const tierFeatures = {
    premium: t("subscription.premiumFeatures").split(", "),
    pro: t("subscription.proFeatures").split(", "),
  };

  const handleUpgrade = async (tier, interval) => {
    // iOS WKWebView -> StoreKit paywall (native)
    if (isIOSApp) {
      openNativePaywall();
      return;
    }

    // Non-iOS: Open Stripe checkout
    setMessage("");
    try {
      const response = await base44.functions.invoke('createCheckoutSession', {
        tier: tier || selectedTier,
        interval: interval || selectedInterval,
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setMessage("Error starting checkout. Please try again.");
      }
    } catch (e) {
      console.error("[SubscriptionFull] Checkout error:", e);
      setMessage("Error starting checkout. Please try again.");
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
      const response = await base44.functions.invoke('createCustomerPortalSession', {});
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setMessage("Error: Could not open subscription management");
      }
    } catch (e) {
      setMessage("Error: Could not open subscription management");
    }
  };

  const handleManualRefresh = async () => {
    setMessage("");
    try {
      await base44.functions.invoke("syncSubscriptionForMe", {}).catch(() => null);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setMessage("✅ Subscription updated");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage("Could not refresh. Please try again.");
    }
  };

  if (isIOSApp) {
    // iOS App Store subscriptions
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#e8d5b7]">{t("subscription.title")}</h1>
          <Button variant="secondary" onClick={handleManage}>
            {t("subscription.manage")}
          </Button>
        </div>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscription.iosAppStore")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[#e8d5b7]/80">
            <p className="mb-4">{t("subscription.purchasesHandledApple")}</p>
            <Button className="w-full" onClick={handleUpgrade}>
              {t("subscription.upgradeAppStore")}
            </Button>
            {isPro && <div className="mt-4 text-emerald-500">{t("subscription.statusProActive")}</div>}
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
        <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">{t("subscription.continueUsing")}</h1>
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
              onClick={() => handleUpgrade("premium", selectedInterval)}
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
              onClick={() => handleUpgrade("pro", selectedInterval)}
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reassurance Copy */}
      <div className="text-center space-y-2 text-sm text-[#e8d5b7]/60">
         <p>• Cancel anytime</p>
         {!isIOSApp && <p>• Subscription managed through Stripe</p>}
         <p>• Your existing data is never affected</p>
       </div>

       {/* Manage Subscription */}
       <div className="space-y-3">
         <Button variant="outline" className="w-full" onClick={handleManage}>
           Manage Subscription
         </Button>
         <Button variant="secondary" className="w-full" onClick={() => setShowBackupModal(true)}>
           Manual Backup Checkout
         </Button>
       </div>

       {message && (
         <div className={`text-center text-sm ${message.includes("✅") ? "text-emerald-500" : "text-red-500"}`}>
           {message}
         </div>
       )}

       {/* Backup Mode Modal */}
       <SubscriptionBackupModeModal
         isOpen={showBackupModal}
         onClose={() => {
           setShowBackupModal(false);
           clearTimeout(refreshTimeout);
           setRefreshTimeout(null);
           setMessage("");
         }}
         user={user}
       />
    </div>
  );
}