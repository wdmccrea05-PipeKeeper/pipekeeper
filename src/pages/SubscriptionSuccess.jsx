import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { getEntitlementTier } from "@/components/utils/premiumAccess";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function pickBestSubscription(subs = []) {
  const valid = subs.filter((s) => {
    const status = String(s?.status || "").toLowerCase();
    return ["active", "trialing", "trial", "past_due", "incomplete"].includes(status);
  });

  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    const aPro = (a?.tier || "").toLowerCase() === "pro" ? 1 : 0;
    const bPro = (b?.tier || "").toLowerCase() === "pro" ? 1 : 0;
    if (aPro !== bPro) return bPro - aPro;

    const aActive = a?.status === "active" ? 1 : 0;
    const bActive = b?.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const aDate = new Date(a?.current_period_start || a?.created_date || 0).getTime();
    const bDate = new Date(b?.current_period_start || b?.created_date || 0).getTime();
    return bDate - aDate;
  });

  return valid[0];
}

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("loading");
  const [secondsRemaining, setSecondsRemaining] = useState(90);

  useEffect(() => {
    let refreshCount = 0;
    const maxRefreshes = 18;

    const refreshEntitlements = async () => {
      try {
        refreshCount++;

        await base44.functions.invoke("syncSubscriptionForMe", {}).catch(() => null);

        const authUser = await base44.auth.me().catch(() => null);
        const userId = authUser?.id || authUser?.auth_user_id || null;
        const email = authUser?.email ? normEmail(authUser.email) : null;

        let subs = [];
        if (userId) {
          subs = await base44.entities.Subscription.filter({ user_id: userId }).catch(() => []);
        }
        if (subs.length === 0 && email) {
          subs = await base44.entities.Subscription.filter({ user_email: email }).catch(() => []);
        }

        const bestSub = pickBestSubscription(subs);
        const tier = getEntitlementTier(authUser, bestSub);

        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription-status"] });

        if (tier !== "free") {
          setStatus("success");
          return;
        }

        if (refreshCount >= maxRefreshes) {
          setStatus("timeout");
        }
      } catch (err) {
        if (import.meta?.env?.DEV) {
          console.warn("Failed to refresh entitlements:", err);
        }
        if (refreshCount >= maxRefreshes) {
          setStatus("timeout");
        }
      }
    };

    refreshEntitlements();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 5));
      refreshEntitlements();
    }, 5000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1A2B3A] border border-[#A35C5C]/50 rounded-2xl p-8 shadow-xl">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-6">
              <Loader2 className="w-12 h-12 text-[#A35C5C] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">{t("subscriptionSuccess.processing","Processing Your Subscription")}</h1>
            <p className="text-[#E0D8C8]/70 text-center mb-6">
              {t("subscriptionSuccess.confirming","Thanks! We're confirming your subscription and unlocking your features.")}
            </p>
            <p className="text-sm text-[#E0D8C8]/50 text-center">
              {t("subscriptionSuccess.autoRefresh","Auto-refresh")}: {secondsRemaining}s {t("subscriptionSuccess.remaining","remaining")}...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">{t("subscriptionSuccess.welcome","Welcome!")}</h1>
            <p className="text-[#E0D8C8]/70 text-center mb-6">{t("subscriptionSuccess.activeMessage","Your subscription is active. Premium/Pro features are now available.")}</p>
            <Button className="w-full" onClick={() => navigate(createPageUrl("Home"))}>
              {t("nav.goHome","Go to Home")}
            </Button>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="flex justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">{t("subscriptionSuccess.pending","Subscription Pending")}</h1>
            <p className="text-[#E0D8C8]/70 text-center mb-4">
              {t("subscriptionSuccess.receivedMessage","Your subscription was received. Features may take a few minutes to unlock.")}
            </p>
            <p className="text-sm text-[#E0D8C8]/50 text-center mb-6">
              {t("subscriptionSuccess.supportNote","If your features don't unlock within 2 minutes, please contact support.")}
            </p>
            <Button className="w-full" onClick={() => navigate(createPageUrl("Home"))}>
              {t("common.continue","Continue")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}