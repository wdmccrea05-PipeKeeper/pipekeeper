import React from "react";
import SubscriptionFull from "./SubscriptionFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from "sonner";
import { openAppleSubscriptions, openNativePaywall, startApplePurchaseFlow } from "@/components/utils/nativeIAPBridge";

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

  const freeFeatures = [
    t("subscription.appleFeatureFree1"),
    t("subscription.appleFeatureFree2"),
    t("subscription.appleFeatureFree3"),
    t("subscription.appleFeatureFree4"),
    t("subscription.appleFeatureFree5"),
    t("subscription.appleFeatureFree6"),
    t("subscription.appleFeatureFree7"),
  ];

  const premiumFeatures = [
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
  ];

  const proFeatures = [
    t("subscription.appleFeaturePro1"),
    t("subscription.appleFeaturePro2"),
    t("subscription.appleFeaturePro3"),
    t("subscription.appleFeaturePro4"),
    t("subscription.appleFeaturePro5"),
    t("subscription.appleFeaturePro6"),
    t("subscription.appleFeaturePro7"),
    t("subscription.appleFeaturePro8"),
  ];

  const openSubscription = (tier = "premium") => {
    if (!isAppleBuild) return;

    // Prefer tier-aware paywall so Pro upgrades present the correct product.
    const openedTierPaywall = startApplePurchaseFlow(tier);
    if (openedTierPaywall) return;

    const openedPaywall = openNativePaywall();
    if (openedPaywall) return;

    const openedManage = openAppleSubscriptions();
    if (openedManage) return;

    // Fallback so user never gets a dead click
    window.open("https://apps.apple.com/account/subscriptions", "_blank");
    toast.info("Opened Apple subscriptions in browser.");
  };

  const openManage = () => {
    if (!isAppleBuild) return;

    const openedManage = openAppleSubscriptions();
    if (openedManage) return;

    window.open("https://apps.apple.com/account/subscriptions", "_blank");
    toast.info("Opened Apple subscription management in browser.");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#e8d5b7]">{t("subscription.title")}</h1>

        <Button variant="secondary" onClick={openManage}>
          {t("subscription.manage")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscription.premium")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={premiumFeatures} />
            <div className="mt-4">
              <Button className="w-full" onClick={() => openSubscription("premium")}>
                {t("subscription.subscribe")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">{t("subscription.pro")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={proFeatures} />
            <div className="mt-4">
              <Button className="w-full" onClick={() => openSubscription("pro")}>
                {t("subscription.subscribe")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("subscription.trialEndedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80">
          {t("subscription.trialEndedBody")}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Subscription() {
  if (!isAppleBuild) return <SubscriptionFull />;
  return <AppleSubscription />;
}