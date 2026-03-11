import React from "react";
import { cn } from "@/lib/utils";

/**
 * LedgerPanel — Heritage-style summary panel resembling a collector's ledger entry
 * Used for collection stats and portfolio summaries
 */
export default function LedgerPanel({ label, value, sub, icon: Icon, accent = "#B48C4B", className }) {
  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden transition-all duration-200",
        "hover:translate-y-[-1px]",
        className
      )}
      style={{
        background: `linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))`,
        border: `1px solid rgba(120, 90, 65, 0.25)`,
        boxShadow: `
          0 1px 3px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(180,140,100,0.06),
          inset 0 -1px 0 rgba(0,0,0,0.2)
        `,
      }}
    >
      {/* Parchment texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(80, 60, 40, 0.1) 2px,
              rgba(80, 60, 40, 0.1) 3px
            )
          `
        }}
      />
      
      {/* Ledger lines */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[1px] opacity-20"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="relative p-4 space-y-2">
        {/* Icon badge */}
        {Icon && (
          <div className="inline-flex">
            <div
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(100, 70, 45, 0.3), rgba(80, 55, 35, 0.4))`,
                border: `1px solid rgba(120, 90, 65, 0.3)`,
                boxShadow: `0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(180, 140, 100, 0.1)`,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: accent, filter: `drop-shadow(0 0 2px ${accent}80)` }} />
            </div>
          </div>
        )}

        {/* Label */}
        <div 
          className="text-[10px] uppercase tracking-[0.12em] font-semibold"
          style={{ color: `rgba(180, 140, 75, 0.75)` }}
        >
          {label}
        </div>

        {/* Value */}
        <div 
          className="text-2xl font-bold leading-none"
          style={{
            color: "#F5F1E7",
            textShadow: `0 1px 2px rgba(0,0,0,0.6)`,
            fontFamily: "'Georgia', serif"
          }}
        >
          {value}
        </div>

        {/* Sub text */}
        {sub && (
          <div 
            className="text-xs leading-snug pt-0.5"
            style={{ color: `rgba(180, 140, 75, 0.65)` }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}