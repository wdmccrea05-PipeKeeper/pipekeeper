import React from "react";
import InviteFull from "./InviteFull";
import { isAppleBuild } from "@/components/utils/appVariant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";

function AppleInvite() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">{t("invite.title")}</h1>
        <p className="text-sm text-[#e8d5b7]/70 mt-2">
          {t("invite.apple.description")}
        </p>
      </div>

      <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7]">{t("invite.apple.whatTheyCanDo")}</CardTitle>
        </CardHeader>
        <CardContent className="text-[#e8d5b7]/80 text-sm space-y-3">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("invite.apple.feature1")}</li>
            <li>{t("invite.apple.feature2")}</li>
            <li>{t("invite.apple.feature3")}</li>
            <li>{t("invite.apple.feature4")}</li>
          </ul>

          <p className="text-[#e8d5b7]/70">
            {t("invite.apple.note")}
          </p>

          <div className="pt-2">
            <Button onClick={() => window.location.replace(createPageUrl("Home"))}>
              {t("invite.apple.returnHome")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Invite() {
  if (isAppleBuild) return <AppleInvite />;
  return <InviteFull />;
}