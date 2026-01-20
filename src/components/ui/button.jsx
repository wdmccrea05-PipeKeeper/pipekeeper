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
           "bg-[#A35C5C] text-white hover:bg-[#8B4A4A]",
         secondary:
           "bg-white/10 text-[#E0D8C8] hover:bg-white/20",
         ghost:
           "bg-transparent text-[#E0D8C8]/70 hover:bg-white/5",
         outline:
           "border border-[#E0D8C8]/20 text-[#E0D8C8] hover:bg-white/5 active:bg-white/10",
         destructive:
           "bg-[#E05D5D] text-[#E0D8C8] hover:bg-[#D54A4A] active:bg-[#C94C4C]",
         link:
           "text-[#E0D8C8] underline-offset-4 hover:underline",
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