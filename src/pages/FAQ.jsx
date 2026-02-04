import React from "react";
import FAQFull from "./FAQFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

function AppleFAQ() {
  const { t } = useTranslation();
  const proLaunchDateLabel = "February 1, 2026";

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">{t("faqExtended.appleTitle")}</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          {t("faqExtended.appleDesc")}
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("faqExtended.whatIsApp")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            {t("faqExtended.whatIsAppAnswer")}
          </p>
          <p>{t("faqExtended.notRecommendations")}</p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("faqExtended.whatCanDo")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("faqExtended.whatCanDoList1")}</li>
            <li>{t("faqExtended.whatCanDoList2")}</li>
            <li>{t("faqExtended.whatCanDoList3")}</li>
            <li>{t("faqExtended.whatCanDoList4")}</li>
            <li>{t("faqExtended.whatCanDoList5")}</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("faqExtended.whyMissingFeatures")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            {t("faqExtended.whyMissingFeaturesAnswer")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("faqExtended.whatAreTiers")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>{t("subscription.free")}:</b> {t("faqExtended.freeTierDesc")}
            </li>
            <li>
              <b>{t("subscription.premium")}:</b> {t("faqExtended.premiumTierDesc")}
            </li>
            <li>
              <b>{t("subscription.pro")}:</b> {t("faqExtended.proTierDesc", { date: proLaunchDateLabel })}
            </li>
          </ul>
          <p className="text-[#e8d5b7]/70">
            {t("faqExtended.earlySubscriberNote", { date: proLaunchDateLabel })}
          </p>
        </CardContent>
      </Card>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("faqExtended.howGetSupport")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>
            {t("faqExtended.howGetSupportAnswer")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FAQ() {
  if (isAppleBuild) return <AppleFAQ />;
  return <FAQFull />;
}