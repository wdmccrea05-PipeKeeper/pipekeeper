import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { getStripeConfig } from "@/components/subscription/stripeConfig";

const SUPPORT_EMAIL = "admin@pipekeeperapp.com";

export default function SubscriptionBackupModeModal({ isOpen, onClose, user }) {
  const { t } = useTranslation();
  const [selectedTerm, setSelectedTerm] = useState("monthly");
  const [paymentReference, setPaymentReference] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Derive available plans from canonical Stripe config — no hardcoded links
  const availablePlans = useMemo(() => {
    try {
      const config = getStripeConfig();
      return {
        monthly: config?.pipekeeper_pro_monthly?.isAvailable
          ? config.pipekeeper_pro_monthly
          : null,
        annual: config?.pipekeeper_pro_annual?.isAvailable
          ? config.pipekeeper_pro_annual
          : null,
      };
    } catch {
      return { monthly: null, annual: null };
    }
  }, []);

  const hasAnyPlan = Boolean(availablePlans.monthly || availablePlans.annual);

  const handleRequestReview = async () => {
    if (!user?.email) {
      toast.error(t("subscriptionBackup.unableToIdentify"));
      return;
    }

    try {
      setSubmitting(true);

      await base44.entities.SubscriptionSupportRequest.create({
        user_email: user.email,
        requested_tier: "pro",
        requested_term: selectedTerm,
        checkout_url_used: null,
        status: "manual_review_requested",
        user_message: userMessage.trim() || null,
        payment_reference: paymentReference.trim() || null,
      });

      setSubmitted(true);
      toast.success(t("subscriptionBackup.requestSent"));

      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("[SubscriptionBackupModeModal] Request creation failed:", err);
      toast.error(t("subscriptionBackup.failedToSend"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
                <h3 className="text-lg font-semibold text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.requestSentTitle")}
                </h3>
                <p className="text-sm text-[#E0D8C8]/70">
                  {t("subscriptionBackup.reviewPayment")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <Card className="max-w-2xl w-full bg-[#1A2B3A] border-[#A35C5C]/50 my-8 sm:my-0">
        <CardHeader className="pt-6 sm:pt-8 px-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl text-[#E0D8C8]">
                {t("subscriptionBackup.title")}
              </CardTitle>
              <p className="text-xs sm:text-sm text-[#E0D8C8]/70 mt-2">
                {t("subscriptionBackup.description")}
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

        <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
          {/* Plans unavailable notice */}
          {!hasAnyPlan && (
            <div className="rounded-lg bg-[#A35C5C]/10 border border-[#A35C5C]/30 px-4 py-3 text-sm text-[#E0D8C8]/80">
              Direct checkout is not available right now. Use the form below to request manual access review, or email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-[#D4A574]">
                {SUPPORT_EMAIL}
              </a>
              .
            </div>
          )}

          {/* Manual review form */}
          <div>
            <h3 className="font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t("subscriptionBackup.alreadyPaid")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.billingTerm")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["monthly", "annual"]).map((term) => {
                    const plan = availablePlans[term];
                    const disabled = !plan;
                    return (
                      <Button
                        key={term}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => !disabled && setSelectedTerm(term)}
                        className="border-[#A35C5C]/30 text-[#E0D8C8]"
                        style={{
                          background:
                            selectedTerm === term ? "rgba(163,92,92,0.22)" : "transparent",
                          opacity: disabled ? 0.4 : 1,
                        }}
                      >
                        {term === "monthly"
                          ? t("subscriptionBackup.monthly")
                          : t("subscriptionBackup.annual")}
                        {plan && (
                          <span className="ml-1 text-xs text-[#E0D8C8]/60">
                            {plan.displayPrice}{plan.displayPeriod}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.paymentProof")}
                </label>
                <Input
                  placeholder={t("subscriptionBackup.paymentProofPlaceholder")}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40"
                />
                <p className="text-xs text-[#E0D8C8]/50 mt-1">
                  {t("subscriptionBackup.helpsVerify")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.message")}
                </label>
                <Textarea
                  placeholder={t("subscriptionBackup.messagePlaceholder")}
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] placeholder:text-[#E0D8C8]/40 min-h-20"
                />
              </div>

              <Button
                onClick={handleRequestReview}
                disabled={submitting}
                className="w-full bg-[#A35C5C] hover:bg-[#8F4E4E] text-[#F3EBDD]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("subscriptionBackup.sending")}
                  </>
                ) : (
                  t("subscriptionBackup.submitRequest")
                )}
              </Button>

              <p className="text-xs text-[#E0D8C8]/50 text-center">
                Our team will review your request and activate access manually.
                Contact{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-[#D4A574]">
                  {SUPPORT_EMAIL}
                </a>{" "}
                for urgent issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}