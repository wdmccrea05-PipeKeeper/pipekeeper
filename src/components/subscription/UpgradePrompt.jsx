import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { shouldShowPurchaseUI, getPremiumGateMessage } from "@/components/utils/companion";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function UpgradePrompt({ featureName, description }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Premium Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold mb-1">{featureName}</p>
          <p className="text-sm text-[#E0D8C8]/70">{description}</p>
        </div>
        {shouldShowPurchaseUI() ? (
          <>
            <a href={createPageUrl("Subscription")}>
              <Button>
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </a>
            <p className="text-xs text-center text-[#E0D8C8]/60">
              Unlock all AI-powered features and advanced analytics
            </p>
          </>
        ) : (
          <p className="text-sm text-[#E0D8C8]/70">
            {getPremiumGateMessage()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}