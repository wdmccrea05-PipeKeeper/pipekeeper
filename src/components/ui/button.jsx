import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0 " +
      "disabled:pointer-events-none disabled:opacity-50",
    {
      variants: {
         variant: {
           default:
             "bg-[#A35C5C] text-[#F5F1E7] hover:bg-[#8F4E4E] active:bg-[#7A3F3F]",
           secondary:
             "bg-gradient-to-br from-[#3a2a20] to-[#2a1a10] text-[#E0D8C8] border border-[#8b6239]/30 hover:from-[#4a3a2a] hover:to-[#3a2a1a]",
           ghost:
             "bg-transparent text-[#E0D8C8]/70 hover:bg-[#3a2a20]/50 active:bg-[#3a2a20]/70",
           outline:
             "border border-[#8b6239]/30 text-[#E0D8C8] hover:bg-[#3a2a20]/40 active:bg-[#3a2a20]/60",
           destructive:
             "bg-[#D45C5C] text-[#F5F1E7] hover:bg-[#C44A4A] active:bg-[#B34242]",
           link:
             "text-[#D4A574] underline-offset-4 hover:underline",
         },
        size: {
          default: "h-10 px-4 py-2",
          sm: "h-9 rounded-lg px-3 text-xs",
          lg: "h-11 rounded-xl px-8",
          icon: "h-10 w-10",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
  );

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { Button, buttonVariants };