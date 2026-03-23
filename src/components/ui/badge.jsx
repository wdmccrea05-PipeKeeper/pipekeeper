import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#A35C5C]/20 text-[#E0D8C8] border border-[#A35C5C]/40",
        secondary:
          "bg-[#2a2a2a] text-[#E0D8C8] border border-[rgba(255,255,255,0.15)]",
        outline:
          "border border-[rgba(180,140,75,0.35)] text-[#E0D8C8] bg-transparent",
        success:
          "border-[#4a9a70] bg-[rgba(46,175,111,0.2)] text-[#7dd8a8]";
        warning:
          "border-[#d99b3b] bg-[rgba(199,122,43,0.2)] text-[#f0b657]";
        destructive:
          "border-[#d97070] bg-[rgba(224,93,93,0.2)] text-[#f08888]",
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