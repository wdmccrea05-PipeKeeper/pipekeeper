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
  const premiumFeatures = [
    "Unlimited pipes and cellar inventory items",
    "Inventory Tools: category standardization and metadata cleanup",
    "Photo documentation and notes for each item",
    "Advanced search, filters, and tag organization",
    "Exportable inventory reports for documentation (where available)",
    "Priority customer support",
  ];

  const freeFeatures = [
    "Add and manage a personal pipe collection",
    "Track cellar inventory quantities and jar dates",
    "Basic search and filters",
    "Notes and photos for documentation",
  ];

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
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">Premium Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeatureList items={premiumFeatures} />

          <div className="pt-2">
            <Button className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]">
              Upgrade to Premium
            </Button>
            <p className="text-xs text-[#e8d5b7]/60 mt-2">
              Premium features vary by platform and plan. This iOS build does not include recommendation or usage-guidance features.
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
            The iOS build is intentionally designed for collection and cellar inventory management. Some features available
            on other platforms are not included in this version.
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