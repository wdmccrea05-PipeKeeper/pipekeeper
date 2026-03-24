import React from "react";
import { cn } from "@/lib/utils";

/**
 * Heritage Design System - Core Surface Components
 * Replaces old blue SaaS panels with warm collector aesthetic
 */

// Base heritage card surface
export function HeritageCard({ children, className, style, accent, withTexture = true, onClick, ...rest }) {
  return (
    <div
      className={cn("relative rounded-lg overflow-hidden", className)}
      onClick={onClick}
      style={{
        background: "linear-gradient(145deg, rgba(48, 34, 22, 0.75), rgba(38, 26, 18, 0.88))",
        border: "1px solid rgba(120, 90, 65, 0.32)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)",
        ...style,
      }}
      {...rest}
    >
      {withTexture && <WoodGrainTexture accent={accent || "#B48C4B"} />}
      <div className="relative">{children}</div>
    </div>
  );
}

// Heritage stat/metric card
export function HeritageStatCard({ icon: Icon, label, value, accent = "#B48C4B", className }) {
  return (
    <div
      className={cn("rounded-lg p-5", className)}
      style={{
        background: "linear-gradient(145deg, rgba(52, 37, 24, 0.68), rgba(44, 31, 21, 0.80))",
        border: "1px solid rgba(120, 90, 65, 0.28)",
        boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1), inset 0 -1px 2px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-11 h-11 flex items-center justify-center rounded-lg shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))",
            border: "1px solid rgba(120, 90, 65, 0.4)",
            boxShadow: "0 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180, 140, 100, 0.18)",
          }}
        >
          {Icon && <Icon className="w-4 h-4" style={{ color: accent, filter: `drop-shadow(0 0 2px ${accent}50)` }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div 
            className="text-2xl font-bold mb-1.5" 
            style={{ 
              color: "#F5F1E7",
              textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              fontFamily: "'Georgia', serif"
            }}
          >
            {value}
          </div>
          <div 
            className="text-xs uppercase tracking-[0.08em] font-medium" 
            style={{ color: "rgba(180, 140, 75, 0.75)" }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

// Heritage section header
export function HeritageSection({ title, children, className }) {
  return (
    <div className={cn("space-y-4", className)}>
      <h2
        className="text-sm uppercase tracking-[0.12em] font-semibold"
        style={{ color: "rgba(180, 140, 75, 0.8)", fontFamily: "'Georgia', serif" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// Heritage action button
export function HeritageButton({ children, onClick, href, variant = "primary", className, icon: Icon }) {
  const baseStyles = {
    primary: {
      background: "linear-gradient(135deg, rgba(100, 70, 45, 0.7), rgba(80, 55, 35, 0.8))",
      border: "1px solid rgba(120, 90, 65, 0.5)",
      color: "#F5F1E7",
      boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.15)",
    },
    secondary: {
      background: "rgba(50, 35, 22, 0.4)",
      border: "1px solid rgba(120, 90, 65, 0.25)",
      color: "rgba(224, 216, 200, 0.9)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    },
    ghost: {
      background: "transparent",
      border: "1px solid transparent",
      color: "rgba(224, 216, 200, 0.7)",
    },
  };

  const Component = href ? "a" : "button";
  const props = href ? { href } : { onClick };

  return (
    <Component
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 hover:opacity-90 active:scale-95",
        className
      )}
      style={baseStyles[variant]}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </Component>
  );
}

// Wood grain texture overlay
function WoodGrainTexture({ accent = "#B48C4B", opacity = 0.08 }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`woodgrain-${accent.replace("#", "")}`} x="0" y="0" width="200" height="26" patternUnits="userSpaceOnUse">
          <path d="M0,4 C40,3 80,5 120,4 S175,3 200,4" stroke={accent} strokeWidth="0.5" fill="none" strokeOpacity={opacity} />
          <path d="M0,11 C50,10 90,12 140,11 S180,10 200,11" stroke={accent} strokeWidth="0.35" fill="none" strokeOpacity={opacity * 0.7} />
          <path d="M0,18 C35,17 75,19 115,18 S170,17 200,18" stroke={accent} strokeWidth="0.45" fill="none" strokeOpacity={opacity * 0.85} />
          <path d="M0,24 C60,23 100,25 155,24 S188,23 200,24" stroke={accent} strokeWidth="0.3" fill="none" strokeOpacity={opacity * 0.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#woodgrain-${accent.replace("#", "")})`} />
    </svg>
  );
}

export { WoodGrainTexture };