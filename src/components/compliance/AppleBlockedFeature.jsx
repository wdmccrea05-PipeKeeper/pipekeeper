import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useNavigate } from "@/components/utils/navigation";

export default function AppleBlockedFeature({
  title,
  message,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resolvedTitle = title ?? t("appleBlocked.defaultTitle");
  const resolvedMessage = message ?? t("appleBlocked.defaultMessage");
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="bg-[#243548]/60 border border-[#A35C5C]/35">
        <CardHeader>
          <CardTitle className="text-[#E0D8C8]">{resolvedTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#E0D8C8]/80 text-sm space-y-3">
          <p>{resolvedMessage}</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => navigate("/Home", { replace: true })}>{t("appleBlocked.goHome")}</Button>
            <Button variant="outline" onClick={() => navigate("/Tobacco", { replace: true })}>
              {t("appleBlocked.goCellar")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}