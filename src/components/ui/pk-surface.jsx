import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PipeKeeper Surface System
 * Goal: eliminate ad-hoc bg-white / beige / text-black surfaces and enforce a consistent
 * dark, high-contrast theme across cards, panels, and sections.
 *
 * Usage:
 *  - <PKCard> ... </PKCard>         // primary surface card
 *  - <PKPanel> ... </PKPanel>       // secondary surface panel (slightly darker)
 *  - <PKSection> ... </PKSection>   // section wrapper with consistent spacing
 *  - <PKHeader> ... </PKHeader>     // consistent heading/subheading style
 *  - <PKField> ... </PKField>       // consistent "boxed" field surface (for custom blocks)
 */

/**
 * PipeKeeper Canonical Surface Colors
 * ====================================
 * Collector theme surfaces with warm brown/espresso base,
 * muted gold borders, and burgundy accents.
 */
export const PK_COLORS = {
  surface: "#2a1f18",          // primary card surface - warm brown
  surface2: "#1f1510",         // deeper panel surface - darker espresso
  border: "rgba(139, 98, 57, 0.25)",  // muted gold/brown borders

  text: "#F5F1E7",
  textMuted: "rgba(180, 140, 75, 0.8)",

  accent: "#A35C5C",           // burgundy accent
  accent2: "#8F4E4E",          // darker burgundy for active/focus
};

export const PK_TW = {
  // Primary card surface - collector theme
  card: "rounded-2xl border border-[#8b6239]/25 bg-gradient-to-br from-[#2a1f18] to-[#1f1510] text-[#F5F1E7] shadow-lg",

  // Secondary panel surface - deeper collector tone
  panel: "rounded-2xl border border-[#8b6239]/20 bg-gradient-to-br from-[#1f1510] to-[#1a100a] text-[#F5F1E7] shadow-lg",

  // Inner "slot" surface for list items
  item: "rounded-xl border border-[#8b6239]/15 bg-[#3a2a20]/30 hover:bg-[#3a2a20]/50 transition-colors",

  // Headings - warm ivory
  h1: "text-2xl md:text-3xl font-semibold tracking-tight text-[#F5F1E7]",
  h2: "text-lg md:text-xl font-semibold text-[#F5F1E7]",
  sub: "text-sm text-[#E0D8C8]/70",

  // Section spacing
  section: "space-y-4",

  // Consistent divider - muted gold
  divider: "border-t border-[#8b6239]/20",

  // Field surface for custom controls
  field: "w-full rounded-xl border border-[#8b6239]/25 bg-[#1a2b3a] px-3 py-2 text-[#E0D8C8] placeholder:text-[#8b6239]/50 focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50 focus:border-[#8b6239]/40",
};

export function PKCard({ className, children, ...props }) {
  return (
    <div className={cn(PK_TW.card, className)} {...props}>
      {children}
    </div>
  );
}

export function PKPanel({ className, children, ...props }) {
  return (
    <div className={cn(PK_TW.panel, className)} {...props}>
      {children}
    </div>
  );
}

export function PKItem({ className, children, ...props }) {
  return (
    <div className={cn(PK_TW.item, className)} {...props}>
      {children}
    </div>
  );
}

export function PKSection({ className, children, ...props }) {
  return (
    <section className={cn(PK_TW.section, className)} {...props}>
      {children}
    </section>
  );
}

export function PKHeader({ id, title, subtitle, right, className, ...props }) {
  return (
    <div id={id} className={cn("flex items-start justify-between gap-4", className)} {...props}>
      <div className="min-w-0">
        {title ? <div className={PK_TW.h2}>{title}</div> : null}
        {subtitle ? <div className={PK_TW.sub}>{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function PKDivider({ className, ...props }) {
  return <div className={cn(PK_TW.divider, className)} {...props} />;
}

export function PKField({ className, ...props }) {
  return <div className={cn(PK_TW.field, className)} {...props} />;
}