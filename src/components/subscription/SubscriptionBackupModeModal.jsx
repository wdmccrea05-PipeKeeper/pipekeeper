import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SubscriptionBackupModeModal({ isOpen, onClose, user }) {
  const { t } = useTranslation();
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
      setConfig({
        supportEmail: "admin@pipekeeperapp.com",
      });
    } catch (err) {
      console.error("[SubscriptionBackupModeModal] Failed to load config:", err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const getStripePaymentLink = (tier, term) => {
    const links = {
      premium_monthly: "https://buy.stripe.com/6oU5kD6txgpV5WD6Zjgbm03",
      premium_annual: "https://buy.stripe.com/fZudR94lpa1x0Cj4Rbgbm04",
      pro_monthly: "https://buy.stripe.com/dRm14n2dhgpV5WD97rgbm01",
      pro_annual: "https://buy.stripe.com/bJefZh4lp1v198P6Zjgbm02",
    };
    return links[`${tier}_${term}`] || "";
  };

  const handleRequestUnlock = async () => {
    if (!user?.email) {
      toast.error(t("subscriptionBackup.unableToIdentify","Unable to identify user email"));
      return;
    }

    try {
      setSubmitting(true);

      const checkoutUrl = getStripePaymentLink(selectedTier, selectedTerm);

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
      toast.success(t("subscriptionBackup.requestSent","Request sent! We'll unlock your account ASAP."));

      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("[SubscriptionBackupModeModal] Request creation failed:", err);
      toast.error(t("subscriptionBackup.failedToSend","Failed to send request. Please try again."));
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
            <span className="text-[#E0D8C8]">{t("subscriptionBackup.loadingOptions","Loading checkout options...")}</span>
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
                <h3 className="text-lg font-semibold text-[#E0D8C8] mb-2">{t("subscriptionBackup.requestSentTitle","Request Sent!")}</h3>
                <p className="text-sm text-[#E0D8C8]/70">
                  {t("subscriptionBackup.reviewPayment","We'll review your payment proof and unlock your account ASAP.")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <Card className="max-w-2xl w-full bg-[#1A2B3A] border-[#A35C5C]/50 my-8 sm:my-0">
        <CardHeader className="pt-6 sm:pt-8 px-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl text-[#E0D8C8]">{t("subscriptionBackup.title","Subscription Backup Mode")}</CardTitle>
              <p className="text-xs sm:text-sm text-[#E0D8C8]/70 mt-2">
                {t("subscriptionBackup.description","Subscription management is temporarily unavailable. Use direct checkout links or request manual unlock.")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#E0D8C8]/50 hover:text-[#E0D8C8] transition-colors flex-shrink-0 mt-1"
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
              {t("subscriptionBackup.newSubscription","New Subscription? Use Direct Checkout")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={getStripePaymentLink("premium", "monthly")}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center w-full"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{t("subscriptionBackup.premiumMonthly","Premium Monthly")}</span>
                    <span className="text-xs text-[#E0D8C8]/60">{t("subscriptionBackup.premiumMonthlyPrice","$1.99/mo")}</span>
                  </div>
                </Button>
              </a>

              <a
                href={getStripePaymentLink("premium", "annual")}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center w-full"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{t("subscriptionBackup.premiumAnnual","Premium Annual")}</span>
                    <span className="text-xs text-[#E0D8C8]/60">{t("subscriptionBackup.premiumAnnualPrice","$19.99/yr")}</span>
                  </div>
                </Button>
              </a>

              <a
                href={getStripePaymentLink("pro", "monthly")}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center w-full"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{t("subscriptionBackup.proMonthly","Pro Monthly")}</span>
                    <span className="text-xs text-[#E0D8C8]/60">{t("subscriptionBackup.proMonthlyPrice","$2.99/mo")}</span>
                  </div>
                </Button>
              </a>

              <a
                href={getStripePaymentLink("pro", "annual")}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center w-full"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{t("subscriptionBackup.proAnnual","Pro Annual")}</span>
                    <span className="text-xs text-[#E0D8C8]/60">{t("subscriptionBackup.proAnnualPrice","$29.99/yr")}</span>
                  </div>
                </Button>
              </a>
            </div>
          </div>

          {/* Payment Proof Section */}
          <div className="border-t border-[#A35C5C]/20 pt-6">
            <h3 className="font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t("subscriptionBackup.alreadyPaid","Already Paid? Request Manual Unlock")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionSupport.subscriptionTier","Subscription Tier")}
                </label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">{t("subscriptionSupport.premium","Premium")}</SelectItem>
                    <SelectItem value="pro">{t("subscriptionSupport.pro","Pro")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.billingTerm","Billing Term")}
                </label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("subscriptionBackup.monthly","Monthly")}</SelectItem>
                    <SelectItem value="annual">{t("subscriptionBackup.annual","Annual")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.paymentProof","Payment Proof (Optional)")}
                </label>
                <Input
                  placeholder={t("subscriptionBackup.paymentProofPlaceholder","Receipt email, invoice #, Stripe payment ID, or last 4 digits of card")}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40"
                />
                <p className="text-xs text-[#E0D8C8]/50 mt-1">
                  {t("subscriptionBackup.helpsVerify","Helps us verify your payment quickly")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.message","Message (Optional)")}
                </label>
                <Textarea
                  placeholder={t("subscriptionBackup.messagePlaceholder","Tell us about your situation or payment details...")}
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
                    {t("subscriptionBackup.sending","Sending...")}
                  </>
                ) : (
                  t("subscriptionBackup.requestUnlock","Request Unlock")
                )}
              </Button>
            </div>
          </div>

          {/* Support Info */}
          <div className="bg-[#243548]/50 border border-[#A35C5C]/20 rounded-lg p-4 text-sm text-[#E0D8C8]/70">
            <p>
              {t("subscriptionBackup.needHelp","Need help? Contact")}{" "}
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