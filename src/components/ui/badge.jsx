import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#A35C5C] text-[#E0D8C8] shadow hover:bg-[#8B4A4A]",
        secondary:
          "border border-[#E0D8C8]/15 bg-white/5 text-[#E0D8C8] hover:bg-white/10",
        outline:
          "border border-[#E0D8C8]/25 text-[#E0D8C8] hover:bg-white/5",
        success:
          "border border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
        warning:
          "border border-amber-500/30 bg-amber-500/15 text-amber-200",
        destructive:
          "border border-rose-500/30 bg-rose-500/15 text-rose-200",
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