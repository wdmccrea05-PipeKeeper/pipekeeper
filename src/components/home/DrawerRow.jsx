import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DrawerRow — Heritage drawer label component for module navigation
 * Resembles a labeled drawer in a collector's cabinet
 */
export default function DrawerRow({ 
  title, 
  stats = [], 
  icon: Icon, 
  iconImage,
  accent = "#B48C4B",
  bgImage,
  href,
  className 
}) {
  const Component = href ? 'a' : 'div';
  
  return (
    <Component
      href={href}
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-200 group",
        href && "cursor-pointer hover:translate-x-1",
        className
      )}
      style={{
        background: `linear-gradient(145deg, rgba(48, 34, 22, 0.88), rgba(38, 26, 18, 0.94))`,
        border: `1px solid rgba(120, 90, 65, 0.32)`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: `
          0 3px 10px rgba(0,0,0,0.6),
          inset 0 1px 0 rgba(180,140,100,0.12),
          inset 3px 0 0 rgba(180,140,75,0.2),
          inset 0 -2px 3px rgba(0,0,0,0.25)
        `,
      }}
    >
      {/* Blurred background image */}
      {bgImage && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(16px) brightness(0.2) saturate(0.5) sepia(0.15)",
              opacity: 0.6,
              transform: "scale(1.1)",
            }}
          />
          {/* Cropped hero on right */}
          <div
            className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden opacity-40"
            style={{ width: "35%" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(2px) brightness(0.3) saturate(0.7)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, rgba(35,24,16,1) 0%, rgba(35,24,16,0.6) 35%, transparent 80%)" }}
            />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(35,24,16,0.92) 0%, rgba(35,24,16,0.75) 60%, transparent 100%)" }}
          />
        </>
      )}

      {/* Horizontal walnut grain texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`drawer-grain-${accent}`} x="0" y="0" width="200" height="24" patternUnits="userSpaceOnUse">
            <path d="M0,4 C40,3.5 80,4.5 120,4 S180,3.5 200,4" stroke={accent} strokeWidth="0.45" fill="none" strokeOpacity="0.08" />
            <path d="M0,10 C45,9.5 90,10.5 135,10 S185,9.5 200,10" stroke={accent} strokeWidth="0.35" fill="none" strokeOpacity="0.06" />
            <path d="M0,16 C35,15.5 75,16.5 115,16 S175,15.5 200,16" stroke={accent} strokeWidth="0.4" fill="none" strokeOpacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#drawer-grain-${accent})`} />
      </svg>

      <div className="relative flex items-center gap-4 p-5">
        {/* Icon / Label plate */}
        <div className="flex items-center gap-3 min-w-[140px] sm:min-w-[180px] shrink-0">
          <div
            className="w-10 h-10 rounded flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(100, 70, 45, 0.5), rgba(80, 55, 35, 0.6))`,
              border: `1px solid rgba(120, 90, 65, 0.45)`,
              boxShadow: `0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.18)`,
            }}
          >
            {iconImage ? (
              <img src={iconImage} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0) invert(1) sepia(0.6) saturate(2) hue-rotate(20deg) brightness(0.85)" }} />
            ) : Icon ? (
              <Icon className="w-4 h-4" style={{ color: accent, filter: `drop-shadow(0 0 2px ${accent}60)` }} />
            ) : null}
          </div>
          <h2 
            className="text-lg font-semibold tracking-tight"
            style={{ 
              color: "#F5F1E7",
              textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              fontFamily: "'Georgia', serif"
            }}
          >
            {title}
          </h2>
        </div>

        {/* Stats ledger entries */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 flex-1">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col">
              <div 
                className="text-xl font-bold leading-none mb-1"
                style={{ 
                  color: "#F5F1E7",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  fontFamily: "'Georgia', serif"
                }}
              >
                {stat.value}
              </div>
              <div 
                className="text-[10px] uppercase tracking-[0.1em] font-semibold"
                style={{ 
                  color: "rgba(180, 140, 75, 0.75)",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  hyphens: "auto"
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Arrow indicator */}
        {href && (
          <div className="shrink-0">
            <div
              className="w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:translate-x-1"
              style={{
                background: `linear-gradient(135deg, rgba(100, 70, 45, 0.25), rgba(80, 55, 35, 0.35))`,
                border: `1px solid rgba(120, 90, 65, 0.3)`,
              }}
            >
              <ArrowRight className="w-4 h-4" style={{ color: accent }} />
            </div>
          </div>
        )}
      </div>
    </Component>
  );
}