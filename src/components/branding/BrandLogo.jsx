import React from "react";
import { cn } from "@/lib/utils";
import {
  getModuleAsset,
  getAssetImageStyle,
} from "@/components/branding/moduleAssets";

export default function BrandLogo({
  className,
  imageClassName,
  showWordmark = true,
  compact = false,
}) {
  const asset = getModuleAsset("collectionKeeper");
  const sizeClass = compact ? "w-8 h-8" : "w-12 h-12";

  const logoNode = (
    <img
      src={asset.src}
      alt="CollectionKeeper"
      className={cn(
        "object-contain flex-shrink-0 bg-transparent select-none",
        sizeClass,
        imageClassName
      )}
      style={getAssetImageStyle("collectionKeeper", compact ? "small" : "regular")}
      draggable={false}
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
        className="font-semibold whitespace-nowrap leading-none truncate"
        style={{
          color: "#F5F1E7",
          fontFamily: "'Georgia', serif",
        }}
      >
        CollectionKeeper
      </span>
    </div>
  );
}