import React from "react";
import { cn } from "@/lib/utils";

/**
 * MaterialFrame — Subtle material frame for section groups
 * Creates the impression of content placed on leather trays or walnut desk panels
 * 
 * @param {ReactNode} children - Content to frame
 * @param {string} className - Additional classes
 * @param {string} title - Optional section title
 * @param {Component} icon - Optional icon component
 * @param {string} accent - Accent color for title bar
 */
export default function MaterialFrame({ 
  children, 
  className,
  title,
  icon: Icon,
  accent = "#B48C4B",
  style = {}
}) {
  return (
    <div
      className={cn("rounded-lg overflow-hidden", className)}
      style={{
        background: "linear-gradient(145deg, rgba(50, 35, 22, 0.72), rgba(38, 26, 18, 0.86))",
        border: "1px solid rgba(120, 90, 65, 0.28)",
        boxShadow: `
          0 2px 10px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(180,140,100,0.1),
          inset 0 -2px 3px rgba(0,0,0,0.2)
        `,
        ...style
      }}
    >
      {/* Subtle leather grain texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 4px,
              rgba(80, 60, 40, 0.05) 4px,
              rgba(80, 60, 40, 0.05) 5px
            )
          `
        }}
      />

      {title && (
        <div 
          className="px-5 py-4 border-b flex items-center gap-3"
          style={{
            borderBottomColor: "rgba(120, 90, 65, 0.2)",
            background: "linear-gradient(to bottom, rgba(60, 42, 28, 0.3), transparent)"
          }}
        >
          {Icon && (
            <div
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(100, 70, 45, 0.4), rgba(80, 55, 35, 0.5))`,
                border: `1px solid rgba(120, 90, 65, 0.4)`,
                boxShadow: `0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180, 140, 100, 0.15)`,
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
          )}
          <h2 
            className="text-base font-semibold"
            style={{ 
              color: "#F5F1E7",
              fontFamily: "'Georgia', serif",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)"
            }}
          >
            {title}
          </h2>
        </div>
      )}
      
      <div className="relative">
        {children}
      </div>
    </div>
  );
}