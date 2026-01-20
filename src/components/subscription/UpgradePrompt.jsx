// src/components/subscription/UpgradePrompt.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { shouldShowPurchaseUI, getPremiumGateMessage } from "@/components/utils/companion";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function UpgradePrompt({ featureName, description }) {
  return (
    <Card className="border-[#A35C5C]/50 bg-[#243548]/70" variant="default">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#A35C5C]/20 border border-[#A35C5C]/40">
            <Lock className="w-5 h-5 text-[#E0D8C8]" />
          </span>
          <span className="text-[#E0D8C8]">Premium Feature</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold text-[#E0D8C8] mb-1">{featureName}</p>
          <p className="text-sm text-[#E0D8C8]/70">{description}</p>
        </div>

        {shouldShowPurchaseUI() ? (
          <>
            <a href={createPageUrl("Subscription")}>
              <Button className="w-full bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] hover:from-[#8B4A4A] hover:to-[#7A3E3E] text-[#E0D8C8]">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </a>
            <p className="text-xs text-center text-[#E0D8C8]/60">
              Unlock premium tools and advanced analytics
            </p>
          </>
        ) : (
          <p className="text-sm text-[#E0D8C8]/70">{getPremiumGateMessage()}</p>
        )}
      </CardContent>
    </Card>
  );
}