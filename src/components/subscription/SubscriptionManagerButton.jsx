import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isAppleBuild } from "@/components/utils/appVariant";
import { getBillingConfig } from "@/components/utils/billingConfig";
import PaymentLinksModal from "./PaymentLinksModal";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const PORTAL_TIMEOUT_MS = 10000;

export default function SubscriptionManagerButton({ variant = "default", className = "" }) {
  const [loading, setLoading] = useState(false);
  const [showPaymentLinks, setShowPaymentLinks] = useState(false);
  const [billingConfig, setBillingConfig] = useState(null);
  const { user } = useCurrentUser();
  const isApple = isAppleBuild;

  const handleAppleSubscriptions = () => {
    window.open(APPLE_SUBSCRIPTIONS_URL, "_blank");
  };

  const handleContactSupport = () => {
    const email = billingConfig?.supportEmail || "admin@pipekeeperapp.com";
    const mailto = `mailto:${email}?subject=${encodeURIComponent(
      "PipeKeeper Subscription Help"
    )}&body=${encodeURIComponent(
      `Hi PipeKeeper Support,

I need help with my subscription.

Apple ID email: 
App email: ${user?.email || ""}
Request: 

Thanks!`
    )}`;
    window.location.href = mailto;
  };

  const openStripePortalWithTimeout = async () => {
    return Promise.race([
      base44.functions.invoke("createCustomerPortalSession", {}),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Portal timeout")), PORTAL_TIMEOUT_MS)
      ),
    ]);
  };

  const handleWebAndroidManage = async () => {
    setLoading(true);

    try {
      const config = await getBillingConfig();
      setBillingConfig(config);

      // If Stripe portal is disabled, go straight to payment links
      if (!config.stripePortalEnabled) {
        setShowPaymentLinks(true);
        setLoading(false);
        return;
      }

      // Try Stripe portal with timeout
      try {
        const response = await openStripePortalWithTimeout();
        
        if (response?.data?.url) {
          window.location.href = response.data.url;
        } else {
          throw new Error("No portal URL returned");
        }
      } catch (portalError) {
        console.error("[SubscriptionManager] Stripe portal failed:", {
          email: user?.email,
          error: portalError?.message || portalError,
          timestamp: new Date().toISOString(),
        });

        toast.error("Subscription management is temporarily unavailable.");
        setShowPaymentLinks(true);
      }
    } catch (error) {
      console.error("[SubscriptionManager] Config fetch failed:", error);
      toast.error("Failed to load subscription options.");
    } finally {
      setLoading(false);
    }
  };

  if (isApple) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleAppleSubscriptions}
          disabled={loading}
          variant={variant}
          className={className}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Manage Subscription
        </Button>
        <Button
          onClick={handleContactSupport}
          variant="outline"
          className="border-[#A35C5C]/50 text-[#E0D8C8] hover:bg-[#A35C5C]/20"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={handleWebAndroidManage}
        disabled={loading}
        variant={variant}
        className={className}
      >
        {loading ? "Loading..." : "Manage Subscription"}
      </Button>

      {billingConfig && (
        <PaymentLinksModal
          isOpen={showPaymentLinks}
          onClose={() => setShowPaymentLinks(false)}
          config={billingConfig}
          userEmail={user?.email}
        />
      )}
    </>
  );
}