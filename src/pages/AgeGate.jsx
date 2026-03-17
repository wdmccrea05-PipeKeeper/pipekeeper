// src/pages/AgeGate.jsx
import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function AgeGate({ onConfirm }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0d1b2a] to-[#070b10] p-6">
      <Card className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
        <CardHeader className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg"
            alt="CollectionKeeper"
            className="mx-auto mb-1 w-20 h-20 object-contain"
          />
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <ShieldAlert className="h-5 w-5 text-white/80" />
          </div>

          <CardTitle className="text-xl text-white">
            {t("ageGate.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-center">
          <p className="text-white/80">
            {t("ageGate.intendedForAdults")}
          </p>

          <p className="text-white/60 text-sm">
            {t("ageGate.disclaimer")}
          </p>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full bg-[#8b3a3a] hover:bg-[#9b4343] text-white"
            onClick={onConfirm}
          >
            {t("ageGate.confirmAge")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}