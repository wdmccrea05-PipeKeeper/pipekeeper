import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";

export default function UpgradePrompt({ featureName, description }) {
  return (
    <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Lock className="w-5 h-5" />
          Premium Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold text-stone-800 mb-1">{featureName}</p>
          <p className="text-sm text-stone-600">{description}</p>
        </div>
        <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800">
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to Premium
        </Button>
        <p className="text-xs text-center text-stone-500">
          Unlock all AI-powered features and advanced analytics
        </p>
      </CardContent>
    </Card>
  );
}