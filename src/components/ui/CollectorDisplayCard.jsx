import React from "react";
import { cn } from "@/lib/utils";
import { Heart, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CollectorDisplayCard — Premium gallery display mode for collection items
 * Used in Collector Display Mode for pipes and tobacco
 * 
 * Features:
 * - Large prominent photography
 * - Pedestal lighting under object
 * - Luxury object framing
 * - Museum-quality presentation
 * 
 * @param {string} image - Primary object photo
 * @param {string} title - Item name
 * @param {string} subtitle - Maker or manufacturer
 * @param {ReactNode} badges - Metadata badges
 * @param {ReactNode} valueDisplay - Price/value badge
 * @param {boolean} isFavorite - Favorite status
 * @param {Function} onToggleFavorite - Favorite toggle handler
 * @param {Function} onClick - Card click handler
 */
export default function CollectorDisplayCard({
  image,
  title,
  subtitle,
  badges,
  valueDisplay,
  isFavorite,
  onToggleFavorite,
  onClick,
  onEdit,
  fallbackIcon,
  className
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
        "hover:-translate-y-1",
        className
      )}
      style={{
        background: "linear-gradient(155deg, rgba(52, 37, 24, 0.88), rgba(38, 26, 18, 0.96))",
        border: "1px solid rgba(120, 90, 65, 0.35)",
        boxShadow: `
          0 4px 16px rgba(0,0,0,0.65),
          inset 0 1px 0 rgba(180,140,100,0.12),
          inset 0 -3px 4px rgba(0,0,0,0.3)
        `,
      }}
      onClick={onClick}
    >
      {/* Object display area with pedestal lighting */}
      <div 
        className="relative aspect-[4/3] overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(22, 16, 11, 0.98), rgba(18, 12, 8, 1))",
        }}
      >
        {image ? (
          <>
            {/* Main object */}
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="w-full h-full object-contain p-6 relative z-10"
              style={{
                filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))"
              }}
            />

            {/* Pedestal spotlight — warm glow beneath object */}
            <div
              className="absolute inset-0 pointer-events-none z-5"
              style={{
                background: `radial-gradient(ellipse 55% 40% at 50% 65%, rgba(180,140,75,0.08) 0%, transparent 70%)`,
              }}
            />

            {/* Center object highlight */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                background: `radial-gradient(ellipse 50% 45% at 50% 42%, rgba(255,255,255,0.06) 0%, transparent 68%)`,
              }}
            />

            {/* Vignette frame */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                background: `radial-gradient(ellipse 88% 88% at 50% 50%, transparent 35%, rgba(12,8,5,0.5) 78%, rgba(8,5,3,0.8) 100%)`,
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {fallbackIcon}
          </div>
        )}

        {/* Floating edit and favorite buttons */}
        <div className="absolute top-4 right-4 z-30 flex gap-1">
          {typeof onEdit === 'function' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full shadow-xl"
              style={{
                background: "rgba(18, 12, 8, 0.92)",
                border: "1px solid rgba(120, 90, 65, 0.35)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.6)"
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="w-4 h-4 text-[#D4A574]" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shadow-xl"
            style={{
              background: "rgba(18, 12, 8, 0.92)",
              border: "1px solid rgba(120, 90, 65, 0.35)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.6)"
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.();
            }}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400 text-rose-400' : 'text-[#E0D8C8]/50'}`} />
          </Button>
        </div>

        {/* Value display */}
        {valueDisplay && (
          <div className="absolute bottom-4 left-4 right-4 z-30">
            {valueDisplay}
          </div>
        )}
      </div>

      {/* Information panel */}
      <div className="p-5 space-y-3 min-w-0">
        <div className="min-w-0">
          <h3 
            className="font-semibold text-lg leading-tight mb-1.5 break-words"
            style={{ 
              color: "#F5F1E7",
              fontFamily: "'Georgia', serif",
              textShadow: "0 1px 2px rgba(0,0,0,0.4)"
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm break-words" style={{ color: "rgba(180, 140, 75, 0.75)" }}>
              {subtitle}
            </p>
          )}
        </div>

        {badges && (
          <div className="flex flex-wrap gap-1.5">
            {badges}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(180, 140, 75, 0.25) 35%, rgba(180, 140, 75, 0.35) 50%, rgba(180, 140, 75, 0.25) 65%, transparent)",
        }}
      />
    </div>
  );
}