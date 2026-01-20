import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/60 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#A35C5C] text-[#E0D8C8] shadow hover:bg-[#8B4A4A]",
        secondary:
          "border-transparent bg-[#1A2B3A] text-[#E0D8C8] hover:bg-[#2C3E55]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "border-[#E0D8C8]/30 text-[#E0D8C8] hover:bg-white/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }