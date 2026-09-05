import React from "react";
import SubscriptionFull from "./SubscriptionFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";
import {
  openAppleSubscriptions,
  openNativePaywall,
  startApplePurchaseFlow,
  isIOSWebView,
  requestNativeSubscriptionStatus,
  registerNativeSubscriptionListener,
} from "@/components/utils/nativeIAPBridge";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { syncAppleSubscriptionStatus } from "@/components/utils/appleSubscriptionSync";

function FeatureList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((text, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-[#e8d5b7]/85">{text}</span>
        </div>
      ))}
    </div>
  );
}

function AppleSubscription() {
  const { t } = useTranslation();
  const { hasPaid, isTrial, refetch } = useCurrentUser();
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState("");
  const [restoring, setRestoring] = React.useState(false);

  React.useEffect(() => {
    if (!isAppleBuild || !isIOSWebView()) return;

    requestNativeSubscriptionStatus();
    const cleanup = registerNativeSubscriptionListener((payload) => {
      syncAppleSubscriptionStatus(payload, { queryClient, refetch })
        .then((result) => {
          if (result?.skipped) {
            setSyncMessage(t("subscription.syncStillProcessing"));
          } else {
            setSyncMessage("");
          }
        })
        .catch((err) => {
          setSyncMessage(err?.message || t("subscription.syncStatusFailed"));
        });
    });

    return cleanup;
  }, [queryClient, refetch]);

  const handleRestorePurchases = async () => {
    setRestoring(true);
    setSyncMessage("");
    try {
      if (isIOSWebView()) {
        // On iOS — trigger native subscription status request
        requestNativeSubscriptionStatus();
        setSyncMessage(t("subscription.restoreInProgress", "Restore request sent. If you have an active subscription, it will sync shortly."));
      } else {
        // On web but in Apple build — user may have purchased via App Store
        // but is accessing the web version. Attempt a pending-verification sync.
        const { base44 } = await import("@/api/base44Client");
        const result = await base44.functions.invoke("syncAppleSubscriptionForMe", {
          active: true,
          tier: "pro",
          productId: "",
          originalTransactionId: "",
          verificationProof: null,
        });
        if (result?.data?.ok) {
          setSyncMessage(t("subscription.restoreSynced", "Subscription sync attempted. If you have an active Apple subscription, please open the CollectionKeeper iOS app to complete verification."));
          await refetch();
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
          queryClient.invalidateQueries({ queryKey: ["current-user"] });
        } else {
          setSyncMessage(result?.data?.error || t("subscription.syncStatusFailed"));
        }
      }
    } catch (err) {
      setSyncMessage(err?.message || t("subscription.syncStatusFailed"));
    } finally {
      setRestoring(false);
    }
  };

  const freeFeatures = [
    t("subscription.appleFeatureFree1"),
    t("subscription.appleFeatureFree2"),
    t("subscription.appleFeatureFree3"),
    t("subscription.appleFeatureFree4"),
    t("subscription.appleFeatureFree5"),
    t("subscription.appleFeatureFree6"),
    t("subscription.appleFeatureFree7"),
  ];

  const proFeatures = [
    t("subscription.appleFeaturePremium1"),
    t("subscription.appleFeaturePremium2"),
    t("subscription.appleFeaturePremium3"),
    t("subscription.appleFeaturePremium4"),
    t("subscription.appleFeaturePremium5"),
    t("subscription.appleFeaturePremium6"),
    t("subscription.appleFeaturePremium7"),
    t("subscription.appleFeaturePremium8"),
    t("subscription.appleFeaturePremium9"),
    t("subscription.appleFeaturePremium10"),
    t("subscription.appleFeaturePro1"),
    t("subscription.appleFeaturePro2"),
    t("subscription.appleFeaturePro3"),
    t("subscription.appleFeaturePro4"),
    t("subscription.appleFeaturePro5"),
    t("subscription.appleFeaturePro6"),
    t("subscription.appleFeaturePro7"),
    t("subscription.appleFeaturePro8"),
  ];

  const openSubscription = async (tier = "pro") => {
    setUpgrading(true);
    try {
      if (!isAppleBuild) {
        toast.error(t("subscription.appleOnlyInApp"));
        return;
      }

      const isWebView = isIOSWebView();
      if (!isWebView) {
        toast.error(t("subscription.openInAppToUpgrade"));
        return;
      }

      // Prefer tier-aware paywall so Pro upgrades present the correct product.
      const openedTierPaywall = startApplePurchaseFlow(tier);
      if (openedTierPaywall) return;

      const openedPaywall = openNativePaywall();
      if (openedPaywall) return;

      const openedManage = openAppleSubscriptions();
      if (openedManage) return;

      // Fallback so user never gets a dead click
      window.location.assign("https://apps.apple.com/account/subscriptions");
      toast.info(t("subscription.openedAppleSubsInBrowser"));
    } catch (error) {
      console.error("[Subscription] upgrade error:", error);
      toast.error(t("subscription.openSubscriptionFailed"));
    } finally {
      setUpgrading(false);
    }
  };

  const openManage = () => {
    if (!isAppleBuild) return;

    const openedManage = openAppleSubscriptions();
    if (openedManage) return;

    window.location.assign("https://apps.apple.com/account/subscriptions");
    toast.info(t("subscription.openedAppleSubsMgmtInBrowser"));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#e8d5b7]">{t("subscription.title")}</h1>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRestorePurchases}
            disabled={restoring}
          >
            {restoring
              ? t("subscription.restoring", "Restoring...")
              : t("subscription.restorePurchases", "Restore Purchases")}
          </Button>
          <Button variant="secondary" onClick={openManage}>
            {t("subscription.manage")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscription.free")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={freeFeatures} />
            <div className="mt-4">
              <Button className="w-full" variant="outline" onClick={() => {}}>
                {t("subscription.continueFree")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-[#A35C5C] relative overflow-visible">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#A35C5C] text-white px-3 py-1 rounded-full text-xs font-semibold">
            {t("subscriptionFull.recommended")}
          </div>
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscription.pro")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={proFeatures} />
            <div className="mt-4">
              <Button className="w-full" onClick={() => openSubscription("pro")} disabled={upgrading}>
                {upgrading ? t("subscription.opening") : t("subscription.subscribe")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasPaid && !isTrial && (
        <Card className="bg-black/30 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscription.trialEndedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[#e8d5b7]/80">
            {t("subscription.trialEndedBody")}
          </CardContent>
        </Card>
      )}

      {(hasPaid || isTrial) && (
        <Card className="bg-black/30 border-white/10">
          <CardContent className="pt-6 text-emerald-400 text-center">
            {hasPaid
              ? t("subscription.activeSubscription")
              : t("subscription.trialActive")}
          </CardContent>
        </Card>
      )}

      {syncMessage && (
        <Card className="bg-black/30 border-white/10">
          <CardContent className="pt-6 text-red-400 text-center text-sm">
            {syncMessage}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Subscription() {
  if (!isAppleBuild) return <SubscriptionFull />;
  return <AppleSubscription />;
}