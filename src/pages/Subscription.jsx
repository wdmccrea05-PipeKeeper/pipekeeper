import React from "react";
import SubscriptionFull from "./SubscriptionFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import SubscriptionManagerButton from "@/components/subscription/SubscriptionManagerButton";

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
    "Add up to 5 pipes",
    "Add up to 10 tobacco blends",
    "View, edit, and organize your collection",
    "Basic notes and ratings",
    "Search pipes and tobaccos",
    "Multilingual support (10 languages)",
    "Cloud sync",
  ];

  const premiumFeatures = [
    "Unlimited pipes and tobacco blends",
    "Unlimited notes and photos",
    "Cellar tracking and aging logs",
    "Smoking logs and history",
    "Pipe maintenance and condition tracking",
    "Advanced filters and sorting",
    "Manual pipe ↔ tobacco pairings",
    "Tobacco library sync",
    "Multilingual support (10 languages)",
    "Cloud sync across devices",
  ];

  const proFeatures = [
    "Everything in Premium",
    "AI Updates (Pro for new users starting Feb 1, 2026)",
    "AI Identification tools (Pro for new users starting Feb 1, 2026)",
    "Advanced analytics & insights",
    "Bulk editing tools",
    "Export & reports (CSV / PDF)",
    "Collection optimization tools",
    "Early access to new advanced features",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#e8d5b7]">{t("subscription.title")}</h1>

        <SubscriptionManagerButton variant="secondary" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-[#e8d5b7]">Free</CardTitle>
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
            <CardTitle className="text-[#e8d5b7]">Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureList items={premiumFeatures} />
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
            <FeatureList items={proFeatures} />
            <div className="mt-4">
              <Button className="w-full" onClick={openSubscription}>
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