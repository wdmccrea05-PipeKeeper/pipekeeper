import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[#A35C5C]/40 bg-[#A35C5C]/20 text-[#E0D8C8] hover:bg-[#A35C5C]/30",
        secondary:
          "border-[#E0D8C8]/15 bg-white/5 text-[#E0D8C8] hover:bg-white/10",
        outline:
          "border-[#E0D8C8]/20 text-[#E0D8C8] hover:bg-white/5",
        success:
          "border-[#2EAF6F]/30 bg-[#2EAF6F]/15 text-[#2EAF6F]",
        warning:
          "border-[#C77A2B]/30 bg-[#C77A2B]/15 text-[#C77A2B]",
        destructive:
          "border-[#E05D5D]/30 bg-[#E05D5D]/15 text-[#E05D5D]",
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