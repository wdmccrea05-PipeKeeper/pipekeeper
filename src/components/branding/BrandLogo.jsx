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
        "object-contain flex-shrink-0 select-none",
        sizeClass,
        imageClassName
      )}
      style={{
        background: "none",
        backgroundColor: "transparent",
        border: "none",
        outline: "none",
        boxShadow: "none",
        filter: compact ? "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.28))",
      }}
      draggable={false}
    />
  );

  if (!showWordmark) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ background: "none" }}>
        {logoNode}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)} style={{ background: "none" }}>
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