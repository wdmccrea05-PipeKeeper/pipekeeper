import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — softer, more readable, consistent palette.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap leading-none",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(163,92,92,0.20)] text-[#F0D8C8] border-[rgba(163,92,92,0.35)]",
        secondary:
          "bg-[rgba(255,255,255,0.06)] text-[#E0D8C8] border-[rgba(255,255,255,0.12)]",
        outline:
          "bg-transparent text-[#E0D8C8] border-[rgba(180,140,75,0.38)]",
        gold:
          "bg-[rgba(180,140,75,0.18)] text-[#D4A574] border-[rgba(180,140,75,0.35)]",
        success:
          "bg-[rgba(46,125,92,0.20)] text-[#7dd8a8] border-[rgba(74,154,112,0.38)]",
        warning:
          "bg-[rgba(199,122,43,0.18)] text-[#f0b657] border-[rgba(217,155,59,0.35)]",
        destructive:
          "bg-[rgba(179,95,95,0.18)] text-[#f08888] border-[rgba(217,112,112,0.35)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };