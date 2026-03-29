import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { SUBSCRIPTION_LINKS } from "@/components/config/subscriptionLinks";

export default function SubscriptionBackupModeModal({ isOpen, onClose, user }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier] = useState("pro");
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

  const availableLinks = useMemo(
    () => ({
      monthly: SUBSCRIPTION_LINKS.pipekeeper_monthly || "",
      annual: SUBSCRIPTION_LINKS.pipekeeper_annual || "",
    }),
    []
  );

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

  const getConfiguredPaymentLink = (term) => {
    return availableLinks[term] || "";
  };

  const handleRequestUnlock = async () => {
    if (!user?.email) {
      toast.error(t("subscriptionBackup.unableToIdentify"));
      return;
    }

    try {
      setSubmitting(true);

      const checkoutUrl = getConfiguredPaymentLink(selectedTerm);

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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#1A2B3A] border-[#A35C5C]/50">
          <CardContent className="pt-6 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-[#A35C5C] animate-spin" />
            <span className="text-[#E0D8C8]">{t("subscriptionBackup.loadingOptions")}</span>
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

  const hasMonthlyLink = Boolean(availableLinks.monthly);
  const hasAnnualLink = Boolean(availableLinks.annual);

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

        <CardContent className="space-y-8">
          {(hasMonthlyLink || hasAnnualLink) && (
            <div>
              <h3 className="font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {t("subscriptionBackup.newSubscription")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hasMonthlyLink && (
                  <a
                    href={availableLinks.monthly}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      variant="outline"
                      className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center w-full"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">{t("subscriptionBackup.proMonthly")}</span>
                        <span className="text-xs text-[#E0D8C8]/60">
                          {t("subscriptionBackup.proMonthlyPrice")}
                        </span>
                      </div>
                    </Button>
                  </a>
                )}

                {hasAnnualLink && (
                  <a
                    href={availableLinks.annual}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      variant="outline"
                      className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 h-auto py-3 text-center w-full"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold">{t("subscriptionBackup.proAnnual")}</span>
                        <span className="text-xs text-[#E0D8C8]/60">
                          {t("subscriptionBackup.proAnnualPrice")}
                        </span>
                      </div>
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}

          <div className={hasMonthlyLink || hasAnnualLink ? "border-t border-[#A35C5C]/20 pt-6" : ""}>
            <h3 className="font-semibold text-[#E0D8C8] mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t("subscriptionBackup.alreadyPaid")}
            </h3>

            {!hasMonthlyLink && !hasAnnualLink && (
              <p className="text-sm text-[#E0D8C8]/70 mb-4">
                Direct backup checkout links are not configured in this build. Use this form to request access review, or contact{" "}
                <a
                  href={`mailto:${config?.supportEmail || 'admin@pipekeeperapp.com'}`}
                  className="underline text-[#D4A574]"
                >
                  {config?.supportEmail || 'admin@pipekeeperapp.com'}
                </a>.
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">
                  {t("subscriptionBackup.billingTerm")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedTerm("monthly")}
                    className="border-[#A35C5C]/30 text-[#E0D8C8]"
                    style={{
                      background:
                        selectedTerm === "monthly" ? "rgba(163,92,92,0.22)" : "transparent",
                    }}
                  >
                    {t("subscriptionBackup.monthly")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedTerm("annual")}
                    className="border-[#A35C5C]/30 text-[#E0D8C8]"
                    style={{
                      background:
                        selectedTerm === "annual" ? "rgba(163,92,92,0.22)" : "transparent",
                    }}
                  >
                    {t("subscriptionBackup.annual")}
                  </Button>
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
                onClick={handleRequestUnlock}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}