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

export const PK_COLORS = {
  // App frame/background stays handled elsewhere (Layout), but surfaces are standardized here
  surface: "#223447",      // primary card surface
  surface2: "#1E2F43",     // slightly deeper panel surface
  border: "rgba(255,255,255,0.10)",

  text: "#F5F1E7",
  textMuted: "rgba(224,216,200,0.70)",

  accent: "#A35C5C",       // PipeKeeper maroon accent
  accent2: "#B84A4A",      // deeper accent for active states if needed
};

export const PK_TW = {
  // Primary card surface (your default)
  card: "rounded-2xl border border-white/10 bg-[#223447] text-[#F5F1E7] shadow-sm",

  // Secondary panel surface (nested cards / sub-panels)
  panel: "rounded-2xl border border-white/10 bg-[#1E2F43] text-[#F5F1E7] shadow-sm",

  // Inner "slot" surface for list items inside a panel
  item: "rounded-xl border border-white/10 bg-white/0 hover:bg-white/5 transition-colors",

  // Headings
  h1: "text-2xl md:text-3xl font-semibold tracking-tight text-[#F5F1E7]",
  h2: "text-lg md:text-xl font-semibold text-[#F5F1E7]",
  sub: "text-sm text-[#E0D8C8]/70",

  // Section spacing
  section: "space-y-4",

  // Consistent divider
  divider: "border-t border-white/10",

  // Optional: a consistent "field surface" for custom controls that aren't using <Input/>
  field: "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[#F5F1E7] placeholder:text-[#E0D8C8]/50 focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/40",
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

export function PKHeader({ title, subtitle, right, className, ...props }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
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