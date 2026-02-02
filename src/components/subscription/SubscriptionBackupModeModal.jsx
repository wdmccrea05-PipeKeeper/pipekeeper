import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionBackupModeModal({ isOpen, onClose, user }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState("premium");
  const [selectedTerm, setSelectedTerm] = useState("monthly");
  const [paymentReference, setPaymentReference] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [premiumMonthly, premiumAnnual, proMonthly, proAnnual, supportEmail] = await Promise.all([
        base44.functions.invoke("getRemoteConfig", { key: "STRIPE_CHECKOUT_PREMIUM_MONTHLY_URL" }).then(r => r.data?.value || ""),
        base44.functions.invoke("getRemoteConfig", { key: "STRIPE_CHECKOUT_PREMIUM_ANNUAL_URL" }).then(r => r.data?.value || ""),
        base44.functions.invoke("getRemoteConfig", { key: "STRIPE_CHECKOUT_PRO_MONTHLY_URL" }).then(r => r.data?.value || ""),
        base44.functions.invoke("getRemoteConfig", { key: "STRIPE_CHECKOUT_PRO_ANNUAL_URL" }).then(r => r.data?.value || ""),
        base44.functions.invoke("getRemoteConfig", { key: "SUBSCRIPTION_SUPPORT_EMAIL" }).then(r => r.data?.value || "admin@pipekeeperapp.com"),
      ]);
      
      setConfig({
        checkoutPremiumMonthly: premiumMonthly,
        checkoutPremiumAnnual: premiumAnnual,
        checkoutProMonthly: proMonthly,
        checkoutProAnnual: proAnnual,
        supportEmail: supportEmail,
      });
    } catch (err) {
      console.error("[SubscriptionBackupModeModal] Failed to load config:", err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const getCheckoutUrl = (tier, term) => {
    if (!config) return "";

    const key = `checkout${
      tier === "premium" ? "Premium" : "Pro"
    }${term === "monthly" ? "Monthly" : "Annual"}`;
    const url = config[key];
    console.log(`[SubscriptionBackupModeModal] Getting checkout URL for ${tier}/${term}: ${url}`);
    return url || "";
  };

  const handleOpenCheckout = (tier, term) => {
    const url = getCheckoutUrl(tier, term);
    if (!url) {
      toast.error("Checkout URL not configured. Please contact support.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRequestUnlock = async () => {
    if (!user?.email) {
      toast.error("Unable to identify user email");
      return;
    }

    try {
      setSubmitting(true);

      const checkoutUrl = getCheckoutUrl(selectedTier, selectedTerm);

      await base44.entities.SubscriptionSupportRequest.create({
        user_email: user.email,
        requested_tier: selectedTier,
        requested_term: selectedTerm,
        checkout_url_used: checkoutUrl || null,
        status: "paid_confirmed",
        user_message: userMessage.trim() || null,
        payment_reference: paymentReference.trim() || null,
      });

      setSubmitted(true);
      toast.success("Request sent! We'll unlock your account ASAP.");

      // Auto-close after 2 seconds
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("[SubscriptionBackupModeModal] Request creation failed:", err);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#1A2B3A] border-[#A35C5C]/50">
          <CardContent className="pt-6 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-[#A35C5C] animate-spin" />
            <span className="text-[#E0D8C8]">Loading checkout options...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#1A2B3A] border-green-500/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#E0D8C8] mb-2">Request Sent!</h3>
                <p className="text-sm text-[#E0D8C8]/70">
                  We'll review your payment proof and unlock your account ASAP.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full bg-[#1A2B3A] border-[#A35C5C]/50 my-8">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl text-[#E0D8C8]">Subscription Backup Mode</CardTitle>
              <p className="text-sm text-[#E0D8C8]/70 mt-2">
                Subscription management is temporarily unavailable. Use direct checkout links or request manual unlock.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#E0D8C8]/50 hover:text-[#E0D8C8] transition-colors"
            >
              ✕
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Checkout Links Section */}
          <div>
            <h3 className="font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              New Subscription? Use Direct Checkout
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => handleOpenCheckout("premium", "monthly")}
                variant="outline"
                className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Premium Monthly</span>
                  <span className="text-xs text-[#E0D8C8]/60">$1.99/mo</span>
                </div>
              </Button>

              <Button
                onClick={() => handleOpenCheckout("premium", "annual")}
                variant="outline"
                className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Premium Annual</span>
                  <span className="text-xs text-[#E0D8C8]/60">$19.99/yr</span>
                </div>
              </Button>

              <Button
                onClick={() => handleOpenCheckout("pro", "monthly")}
                variant="outline"
                className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Pro Monthly</span>
                  <span className="text-xs text-[#E0D8C8]/60">$2.99/mo</span>
                </div>
              </Button>

              <Button
                onClick={() => handleOpenCheckout("pro", "annual")}
                variant="outline"
                className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold">Pro Annual</span>
                  <span className="text-xs text-[#E0D8C8]/60">$29.99/yr</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Payment Proof Section */}
          <div className="border-t border-[#A35C5C]/20 pt-6">
            <h3 className="font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Already Paid? Request Manual Unlock
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  Subscription Tier
                </label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  Billing Term
                </label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  Payment Proof (Optional)
                </label>
                <Input
                  placeholder="Receipt email, invoice #, Stripe payment ID, or last 4 digits of card"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40"
                />
                <p className="text-xs text-[#E0D8C8]/50 mt-1">
                  Helps us verify your payment quickly
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  Message (Optional)
                </label>
                <Textarea
                  placeholder="Tell us about your situation or payment details..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40 min-h-20"
                />
              </div>

              <Button
                onClick={handleRequestUnlock}
                disabled={submitting}
                className="w-full bg-[#A35C5C] hover:bg-[#8F4E4E] text-[#F3EBDD]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Request Unlock"
                )}
              </Button>
            </div>
          </div>

          {/* Support Info */}
          <div className="bg-[#243548]/50 border border-[#A35C5C]/20 rounded-lg p-4 text-sm text-[#E0D8C8]/70">
            <p>
              Need help? Contact{" "}
              <a
                href={`mailto:${config?.supportEmail || "admin@pipekeeperapp.com"}`}
                className="text-[#A35C5C] hover:underline font-medium"
              >
                {config?.supportEmail || "admin@pipekeeperapp.com"}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}