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
        <h1 className="text-3xl font-bold text-[#e8d5b7]">{t("appleSupport.title", "Support")}</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          {t("appleSupport.subtitle", "Help for collection and cellar inventory management.")}
        </p>
      </div>
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("appleSupport.beforeContactTitle", "Before you contact support")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("appleSupport.checkAccount", "Confirm you are signed in to the correct account.")}</li>
            <li>{t("appleSupport.restartApp", "Close and reopen the app, then try again.")}</li>
            <li>{t("appleSupport.checkConnection", "Check your internet connection.")}</li>
            <li>{t("appleSupport.screenshots", "Take screenshots of the issue if possible.")}</li>
          </ul>
        </CardContent>
      </Card>
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("appleSupport.includeInMessageTitle", "What to include in your message")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("appleSupport.deviceModel", "Device model and iOS version")}</li>
            <li>{t("appleSupport.whatPage", "What page you were on (Pipes, Cellar, Profile, etc.)")}</li>
            <li>{t("appleSupport.stepsToReproduce", "Steps to reproduce the issue")}</li>
            <li>{t("appleSupport.screenshotsRecommended", "Screenshots (recommended)")}</li>
          </ul>
        </CardContent>
      </Card>
      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("appleSupport.aboutBuildTitle", "About the iOS build")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-2">
          <p>{t("appleSupport.aboutBuildBody", "This iOS build is designed for collection and cellar inventory management. Features that could be interpreted as recommendation or usage guidance are not included in this version.")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Support() {
  if (isAppleBuild) return <AppleSupport />;
  return <SupportFull />;
}