import React from "react";
import { cn } from "@/lib/utils";

/**
 * CatalogPlate — Heritage display card resembling a catalog entry or collector's plaque
 * Photo-first design with strong editorial typography
 */
export default function CatalogPlate({
  title,
  subtitle,
  value,
  heroImage,
  bgImage,
  accent = "#B48C4B",
  onClick,
  className,
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden transition-all duration-300",
        "min-h-[200px]",
        onClick && "cursor-pointer hover:translate-y-[-3px] hover:shadow-2xl",
        className
      )}
      onClick={onClick}
      style={{
        background: `linear-gradient(145deg, rgba(45, 32, 22, 0.92), rgba(35, 24, 16, 0.97))`,
        border: `1px solid rgba(120, 90, 65, 0.38)`,
        boxShadow: `
          0 4px 16px rgba(0,0,0,0.65),
          inset 0 1px 0 rgba(180,140,100,0.1),
          inset 0 0 80px rgba(0,0,0,0.35),
          inset 0 -3px 4px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Background image layer */}
      {(bgImage || heroImage) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage || heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px) brightness(0.25) saturate(0.6) sepia(0.2)",
            opacity: 0.8,
            transform: "scale(1.15)",
          }}
        />
      )}

      {/* Hero image spotlight */}
      {heroImage && (
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
          style={{ width: "50%" }}
        >
          <img
            src={heroImage}
            alt=""
            loading="lazy"
            className="absolute"
            style={{
              right: "-5%",
              top: "50%",
              transform: `translateY(-50%) rotate(8deg)`,
              height: "105%",
              maxWidth: "none",
              width: "auto",
              objectFit: "contain",
              filter: `drop-shadow(0 0 16px ${accent}60) drop-shadow(0 4px 12px rgba(0,0,0,0.7))`,
            }}
          />
          {/* Fade gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(32,22,15,1) 0%, rgba(32,22,15,0.5) 35%, transparent 70%)",
            }}
          />
        </div>
      )}

      {/* Directional gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to right, rgba(32,22,15,0.95) 0%, rgba(32,22,15,0.75) 50%, transparent 100%)`,
        }}
      />

      {/* Bottom vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "60%",
          background: "linear-gradient(to top, rgba(20,12,8,0.8) 0%, rgba(20,12,8,0.35) 50%, transparent 100%)",
        }}
      />

      {/* Leather texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 4px,
              rgba(0, 0, 0, 0.1) 4px,
              rgba(0, 0, 0, 0.1) 5px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 4px,
              rgba(0, 0, 0, 0.1) 4px,
              rgba(0, 0, 0, 0.1) 5px
            )
          `
        }}
      />

      {/* Top brass accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}90 40%, ${accent} 50%, ${accent}90 60%, transparent 100%)`,
          boxShadow: `0 0 4px ${accent}60`,
        }}
      />

      {/* Content */}
      <div className="relative p-7 flex flex-col justify-start h-full">
        {/* Category label */}
        <div
          className="text-[10px] uppercase tracking-[0.15em] font-bold mb-3"
          style={{ color: `${accent}e5` }}
        >
          {title}
        </div>

        {/* Main value - editorial typography */}
         <div
          className="text-2xl sm:text-3xl font-bold leading-snug tracking-tight mb-2 line-clamp-2"
          style={{
            color: "#F5F1E7",
            textShadow: `0 2px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)`,
            fontFamily: "'Georgia', serif",
          }}
        >
          {value ?? "—"}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            className="text-sm font-semibold leading-snug break-words"
            style={{ 
              color: `${accent}dd`,
              textShadow: "0 1px 2px rgba(0,0,0,0.6)"
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}