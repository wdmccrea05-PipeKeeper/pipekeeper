import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#A35C5C] text-[#E0D8C8] shadow hover:bg-[#8B4A4A]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-[#E0D8C8]/20 bg-transparent text-[#E0D8C8] shadow-sm hover:bg-white/5",
        secondary:
          "bg-[#1A2B3A] text-[#E0D8C8] shadow-sm hover:bg-[#2C3E55]",
        ghost: "text-[#E0D8C8] hover:bg-white/5",
        link: "text-[#A35C5C] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(
        buttonVariants({ variant, size, className }),
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A75D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2B3A]"
      )}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }