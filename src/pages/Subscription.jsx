import React from "react";
import SubscriptionFull from "./SubscriptionFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

function FeatureList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((t, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-[#e8d5b7]/85">{t}</span>
        </div>
      ))}
    </div>
  );
}

function AppleSubscription() {
  const { t } = useTranslation();

  // Pull feature arrays from i18n (English has full arrays; other languages fall back to EN automatically)
  const freeFeatures = t("subscription.features.free", { returnObjects: true, defaultValue: [] });
  const premiumFeatures = t("subscription.features.premium", { returnObjects: true, defaultValue: [] });
  const proFeatures = t("subscription.features.pro", { returnObjects: true, defaultValue: [] });

  const openSubscription = () => {
    if (isAppleBuild && window?.webkit?.messageHandlers?.pipekeeper) {
      window.webkit.messageHandlers.pipekeeper.postMessage({ action: "openSubscriptionSheet" });
      return;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#e8d5b7]">{t("subscription.title")}</h1>

        <Button variant="secondary" onClick={openSubscription}>
          {t("subscription.manage")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Free</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={Array.isArray(freeFeatures) ? freeFeatures : []} />
            <div className="mt-4">
              <Button className="w-full" variant="outline" onClick={() => {}}>
                {t("subscription.continueFree")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={Array.isArray(premiumFeatures) ? premiumFeatures : []} />
            <div className="mt-4">
              <Button className="w-full" onClick={openSubscription}>
                {t("subscription.subscribe")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Pro</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={Array.isArray(proFeatures) ? proFeatures : []} />
            <div className="mt-4">
              <Button className="w-full" onClick={openSubscription}>
                {t("subscription.subscribe")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trial ended message (localized) */}
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