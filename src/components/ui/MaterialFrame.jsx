import React from "react";
import { cn } from "@/lib/utils";

/**
 * MaterialFrame — Leather tray-style content section wrapper
 * Creates visual hierarchy by making content groups feel like objects placed on a collector's desk
 * 
 * Usage:
 * Wrap major content sections on Home, Insights, Community, Profile pages
 * Examples: Recent Items, Favorites, Community Lists, Settings Groups
 * 
 * Properties:
 * - Soft depth shadow
 * - Subtle inner gradient
 * - Restrained border highlight
 * - Warm matte leather surface
 */
export default function MaterialFrame({ children, className, noPadding = false }) {
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden",
        !noPadding && "p-6",
        className
      )}
      style={{
        background: "linear-gradient(145deg, rgba(48, 34, 22, 0.75), rgba(38, 26, 18, 0.88))",
        border: "1px solid rgba(120, 90, 65, 0.32)",
        boxShadow: `
          0 3px 10px rgba(0,0,0,0.6),
          inset 0 1px 0 rgba(180,140,100,0.12),
          inset 0 -2px 3px rgba(0,0,0,0.25)
        `,
      }}
    >
      {/* Subtle leather grain texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(80, 60, 40, 0.035) 3px,
              rgba(80, 60, 40, 0.035) 4px
            )
          `
        }}
      />
      
      <div className="relative">
        {children}
      </div>
    </div>
  );
}