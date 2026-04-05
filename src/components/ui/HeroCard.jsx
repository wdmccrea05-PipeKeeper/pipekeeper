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
        background: `linear-gradient(155deg, rgba(54, 38, 25, 0.90), rgba(42, 29, 19, 0.97))`,
        border: `1px solid rgba(120, 90, 65, 0.38)`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(180,140,100,0.14), inset 0 -3px 4px rgba(0,0,0,0.28)`,
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
              ? "blur(24px) brightness(0.28) saturate(0.65) sepia(0.22)"
              : "blur(22px) brightness(0.22) saturate(0.55) sepia(0.2)",
            opacity: 0.92,
            transform: "scale(1.12)",
          }}
        />
      )}

      {/* Layer 2: Hero image spotlight with luxury object framing */}
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
              filter: `drop-shadow(0 0 26px ${accent}90) drop-shadow(0 8px 20px rgba(0,0,0,0.75))`,
            }}
          />
          
          {/* Object spotlight glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 45% 50% at 65% 50%, rgba(255,255,255,0.07) 0%, transparent 65%)`,
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
      )}

      {/* Layer 3: Directional gradient overlay for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: (bgImage || heroImage)
            ? `linear-gradient(to right, rgba(28, 18, 10, 0.92) 0%, rgba(28, 18, 10, 0.72) 45%, rgba(28, 18, 10, 0.28) 75%, transparent 100%)`
            : `linear-gradient(145deg, rgba(35, 22, 15, 0.72) 0%, rgba(28, 18, 10, 0.52) 45%, transparent 100%)`,
        }}
      />

      {/* Layer 4: Bottom scrim for legibility */}
      {(bgImage || heroImage) && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "58%",
            background: "linear-gradient(to top, rgba(20, 12, 8, 0.75) 0%, rgba(20, 12, 8, 0.35) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Layer 5: Grain texture overlay */}
      <GrainTexture accent={accent} />

      {/* Layer 6: Ambient corner glow */}
      <div
        className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(180, 140, 75, 0.15) 0%, transparent 70%)`,
          transform: "translate(30%, 30%)",
        }}
      />

      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(180, 140, 75, 0.5) 35%, rgba(180, 140, 75, 0.6) 50%, rgba(180, 140, 75, 0.5) 65%, transparent 100%)`,
          boxShadow: `0 0 4px rgba(180, 140, 75, 0.3)`,
        }}
      />

      {/* Main content */}
      <div className="relative p-4 sm:p-6 pb-3 sm:pb-4 flex flex-col gap-3 sm:gap-4 flex-1">
        {/* Icon badge */}
        {Icon && (
          <div
            className="hidden sm:flex rounded-2xl items-center justify-center shrink-0"
            style={{
              width: "3.5rem",
              height: "3.5rem",
              background: `linear-gradient(135deg, rgba(100, 70, 45, 0.48) 0%, rgba(80, 55, 35, 0.58) 100%)`,
              border: `1px solid rgba(120, 90, 65, 0.45)`,
              boxShadow: `0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180, 140, 100, 0.2)`,
            }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: "rgba(180, 140, 75, 1)", filter: `drop-shadow(0 0 5px rgba(180, 140, 75, 0.75))` }}
            />
          </div>
        )}

        {/* Text hierarchy */}
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-bold leading-tight"
            style={{ 
              color: `rgba(180, 140, 75, 0.95)`,
              whiteSpace: "normal",
              wordWrap: "break-word",
              hyphens: "none"
            }}
          >
            {title}
          </div>
          <div
            className="text-2xl sm:text-[2.25rem] font-extrabold leading-tight tracking-tight line-clamp-2"
            style={{
              color: "#F5F1E7",
              textShadow: `0 2px 10px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.95)`,
              WebkitTextStroke: "0.4px rgba(255,255,255,0.12)",
              fontFamily: "'Georgia', serif",
              whiteSpace: "normal",
              wordWrap: "break-word",
              hyphens: "none"
            }}
          >
            {value ?? "—"}
          </div>
          {sub && (
            <div
              className="text-xs leading-snug pt-0.5 font-semibold"
              style={{ 
                color: `rgba(180, 140, 75, 0.88)`,
                textShadow: "0 1px 2px rgba(0,0,0,0.6)"
              }}
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
        "relative rounded-2xl overflow-hidden flex flex-col gap-3 p-5 min-h-[110px]",
        className
      )}
      style={{
        background: `linear-gradient(145deg, rgba(52, 37, 24, 0.82), rgba(42, 30, 20, 0.92))`,
        border: `1px solid rgba(120, 90, 65, 0.32)`,
        boxShadow: `0 3px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 2px rgba(0,0,0,0.25)`,
        minWidth: "140px"
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
            filter: "blur(14px) brightness(0.2) saturate(0.5) sepia(0.15)",
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
            ? `linear-gradient(145deg, rgba(35, 25, 18, 0.95) 0%, rgba(30, 20, 15, 0.88) 55%, transparent 100%)`
            : `linear-gradient(145deg, transparent 0%, transparent 60%, rgba(40, 30, 20, 0.15) 100%)`,
        }}
      />

      {/* Grain texture */}
      <GrainTexture accent={accent} />

      {/* Corner glow accents */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(180, 140, 75, 0.12) 0%, transparent 70%)`,
          transform: "translate(35%, -35%)",
        }}
      />

      {/* Content */}
      <div className="relative flex items-center gap-3 min-w-0 flex-wrap">
         <div
           className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{
             background: `linear-gradient(135deg, rgba(100, 70, 45, 0.48) 0%, rgba(80, 55, 35, 0.58) 100%)`,
             border: `1px solid rgba(120, 90, 65, 0.45)`,
             boxShadow: `0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180, 140, 100, 0.2)`,
           }}
         >
           <Icon className="w-4 h-4" style={{ color: "rgba(180, 140, 75, 1)", filter: `drop-shadow(0 0 4px rgba(180, 140, 75, 0.7))` }} />
         </div>
         <span 
           className="text-[10px] sm:text-[11px] uppercase tracking-[0.05em] sm:tracking-[0.1em] font-semibold leading-tight break-words" 
           style={{ 
             color: "rgba(180, 140, 75, 0.85)",
             whiteSpace: "normal",
             overflow: "break-word"
           }}
         >
           {label}
         </span>
       </div>

      <div className="relative w-full min-w-0">
         <div
           className="font-bold leading-snug tracking-tight"
           style={{ 
             color: "#F5F1E7", 
             textShadow: `0 2px 6px rgba(0,0,0,0.75)`,
             fontFamily: "'Georgia', serif",
             fontSize: "clamp(1.25rem, 2.8vw, 1.875rem)",
             whiteSpace: "nowrap",
             overflow: "hidden",
             textOverflow: "ellipsis",
             fontVariantNumeric: "tabular-nums",
           }}
           title={typeof value === 'string' ? value : undefined}
         >
           {value}
         </div>
         {sub && (
           <div className="text-xs mt-1.5 font-medium" style={{ 
             color: `rgba(180, 140, 75, 0.75)`,
             whiteSpace: "nowrap",
             overflow: "hidden",
             textOverflow: "ellipsis",
           }}>
             {sub}
           </div>
         )}
       </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, rgba(120, 90, 65, 0.35), transparent)` }}
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
  pipe: "#B48C4B",      // Aged brass
  tobacco: "#5A7C5A",   // Forest green
  value: "#B4824B",     // Walnut gold
  activity: "#8B6F4A",  // Leather brown
  streak: "#9B6B5F",    // Burgundy brown
  general: "#8B7B6B",   // Charcoal brown
};