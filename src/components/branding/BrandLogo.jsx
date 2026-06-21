import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  getModuleAsset,
  getAssetImageStyle,
} from "@/components/branding/moduleAssets";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function BrandLogo({
  className,
  imageClassName,
  showWordmark = true,
  compact = false,
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  const asset = getModuleAsset("collectionkeeper");
  const sizeClass = compact ? "w-8 h-8" : "w-12 h-12";
  const hasSrc = asset?.src && asset.src !== '/favicon.ico';

  const logoNode = (failed || !hasSrc) ? (
    <div
      className={cn(
        "flex items-center justify-center rounded-md flex-shrink-0",
        sizeClass,
        imageClassName
      )}
      style={{
        background:
          "linear-gradient(135deg, rgba(180,140,75,0.22), rgba(120,90,55,0.28))",
        border: "1px solid rgba(180,140,75,0.35)",
        color: "#F5E7C8",
        fontFamily: "'Georgia', serif",
        fontWeight: 700,
        letterSpacing: "-0.01em",
      }}
      aria-label={t("auto.components_branding_BrandLogo.collectionkeeper_1ukoz8")}
      title={t("auto.components_branding_BrandLogo.collectionkeeper_1ukoz8")}
    >
      CK
    </div>
  ) : (
    <img
      src={asset.src}
      alt={t("auto.components_branding_BrandLogo.collectionkeeper_1ukoz8")}
      className={cn(
        "object-contain flex-shrink-0 select-none bg-transparent",
        sizeClass,
        imageClassName
      )}
      style={getAssetImageStyle("collectionkeeper", compact ? "small" : "regular")}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );

  if (!showWordmark) {
    return (
      <div className={cn("flex items-center justify-center bg-transparent", className)}>
        {logoNode}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-0 bg-transparent", className)}>
      {logoNode}
      <span
        className="font-semibold whitespace-nowrap leading-none truncate hidden sm:inline"
        style={{
          color: "#F5F1E7",
          fontFamily: "'Georgia', serif",
        }}
      >
        {t("auto.components_branding_BrandLogo.collectionkeeper_1ukoz8")}
      </span>
    </div>
  );
}