import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/components/utils/navigation";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, AlertCircle } from "lucide-react";
import {
  isIOSWebView,
  openNativePaywall,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
  startApplePurchaseFlow,
} from "@/components/utils/nativeIAPBridge";
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { hasPaidAccess, hasProAccess } from "@/components/utils/premiumAccess";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { handleManageSubscription } from "@/components/utils/manageSubscription";
import { toast } from "sonner";
import { getUserSubscriptionState, getCurrentPlanLabel } from "@/lib/billing/subscriptionState";
import { getAvailableUpgradeOptions } from "@/lib/billing/upgradePaths";
import { SUBSCRIPTION_PLANS } from "@/lib/billing/subscriptionPlans";
import { getStripeConfig } from "@/components/subscription/stripeConfig";
import { initiateCheckoutWithIntent } from "@/components/subscription/subscriptionHandler";
import { syncAppleSubscriptionStatus } from "@/components/utils/appleSubscriptionSync";

function TierCard({ tier, interval, price, features, isSelected, onSelect, isLoading, t }) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "border-[#A35C5C] bg-[#1A2B3A]/60" : "border-white/10 hover:border-white/20"
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <CardTitle className="text-[#e8d5b7]">
          {({ free: t("subscription.free"), pro: t("subscription.pro") }[tier] ?? (tier.charAt(0).toUpperCase() + tier.slice(1)))}
        </CardTitle>
        <div className="text-2xl font-bold text-[#A35C5C] mt-2">${price}</div>
        <div className="text-sm text-[#e8d5b7]/60">{t("subscriptionFull.per")} {interval}</div>
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
          {isSelected ? t("subscriptionFull.selected") : t("subscriptionFull.choose")}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionFull() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isIOSApp = useMemo(() => isIOSWebView(), []);
  const { user, refetch, subscription } = useCurrentUser();
  const queryClient = useQueryClient();
  const [subActive, setSubActive] = useState(false);
  const [subTier, setSubTier] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInterval, setSelectedInterval] = useState("monthly");
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [refreshTimeout, setRefreshTimeout] = useState(null);

  const alreadySubscribed = hasPaidAccess(user, subscription);
  const alreadyPro = hasProAccess(user, subscription);

  // Compute normalized billing state from subscription records
  const subscriptionState = useMemo(
    () =>
      getUserSubscriptionState({
        activeSubscriptions: subscription ? [subscription] : [],
        entitlements: user?.entitlements || {},
        user,
      }),
    [user, subscription]
  );

  const upgradeOptions = useMemo(
    () => getAvailableUpgradeOptions(subscriptionState),
    [subscriptionState]
  );

  const [selectedUpgradeOption, setSelectedUpgradeOption] = useState(null);
  const [upgradeError, setUpgradeError] = useState(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState(null);

  useEffect(() => {
    if (!isIOSApp) return;

    requestNativeSubscriptionStatus();

    const cleanup = registerNativeSubscriptionListener((payload) => {
      const active = !!payload.active;
      setSubActive(active);
      setSubTier(payload?.tier || (payload?.productId || ""));
      if (active) setMessage(t("subscriptionFull.subActiveCheck"));

      syncAppleSubscriptionStatus(payload, { queryClient, refetch })
        .then((result) => {
          if (result?.skipped) {
            setMessage("Subscription verification is still processing. Please use Restore Purchases in the app and try again.");
          }
        })
        .catch((err) => {
          const errorMsg = err?.message || "Failed to sync Apple subscription status.";
          setMessage(errorMsg);
        });
    });

    return cleanup;
  }, [isIOSApp, t, queryClient, refetch]);

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
        const successUrl = createPageUrl("SubscriptionSuccessFlow?next=/CollectionHub");
        window.history.replaceState({}, document.title, successUrl);
        navigate(successUrl, { replace: true });
      }
    })();
  }, [isIOSApp, refetch, queryClient]);

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

  // Build available plans from stripe config, filtered by billing interval
  const stripeConfig = useMemo(() => getStripeConfig(), []);

  const availablePlans = useMemo(() => {
    const interval = selectedInterval === "annual" ? "annual" : "monthly";

    // Only show PipeKeeper Pro, WhiskeyKeeper Pro, and Founders Bundle
    const keyOrder = [
      `pipekeeper_pro_${interval}`,
      `whiskeykeeper_pro_${interval}`,
      `founders_bundle_${interval}`,
    ];

    return keyOrder
      .map(key => {
        const plan = stripeConfig[key];
        if (!plan?.isAvailable) return null;
        const appPlan = SUBSCRIPTION_PLANS[key] || {};
        return { ...appPlan, ...plan, key };
      })
      .filter(Boolean);
  }, [selectedInterval, stripeConfig]);

  const planLabels = {
    pipekeeper_pro_monthly: { name: "PipeKeeper Pro", badge: null },
    pipekeeper_pro_annual: { name: "PipeKeeper Pro", badge: "Best Value" },
    whiskeykeeper_pro_monthly: { name: "WhiskeyKeeper Pro", badge: null },
    whiskeykeeper_pro_annual: { name: "WhiskeyKeeper Pro", badge: "Best Value" },
    founders_bundle_monthly: { name: "Founders Bundle", badge: "Most Popular" },
    founders_bundle_annual: { name: "Founders Bundle", badge: "Best Value" },
  };

  const planDescriptions = {
    pipekeeper_pro_monthly: "Unlimited pipes & blends, AI pairings & identification",
    pipekeeper_pro_annual: "Unlimited pipes & blends, AI pairings & identification",
    whiskeykeeper_pro_monthly: "Unlimited bottles, AI valuations & tastings",
    whiskeykeeper_pro_annual: "Unlimited bottles, AI valuations & tastings",
    founders_bundle_monthly: "PipeKeeper + WhiskeyKeeper — both modules unlocked",
    founders_bundle_annual: "PipeKeeper + WhiskeyKeeper — both modules unlocked",
  };

  const handleUpgrade = async (planKey) => {
    if (isIOSApp) {
      const ok = startApplePurchaseFlow("pro");
      if (!ok) openNativePaywall();
      return;
    }

    setMessage("");
    try {
      await initiateCheckoutWithIntent(
        {
          actionType: "new_purchase",
          currentPlanKey: null,
          targetPlanKey: planKey,
        },
        `/SubscriptionSuccessFlow?next=${encodeURIComponent("/CollectionHub")}`,
        "/Subscription"
      );
    } catch (e) {
      console.error("[SubscriptionFull] Checkout error:", e);
      setMessage(t("subscriptionFull.checkoutError"));
    }
  };

  const handleUpgradeWithIntent = async (option) => {
    if (!option || isUpgrading) return;
    setIsUpgrading(true);
    setUpgradeError(null);
    setMessage("");

    try {
      // For bundle upgrades, cancel existing subscription first
      if (option.actionType === "upgrade_existing") {
        const userId = user?.id || user?.auth_user_id;
        const email = user?.email;
        let subs = [];
        if (userId) subs = await base44.entities.Subscription.filter({ user_id: userId }).catch(() => []);
        if (subs.length === 0 && email) subs = await base44.entities.Subscription.filter({ user_email: email }).catch(() => []);

        const cancelableIds = (Array.isArray(subs) ? subs : [])
          .filter(
            (s) =>
              ["active", "trialing", "past_due"].includes(String(s?.status || "").toLowerCase()) &&
              (String(s?.provider || "").toLowerCase() === "stripe" || !s?.provider) &&
              (s?.provider_subscription_id || s?.stripe_subscription_id)
          )
          .map((s) => s?.provider_subscription_id || s?.stripe_subscription_id)
          .filter(Boolean);

        if (cancelableIds.length > 0) {
          const upgradeRes = await base44.functions.invoke("handleBundleUpgrade", {
            currentSubscriptionIds: cancelableIds,
            targetBundleType: "founders",
            billingPeriod: option.targetPlanKey?.includes("monthly") ? "monthly" : "annual",
          });
          if (!upgradeRes?.data?.success) {
            setUpgradeError(upgradeRes?.data?.error || upgradeRes?.error || "Failed to prepare upgrade.");
            setIsUpgrading(false);
            return;
          }
        }
      }

      await initiateCheckoutWithIntent(
        {
          actionType: option.actionType,
          currentPlanKey: option.currentPlanKey,
          targetPlanKey: option.targetPlanKey,
        },
        `/SubscriptionSuccessFlow?next=${encodeURIComponent("/CollectionHub")}`,
        "/Subscription"
      );
    } catch (e) {
      setUpgradeError(e?.message || "An unexpected error occurred.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManage = async () => {
    setMessage("");
    try {
      const result = await handleManageSubscription(user, subscription, navigate, createPageUrl);
      if (!result?.ok) {
        toast.error(t("subscriptionFull.manageError"));
        navigate(createPageUrl("Subscription"));
      }
    } catch (e) {
      toast.error(t("subscriptionFull.manageError"));
      navigate(createPageUrl("Subscription"));
    }
  };

  const handleManualRefresh = async () => {
    setMessage("");
    try {
      await base44.functions.invoke("syncSubscriptionForMe", {}).catch(() => null);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setMessage(t("subscriptionFull.subUpdated"));
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage(t("subscriptionFull.refreshError"));
    }
  };

  if (isIOSApp) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#e8d5b7]">{t("subscriptionFull.pipekeeperSubs")}</h1>
          <Button variant="secondary" onClick={handleManage}>
            {t("subscriptionFull.manage")}
          </Button>
        </div>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscriptionFull.iosAppStore")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[#e8d5b7]/80">
            <p className="mb-4">{t("subscriptionFull.handledThroughApple")}</p>
            <div className="grid gap-3">
              <Button className="w-full" onClick={() => handleUpgrade("pro")}>
                {t("subscriptionFull.upgradeProAppStore")}
              </Button>
            </div>
            {subActive && (
              <div className="mt-4 text-emerald-500">
                {t("subscriptionFull.statusActive")}{subTier ? ` (${subTier})` : ""}
              </div>
            )}
            {message && <div className="mt-4 text-red-500">{message}</div>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySubscribed) {
    const planLabel = getCurrentPlanLabel(subscriptionState);
    const hasUpgradePaths = upgradeOptions.length > 0;

    // Bundle users — already have everything
    if (subscriptionState.hasBundle) {
      return (
        <div className="w-full max-w-3xl mx-auto p-4 space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mx-auto"
            style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
            <Crown className="w-4 h-4" />
            You already have the Founders Bundle
          </div>
          <h1 className="text-2xl font-bold text-[#e8d5b7]">
            {t("subscriptionFull.alreadySubscribed")}
          </h1>
          <p className="text-[#e8d5b7]/70">
            PipeKeeper + WhiskeyKeeper are both included in your Founders Bundle.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Button className="w-full" onClick={handleManage}>
              {t("subscriptionFull.manageSubscription")}
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleManualRefresh}>
              {t("subscriptionFull.refreshStatus")}
            </Button>
          </div>
          {message && (
            <div className={`text-center text-sm ${message.includes("✅") ? "text-emerald-500" : "text-red-500"}`}>
              {message}
            </div>
          )}
        </div>
      );
    }

    // Single-module subscribers — show upgrade paths
    if (hasUpgradePaths) {
      return (
        <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e8d5b7] mb-1">Your Subscription</h1>
            {planLabel && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(163,92,92,0.15)", color: "#D4A574", border: "1px solid rgba(163,92,92,0.3)" }}>
                Current Plan: {planLabel}
              </div>
            )}
          </div>

          <p className="text-[#e8d5b7]/70 text-sm">
            Choose what you'd like to do next:
          </p>

          {upgradeError && (
            <div className="p-3 rounded-lg flex gap-2 items-start text-sm"
              style={{ background: "rgba(224,93,93,0.1)", border: "1px solid rgba(224,93,93,0.3)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#E05D5D" }} />
              <span style={{ color: "#E05D5D" }}>{upgradeError}</span>
            </div>
          )}

          <div className="space-y-4">
            {upgradeOptions.map((option) => {
              const isBundle = option.action === "upgrade_to_bundle";
              const planDef = SUBSCRIPTION_PLANS[option.targetPlanKey];
              return (
                <div
                  key={option.action}
                  onClick={() => !isUpgrading && setSelectedUpgradeOption(selectedUpgradeOption?.action === option.action ? null : option)}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedUpgradeOption?.action === option.action
                      ? "border-[#A35C5C] bg-[#A35C5C]/10"
                      : "border-[#8b6239]/30 hover:border-[#A35C5C]/50 bg-[#2a1f18]/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isBundle && <Crown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#D4AF37" }} />}
                    <div className="flex-1">
                      <h3 className="font-bold text-[#F5F1E7]">{option.label}</h3>
                      {planDef?.displayPrice != null && (
                        <p className="text-sm text-[#D4A574] mt-0.5">
                          ${planDef.displayPrice}/{planDef.term === "annual" ? "yr" : "mo"}
                        </p>
                      )}
                      <p className="text-sm text-[#e8d5b7]/70 mt-1">{option.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedUpgradeOption && (
            <Button
              className="w-full"
              onClick={() => handleUpgradeWithIntent(selectedUpgradeOption)}
              disabled={isUpgrading}
            >
              {isUpgrading ? "Processing…" : `Continue — ${selectedUpgradeOption.label}`}
            </Button>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleManage}>
              {t("subscriptionFull.manageSubscription")}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={handleManualRefresh}>
              {t("subscriptionFull.refreshStatus")}
            </Button>
          </div>

          {message && (
            <div className={`text-center text-sm ${message.includes("✅") ? "text-emerald-500" : "text-red-500"}`}>
              {message}
            </div>
          )}
        </div>
      );
    }

    // Fallback for any other paid state — generic already-subscribed view
    return (
      <div className="w-full max-w-3xl mx-auto p-4 space-y-6 text-center">
        <h1 className="text-2xl font-bold text-[#e8d5b7]">
          {t("subscriptionFull.alreadySubscribed")}
        </h1>
        <p className="text-[#e8d5b7]/70">
          {t("subscriptionFull.currentlyOnPro")}
        </p>
        <Button className="w-full max-w-xs mx-auto" onClick={handleManage}>
          {t("subscriptionFull.manageSubscription")}
        </Button>
        <Button variant="secondary" className="w-full max-w-xs mx-auto mt-2" onClick={handleManualRefresh}>
          {t("subscriptionFull.refreshStatus")}
        </Button>
        {message && (
          <div className={`text-center text-sm ${message.includes("✅") ? "text-emerald-500" : "text-red-500"}`}>
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#e8d5b7] mb-2">Unlock Pro Features</h1>
        <p className="text-[#e8d5b7]/70">Choose the plan that's right for you.</p>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex gap-3 items-center justify-center">
        <Button
          variant={selectedInterval === "monthly" ? "default" : "outline"}
          onClick={() => { setSelectedInterval("monthly"); setSelectedPlanKey(null); }}
        >
          {t("subscriptionFull.monthly")}
        </Button>
        <Button
          variant={selectedInterval === "annual" ? "default" : "outline"}
          onClick={() => { setSelectedInterval("annual"); setSelectedPlanKey(null); }}
        >
          Annual <span className="ml-1 text-emerald-400 text-xs font-semibold">Save ~16%</span>
        </Button>
      </div>

      {/* Plan Cards */}
      <div className="space-y-3">
        {availablePlans.length === 0 && (
          <p className="text-center text-[#e8d5b7]/50 text-sm">No plans available for this billing period.</p>
        )}
        {availablePlans.map((plan) => {
          const meta = planLabels[plan.key] || { name: plan.displayName, badge: null };
          const desc = planDescriptions[plan.key] || "";
          const isSelected = selectedPlanKey === plan.key;
          const isBundle = plan.type === "bundle" || plan.type === "founders" || plan.type === "three_bundle" || plan.type === "four_bundle";

          return (
            <div
              key={plan.key}
              onClick={() => setSelectedPlanKey(plan.key)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-[#A35C5C] bg-[#A35C5C]/10"
                  : "border-[#8b6239]/30 hover:border-[#A35C5C]/50 bg-[#2a1f18]/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {isBundle && <Crown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#D4AF37" }} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#F5F1E7]">{meta.name}</h3>
                      {meta.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(163,92,92,0.2)", color: "#D4A574", border: "1px solid rgba(163,92,92,0.4)" }}>
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#e8d5b7]/70 mt-0.5">{desc}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-[#D4A574]">{plan.displayPrice}</div>
                  <div className="text-xs text-[#e8d5b7]/50">{plan.displayPeriod}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <Button
        className="w-full"
        disabled={!selectedPlanKey}
        onClick={() => selectedPlanKey && handleUpgrade(selectedPlanKey)}
      >
        {selectedPlanKey
          ? `Subscribe — ${planLabels[selectedPlanKey]?.name || selectedPlanKey}`
          : "Select a plan above"}
      </Button>

      {/* Reassurance */}
      <div className="text-center space-y-1 text-sm text-[#e8d5b7]/50">
        <p>{t("subscriptionFull.cancelAnytime")}</p>
        {!isIOSApp && <p>{t("subscriptionFull.managedThroughStripe")}</p>}
      </div>

      {/* Manage / Backup */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={handleManage}>
          {t("subscriptionFull.manageSubscription")}
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => setShowBackupModal(true)}>
          {t("subscriptionFull.manualBackupCheckout")}
        </Button>
      </div>

      {message && (
        <div className={`text-center text-sm ${message.includes("✅") ? "text-emerald-500" : "text-red-500"}`}>
          {message}
        </div>
      )}

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
