import React from "react";
import { cn } from "@/lib/utils";

/**
 * HeroCard — Rich visual card with full-bleed imagery, layered textures, and category-specific styling
 * Used for highlight items (Most Smoked Pipe, Favorite Blend, Most Valuable Pipe, etc.)
 * 
 * @param {string} title - Card category label
 * @param {string} value - Primary display value (item name, stat)
 * @param {string} sub - Secondary detail text
 * @param {string} accent - Hex color for category theming
 * @param {Component} icon - Lucide icon component
 * @param {string} heroImage - Full-resolution item photo for foreground spotlight
 * @param {string} bgImage - Blurred ambient background image
 * @param {string} silhouetteType - "pipe" | "leaf" | null - determines texture and watermark
 * @param {Function} onClick - Optional click handler
 * @param {string} className - Additional CSS classes
 */
export function HeroCard({
  title,
  value,
  sub,
  accent = "#C87941",
  icon,
  heroImage,
  bgImage,
  silhouetteType,
  onClick,
  className,
  children,
}) {
  const Icon = icon;
  const heroRotation = silhouetteType === "pipe" ? "12deg" : "-8deg";

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[200px] transition-all duration-300",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      style={{
        background: `linear-gradient(155deg, #1a2535 0%, #0e1520 45%, ${accent}28 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `0 0 0 1px ${accent}22, 0 12px 40px -8px ${accent}50, 0 4px 12px rgba(0,0,0,0.5)`,
      }}
      onClick={onClick}
    >
      {/* Layer 1: Blurred background image */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: heroImage
              ? "blur(22px) brightness(0.26) saturate(0.6)"
              : "blur(20px) brightness(0.22) saturate(0.5)",
            opacity: 0.95,
            transform: "scale(1.12)",
          }}
        />
      )}

      {/* Layer 2: Hero image spotlight (if provided) */}
      {heroImage && (
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
          style={{ width: "55%" }}
        >
          <img
            src={heroImage}
            alt=""
            loading="lazy"
            className="absolute"
            style={{
              right: "-8%",
              top: "50%",
              transform: `translateY(-50%) rotate(${heroRotation})`,
              height: "115%",
              maxWidth: "none",
              width: "auto",
              objectFit: "contain",
              filter: `drop-shadow(0 0 22px ${accent}80) drop-shadow(0 6px 14px rgba(0,0,0,0.65))`,
            }}
          />
          {/* Fade left edge smoothly */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(10,17,28,1) 0%, rgba(10,17,28,0.42) 38%, transparent 72%)",
            }}
          />
        </div>
      )}

      {/* Layer 3: Directional gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: (bgImage || heroImage)
            ? `linear-gradient(to right, rgba(14,21,32,0.92) 0%, rgba(14,21,32,0.72) 45%, rgba(14,21,32,0.28) 75%, transparent 100%)`
            : `linear-gradient(155deg, rgba(14,21,32,0.72) 0%, rgba(14,21,32,0.52) 45%, ${accent}22 100%)`,
        }}
      />

      {/* Layer 4: Bottom scrim for legibility */}
      {(bgImage || heroImage) && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "58%",
            background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Layer 5: Grain texture overlay */}
      <GrainTexture accent={accent} />

      {/* Layer 6: Ambient corner glow */}
      <div
        className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          transform: "translate(30%, 30%)",
        }}
      />

      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ee 35%, ${accent}ff 50%, ${accent}ee 65%, ${accent}00 100%)`,
          boxShadow: `0 0 8px ${accent}cc`,
        }}
      />

      {/* Main content */}
      <div className="relative p-5 pb-3 flex flex-col gap-4 flex-1">
        {/* Icon badge */}
        {Icon && (
          <div
            className="rounded-2xl flex items-center justify-center shrink-0"
            style={{
              width: "3.25rem",
              height: "3.25rem",
              background: `linear-gradient(135deg, ${accent}50 0%, ${accent}28 100%)`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 18px ${accent}50, inset 0 1px 0 ${accent}40`,
            }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent}cc)` }}
            />
          </div>
        )}

        {/* Text hierarchy */}
        <div className="space-y-1.5">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-bold"
            style={{ color: `${accent}ee` }}
          >
            {title}
          </div>
          <div
            className="text-[2.1rem] font-extrabold leading-tight tracking-tight"
            style={{
              color: "#F5F1E7",
              textShadow: `0 2px 10px rgba(0,0,0,0.80), 0 0 28px ${accent}65, 0 0 52px ${accent}28`,
              WebkitTextStroke: "0.4px rgba(255,255,255,0.15)",
            }}
          >
            {value ?? "—"}
          </div>
          {sub && (
            <div
              className="text-xs leading-snug pt-0.5 font-semibold"
              style={{ color: `${accent}cc` }}
            >
              {sub}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

/**
 * StatusCard — Analytics/stat card with blurred background imagery
 * Used for metrics like Total Sessions, Collection Value, etc.
 */
export function StatusCard({
  icon,
  label,
  value,
  accent = "#4A7C9C",
  sub,
  bgImage,
  className,
}) {
  const Icon = icon;
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden flex flex-col gap-3 p-4 min-h-[100px]",
        className
      )}
      style={{
        background: `linear-gradient(145deg, #1a2535 0%, #111a25 62%, ${accent}28 100%)`,
        border: `1px solid ${accent}50`,
        boxShadow: `0 0 0 1px ${accent}20, 0 4px 24px -4px ${accent}38`,
      }}
    >
      {/* Blurred collection image background */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(14px) brightness(0.15) saturate(0.42)",
            opacity: 0.90,
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: bgImage
            ? `linear-gradient(145deg, rgba(26,37,53,0.97) 0%, rgba(17,26,37,0.90) 55%, ${accent}28 100%)`
            : `linear-gradient(145deg, transparent 0%, transparent 60%, ${accent}10 100%)`,
        }}
      />

      {/* Grain texture */}
      <GrainTexture accent={accent} />

      {/* Corner glow accents */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}35 0%, transparent 70%)`,
          transform: "translate(35%, -35%)",
        }}
      />

      {/* Content */}
      <div className="relative flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}40 0%, ${accent}20 100%)`,
            border: `1px solid ${accent}50`,
            boxShadow: `0 0 14px ${accent}35, inset 0 1px 0 ${accent}30`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent}cc)` }} />
        </div>
        <span className="text-[11px] text-[#E0D8C8]/55 uppercase tracking-[0.09em] font-semibold leading-tight">
          {label}
        </span>
      </div>

      <div className="relative">
        <div
          className="text-3xl font-bold leading-none tracking-tight"
          style={{ color: "#F5F1E7", textShadow: `0 0 20px ${accent}40` }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] mt-1" style={{ color: `${accent}99` }}>
            {sub}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }}
      />
    </div>
  );
}

/**
 * GrainTexture — Subtle film grain overlay for premium feel
 */
function GrainTexture({ accent = "#4A7C9C" }) {
  const patternId = `grain-${accent.replace("#", "")}`;
  
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={patternId} x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="13" r="0.48" fill={accent} fillOpacity="0.075" />
          <circle cx="23" cy="5" r="0.32" fill={accent} fillOpacity="0.055" />
          <circle cx="42" cy="19" r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="58" cy="8" r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="74" cy="25" r="0.44" fill={accent} fillOpacity="0.06" />
          <circle cx="92" cy="11" r="0.34" fill={accent} fillOpacity="0.07" />
          <circle cx="105" cy="30" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="14" cy="39" r="0.38" fill={accent} fillOpacity="0.065" />
          <circle cx="34" cy="45" r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="55" cy="52" r="0.34" fill={accent} fillOpacity="0.075" />
          <circle cx="77" cy="41" r="0.52" fill={accent} fillOpacity="0.065" />
          <circle cx="96" cy="58" r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="111" cy="47" r="0.30" fill={accent} fillOpacity="0.075" />
          <circle cx="7" cy="65" r="0.48" fill={accent} fillOpacity="0.065" />
          <circle cx="28" cy="72" r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="49" cy="80" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="68" cy="67" r="0.34" fill={accent} fillOpacity="0.065" />
          <circle cx="88" cy="85" r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="103" cy="74" r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="17" cy="95" r="0.48" fill={accent} fillOpacity="0.065" />
          <circle cx="39" cy="103" r="0.34" fill={accent} fillOpacity="0.06" />
          <circle cx="62" cy="110" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="85" cy="98" r="0.38" fill={accent} fillOpacity="0.065" />
          <circle cx="108" cy="115" r="0.48" fill={accent} fillOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/**
 * Category color constants for consistent theming
 */
export const CATEGORY_COLORS = {
  pipe: "#C87941",      // Warm copper / ember glow
  tobacco: "#4A7C59",   // Olive / green glow
  value: "#C4963A",     // Gold / amber
  activity: "#22D3EE",  // Cyan
  streak: "#8B5CF6",    // Violet
  general: "#4A7C9C",   // Default blue-gray
};