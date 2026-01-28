import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  isIOSCompanion, 
  openAppleManageSubscriptions, 
  startApplePurchaseFlow 
} from "@/components/utils/nativeIAPBridge";
import { pickPrimarySubscription } from "@/components/utils/subscriptionUtils";

export default function SubscriptionProviderCard({ me }) {
  const ios = isIOSCompanion();
  const preferProvider = ios ? "apple" : "stripe";

  const { data: subs } = useQuery({
    queryKey: ["my-subscriptions", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      try {
        const rows = await base44.entities.Subscription.filter({ user_id: me.id });
        return rows || [];
      } catch (e) {
        console.error("[SubscriptionProviderCard] Failed to fetch subscriptions:", e);
        return [];
      }
    },
  });

  const primary = useMemo(() => pickPrimarySubscription(subs, preferProvider), [subs, preferProvider]);

  const provider = primary?.provider || (me?.subscription_level === "paid" ? "unknown" : "none");
  const status = primary?.status || me?.subscription_status || "none";
  const tier = primary?.tier || "premium";

  const [showSwitch, setShowSwitch] = useState(false);
  const [switchTier, setSwitchTier] = useState("premium");
  const [doubleBillAck, setDoubleBillAck] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const openStripePortal = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await base44.functions.invoke("createCustomerPortalSession", {});
      const data = result.data;
      
      if (!data?.ok || !data?.url) {
        setError(data?.error || "Unable to open Stripe portal.");
        return;
      }
      
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e?.message || "Failed to open Stripe portal");
    } finally {
      setLoading(false);
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
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
            <Button onClick={openStripePortal} disabled={loading} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              {loading ? "Opening..." : "Manage on Web (Stripe Portal)"}
            </Button>

            {ios && (
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
                        cancel your web subscription first (or wait until it ends), then purchase through Apple.
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
                        disabled={loading}
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
              You have an active subscription, but the provider information is not available. 
              Please contact support if you need assistance.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}