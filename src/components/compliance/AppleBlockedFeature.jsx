// components/compliance/AppleBlockedFeature.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function AppleBlockedFeature({
  title,
  message,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("appleBlocked.defaultTitle", "Not available on iOS");
  const resolvedMessage = message ?? t("appleBlocked.defaultMessage", "This iOS build is a Collection & Cellar Manager. Recommendation and usage-guidance features are not included.");
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="bg-[#243548]/60 border border-[#A35C5C]/35">
        <CardHeader>
          <CardTitle className="text-[#E0D8C8]">{resolvedTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#E0D8C8]/80 text-sm space-y-3">
          <p>{resolvedMessage}</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => window.location.replace("/Home")}>{t("appleBlocked.goHome", "Home")}</Button>
            <Button variant="outline" onClick={() => window.location.replace("/Tobacco")}>
              {t("appleBlocked.goCellar", "Go to Cellar")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}