import React from "react";
import SupportFull from "./SupportFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/components/i18n/safeTranslation";

function AppleSupport() {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">{t("appleSupport.title")}</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          {t("appleSupport.subtitle")}
        </p>
      </div>
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("appleSupport.beforeContactTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("appleSupport.checkAccount")}</li>
            <li>{t("appleSupport.restartApp")}</li>
            <li>{t("appleSupport.checkConnection")}</li>
            <li>{t("appleSupport.screenshots")}</li>
          </ul>
        </CardContent>
      </Card>
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("appleSupport.includeInMessageTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("appleSupport.deviceModel")}</li>
            <li>{t("appleSupport.whatPage")}</li>
            <li>{t("appleSupport.stepsToReproduce")}</li>
            <li>{t("appleSupport.screenshotsRecommended")}</li>
          </ul>
        </CardContent>
      </Card>
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("appleSupport.aboutBuildTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>{t("appleSupport.aboutBuildBody")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Support() {
  if (isAppleBuild) return <AppleSupport />;
  return <SupportFull />;
}