import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  isIOSCompanion, 
  openAppleManageSubscriptions, 
  startApplePurchaseFlow 
} from "@/components/utils/nativeIAPBridge";

export default function SubscriptionProviderCard({ me }) {
  const qc = useQueryClient();
  const ios = isIOSCompanion();

  const { data: summary, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ["subscription-summary", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const result = await base44.functions.invoke("getMySubscriptionSummary", {});
      if (result.data?.ok === false) {
        throw new Error(result.data.message || result.data.error || "Failed to fetch subscription");
      }
      return result.data;
    },
    staleTime: 30_000,
    retry: 1
  });

  const [showSwitch, setShowSwitch] = useState(false);
  const [switchTier, setSwitchTier] = useState("premium");
  const [doubleBillAck, setDoubleBillAck] = useState(false);
  const [error, setError] = useState(null);

  const openStripePortal = () => {
    const url = summary?.manageUrl || summary?.manage_url;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setError("Unable to open Stripe portal. Please contact support.");
    }
  };

  const manageApple = () => {
    openAppleManageSubscriptions();
  };

  const continueApplePurchase = () => {
    if (!doubleBillAck) {
      setError("Please confirm you understand you may be billed twice if your web subscription is still active.");
      return;
    }
    setError(null);
    startApplePurchaseFlow(switchTier);
  };

  if (isLoading) {
    return (
      <Card className="border-[#A35C5C]/30">
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-[#E0D8C8]" />
        </CardContent>
      </Card>
    );
  }

  if (fetchError || (!summary?.ok && summary !== undefined)) {
    return (
      <Card className="border-[#A35C5C]/30">
        <CardContent className="p-6 space-y-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {fetchError?.message || summary?.error || "Failed to load subscription information"}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { paid, provider, tier, status, can_switch_to_apple, warning } = summary || {};

  const providerColors = {
    stripe: "bg-[#635BFF] text-white",
    apple: "bg-black text-white",
    unknown: "bg-gray-600 text-white",
    none: "bg-gray-400 text-white"
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    canceled: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
    none: "bg-gray-100 text-gray-800"
  };

  return (
    <Card className="border-[#A35C5C]/30">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#E0D8C8]">Subscription Management</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={providerColors[provider]}>
                {provider === "stripe" ? "Stripe" : provider === "apple" ? "Apple" : provider}
              </Badge>
              <Badge variant="outline" className={statusColors[status]}>
                {status}
              </Badge>
              {tier && tier !== "premium" && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                  {tier.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {(error || warning) && (
          <Alert variant={error ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || warning}</AlertDescription>
          </Alert>
        )}

        {provider === "apple" && ios && (
          <Button onClick={manageApple} className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage in Apple Subscriptions
          </Button>
        )}

        {provider === "stripe" && (
          <div className="space-y-3">
            <Button onClick={openStripePortal} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage on Web
            </Button>

            {can_switch_to_apple && (
              <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#E0D8C8]">
                    Switch to Apple Billing (Optional)
                  </div>
                  <Switch checked={showSwitch} onCheckedChange={setShowSwitch} />
                </div>

                {showSwitch && (
                  <div className="space-y-3 text-sm">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Apple subscriptions are separate from web subscriptions. To avoid double billing, 
                        cancel your web subscription first, then purchase through Apple.
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#E0D8C8]">Tier:</label>
                      <select
                        className="flex-1 border border-white/20 rounded px-3 py-2 bg-[#1A2B3A] text-[#E0D8C8]"
                        value={switchTier}
                        onChange={(e) => setSwitchTier(e.target.value)}
                      >
                        <option value="premium">Premium</option>
                        <option value="pro">Pro</option>
                      </select>
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doubleBillAck}
                        onChange={(e) => setDoubleBillAck(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-xs text-[#E0D8C8]/80">
                        I understand that if my web subscription is still active, starting an Apple 
                        subscription may cause double billing.
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={openStripePortal}
                        className="flex-1"
                      >
                        Open Web Management
                      </Button>
                      <Button 
                        onClick={continueApplePurchase}
                        className="flex-1"
                      >
                        Continue to Apple Purchase
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {provider === "none" && (
          <div className="space-y-3">
            <p className="text-sm text-[#E0D8C8]/70">No active subscription found.</p>
            {ios ? (
              <div className="flex gap-2">
                <Button onClick={() => startApplePurchaseFlow("premium")} className="flex-1">
                  Buy Premium (Apple)
                </Button>
                <Button onClick={() => startApplePurchaseFlow("pro")} className="flex-1">
                  Buy Pro (Apple)
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[#E0D8C8]/70">
                Visit the Subscription page to start a plan.
              </p>
            )}
          </div>
        )}

        {provider === "unknown" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You have an active subscription, but provider information is unavailable. 
              Please contact support.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}