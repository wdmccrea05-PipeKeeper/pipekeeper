import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SubscriptionCancelled() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1A2B3A] border border-[#A35C5C]/50 rounded-2xl p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <XCircle className="w-12 h-12 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">
          {t("subscriptionCancelled.title")}
        </h1>
        <p className="text-[#E0D8C8]/70 text-center mb-6">
          {t("subscriptionCancelled.message")}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(createPageUrl("Subscription"))}
          >
            {t("subscriptionCancelled.backToPlans")}
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate(createPageUrl("Home"))}
          >
            {t("nav.home")}
          </Button>
        </div>
      </div>
    </div>
  );
}