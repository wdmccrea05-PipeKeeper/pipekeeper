import React from "react";
import SubscriptionFull from "./SubscriptionFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

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
  const proLaunchDateLabel = "February 1, 2026";

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

  const openSubscription = () => {
    if (isAppleBuild && window?.webkit?.messageHandlers?.pipekeeper) {
      // Apple subscription sheet should list available tiers.
      window.webkit.messageHandlers.pipekeeper.postMessage({ action: "openSubscription" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">Subscription</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          This iOS build focuses on collection and cellar inventory management.
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Free Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeatureList items={freeFeatures} />
          <p className="text-xs text-[#e8d5b7]/60">
            Already have more than the Free limits? You&apos;ll keep everything you&apos;ve added — Free limits only apply when adding new items.
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Premium Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeatureList items={premiumFeatures} />
          <div className="pt-2">
            <Button
              className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
              onClick={openSubscription}
            >
              Upgrade to Premium
            </Button>
            <p className="text-xs text-[#e8d5b7]/60 mt-2">
              Premium features vary by platform and plan.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Pro Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeatureList items={proFeatures} />
          <div className="text-xs text-[#e8d5b7]/60 space-y-1">
            <p>
              PipeKeeper Pro is active starting <b>{proLaunchDateLabel}</b>.
            </p>
            <p>
              If you subscribed to Premium before {proLaunchDateLabel}, you keep AI Updates and AI Identification tools.
            </p>
          </div>
          <div className="pt-2">
            <Button
              className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
              onClick={openSubscription}
            >
              Upgrade to Pro
            </Button>
            <p className="text-xs text-[#e8d5b7]/60 mt-2">
              Pro tiers and pricing are managed through Apple in-app purchase.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Why is iOS different?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#e8d5b7]/80 space-y-2">
          <p>
            The iOS build is intentionally designed for collection and cellar inventory management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Subscription() {
  if (isAppleBuild) return <AppleSubscription />;
  return <SubscriptionFull />;
}