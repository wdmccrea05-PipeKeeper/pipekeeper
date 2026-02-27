import React from 'react';
import SubscriptionE2ETest from "@/components/debug/SubscriptionE2ETest";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function SubscriptionE2ETestPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-6">
      <div className="max-w-4xl mx-auto">
        <a href={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("subscriptionTest.backToHome")}
          </Button>
        </a>

        <h1 className="text-3xl font-bold text-[#e8d5b7] mb-6">
          {t("subscriptionTest.heading")}
        </h1>

        <p className="text-[#e8d5b7]/70 mb-6">
          {t("subscriptionTest.description")}
        </p>

        <SubscriptionE2ETest />

        <div className="mt-8 bg-slate-800 text-white rounded-lg p-6 text-sm space-y-2">
          <h3 className="font-semibold text-lg mb-3">{t("subscriptionTest.coverageTitle")}</h3>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>{t("subscriptionTest.hookIntegrity")}</li>
            <li>{t("subscriptionTest.tierResolution")}</li>
            <li>{t("subscriptionTest.accessFlags")}</li>
            <li>{t("subscriptionTest.entitlements")}</li>
            <li>{t("subscriptionTest.limitCheck")}</li>
            <li>{t("subscriptionTest.premiumAccess")}</li>
            <li>{t("subscriptionTest.proAccess")}</li>
            <li>{t("subscriptionTest.providerDetection")}</li>
            <li>{t("subscriptionTest.planLabel")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}