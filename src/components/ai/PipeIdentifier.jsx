import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function AIPipeIdentifier() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t("tobacconist.identificationTitle", "AI Pipe Identifier")}
      </h3>

      <p className="opacity-70">
        {t(
          "tobacconist.identificationSubtitle",
          "Upload photos to identify and add pipes instantly"
        )}
      </p>

      <div className="flex gap-4">
        <button className="btn">
          {t("common.uploadPhotos", "Upload Photos")}
        </button>

        <button className="btn">
          {t("common.takePhoto", "Take Photo")}
        </button>
      </div>
    </div>
  );
}
