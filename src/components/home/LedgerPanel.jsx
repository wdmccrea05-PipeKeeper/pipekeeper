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
        background: `linear-gradient(145deg, rgba(50, 35, 22, 0.75), rgba(38, 26, 18, 0.88))`,
        border: `1px solid rgba(120, 90, 65, 0.3)`,
        boxShadow: `
          0 2px 6px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(180,140,100,0.1),
          inset 0 -1px 2px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Subtle leather grain */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-8"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(80, 60, 40, 0.08) 3px,
              rgba(80, 60, 40, 0.08) 4px
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
           <div className="inline-flex flex-shrink-0">
             <div
               className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
               style={{
                 background: `linear-gradient(135deg, rgba(100, 70, 45, 0.4), rgba(80, 55, 35, 0.5))`,
                 border: `1px solid rgba(120, 90, 65, 0.4)`,
                 boxShadow: `0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180, 140, 100, 0.15)`,
               }}
             >
               <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent, filter: `drop-shadow(0 0 3px ${accent}90)` }} />
             </div>
           </div>
         )}

         {/* Label */}
         <div 
           className="text-[10px] uppercase tracking-[0.12em] font-semibold leading-tight min-w-0"
           style={{ 
             color: `rgba(180, 140, 75, 0.75)`,
             whiteSpace: "normal",
             wordWrap: "break-word",
             hyphens: "none",
             minWidth: "60px"
           }}
         >
           {label}
         </div>

         {/* Value */}
         <div 
           className="text-xl sm:text-2xl font-bold leading-none"
           style={{
             color: "#F5F1E7",
             textShadow: `0 1px 2px rgba(0,0,0,0.6)`,
             fontFamily: "'Georgia', serif",
             whiteSpace: "normal",
             wordWrap: "break-word",
             hyphens: "none"
           }}
         >
           {value}
         </div>

         {/* Sub text */}
         {sub && (
           <div 
             className="text-xs leading-snug pt-0.5"
             style={{ 
               color: `rgba(180, 140, 75, 0.65)`,
               whiteSpace: "normal",
               wordWrap: "break-word",
               hyphens: "none"
             }}
           >
             {sub}
           </div>
         )}
       </div>
    </div>
  );
}