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
        background: `linear-gradient(135deg, rgba(40, 28, 18, 0.9), rgba(35, 24, 16, 0.95))`,
        border: `1px solid rgba(120, 90, 65, 0.3)`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: `
          0 2px 6px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(180,140,100,0.08),
          inset 3px 0 0 rgba(180,140,75,0.15)
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

      {/* Wood grain texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`drawer-grain-${accent}`} x="0" y="0" width="180" height="22" patternUnits="userSpaceOnUse">
            <path d="M0,3 C35,2.5 70,3.5 105,3 S160,2.5 180,3" stroke={accent} strokeWidth="0.4" fill="none" strokeOpacity="0.06" />
            <path d="M0,9 C40,8.5 80,9.5 120,9 S165,8.5 180,9" stroke={accent} strokeWidth="0.3" fill="none" strokeOpacity="0.05" />
            <path d="M0,15 C30,14.5 65,15.5 100,15 S155,14.5 180,15" stroke={accent} strokeWidth="0.35" fill="none" strokeOpacity="0.055" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#drawer-grain-${accent})`} />
      </svg>

      <div className="relative flex items-center gap-4 p-5">
        {/* Icon / Label plate */}
        <div className="flex items-center gap-3 min-w-[140px] sm:min-w-[180px] shrink-0">
          <div
            className="w-9 h-9 rounded flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(100, 70, 45, 0.4), rgba(80, 55, 35, 0.5))`,
              border: `1px solid rgba(120, 90, 65, 0.4)`,
              boxShadow: `0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180, 140, 100, 0.12)`,
            }}
          >
            {iconImage ? (
              <img src={iconImage} alt="" className="w-full h-full object-cover" />
            ) : Icon ? (
              <Icon className="w-5 h-5" style={{ color: accent }} />
            ) : null}
          </div>
          <h2 
            className="text-base font-semibold tracking-tight"
            style={{ 
              color: "#F5F1E7",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
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
                className="text-lg font-bold leading-none"
                style={{ 
                  color: "#F5F1E7",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  fontFamily: "'Georgia', serif"
                }}
              >
                {stat.value}
              </div>
              <div 
                className="text-[10px] mt-1 uppercase tracking-wider"
                style={{ color: "rgba(180, 140, 75, 0.7)" }}
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