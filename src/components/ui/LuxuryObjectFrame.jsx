import React from "react";
import { cn } from "@/lib/utils";

/**
 * LuxuryObjectFrame — Premium object framing system for collection images
 * Makes photos appear as displayed objects rather than embedded images
 * 
 * Features:
 * - Soft vignette fade around edges
 * - Subtle shadow under the object
 * - Slightly brighter lighting around object center
 * - Darker edge gradient behind the object
 * 
 * @param {string} src - Image URL
 * @param {string} alt - Alt text
 * @param {string} aspectRatio - "16/9" | "4/3" | "1/1" | "3/4"
 * @param {string} objectFit - "contain" | "cover"
 * @param {string} className - Additional classes
 */
export default function LuxuryObjectFrame({ 
  src, 
  alt = "", 
  aspectRatio = "16/9", 
  objectFit = "cover",
  className,
  fallback,
  style = {}
}) {
  const aspectClass = {
    "16/9": "aspect-[16/9]",
    "4/3": "aspect-[4/3]",
    "1/1": "aspect-square",
    "3/4": "aspect-[3/4]",
  }[aspectRatio] || "aspect-[16/9]";

  return (
    <div 
      className={cn("relative overflow-hidden", aspectClass, className)}
      style={{
        background: "linear-gradient(145deg, rgba(25, 18, 12, 0.95), rgba(20, 14, 10, 0.98))",
        ...style
      }}
    >
      {src ? (
        <>
          {/* Main object image */}
          <img 
            src={src} 
            alt={alt} 
            loading="lazy"
            className={cn(
              "w-full h-full relative z-10",
              objectFit === "contain" ? "object-contain p-4" : "object-cover"
            )}
            style={{
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
            }}
          />

          {/* Pedestal spotlight — warm glow beneath object */}
          <div
            className="absolute inset-0 pointer-events-none z-5"
            style={{
              background: `radial-gradient(ellipse 50% 35% at 50% 70%, rgba(180,140,75,0.1) 0%, rgba(180,140,75,0.04) 40%, transparent 75%)`,
            }}
          />

          {/* Center object highlight */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,255,255,0.08) 0%, transparent 65%)`,
            }}
          />

          {/* Vignette fade */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: `radial-gradient(ellipse 85% 85% at 50% 50%, transparent 40%, rgba(18,12,8,0.4) 75%, rgba(12,8,5,0.7) 100%)`,
            }}
          />

          {/* Bottom shadow under object */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/4 pointer-events-none z-5"
            style={{
              background: `linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)`,
            }}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {fallback}
        </div>
      )}
    </div>
  );
}

/**
 * FramedHeroImage — Full-bleed hero image with luxury object framing
 * Used for highlight cards and story cards
 */
export function FramedHeroImage({ 
  src, 
  alt = "", 
  rotation = "12deg",
  className 
}) {
  if (!src) return null;

  return (
    <div
      className={cn("absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden", className)}
      style={{ width: "55%" }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute"
        style={{
          right: "-8%",
          top: "50%",
          transform: `translateY(-50%) rotate(${rotation})`,
          height: "115%",
          maxWidth: "none",
          width: "auto",
          objectFit: "contain",
          filter: `drop-shadow(0 0 24px rgba(180,140,75,0.5)) drop-shadow(0 8px 20px rgba(0,0,0,0.7))`,
        }}
      />
      
      {/* Spotlight on object */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 50% 50% at 65% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)`,
        }}
      />
      
      {/* Fade left edge smoothly */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, rgba(28, 18, 10, 0.98) 0%, rgba(28, 18, 10, 0.6) 35%, transparent 70%)",
        }}
      />
    </div>
  );
}