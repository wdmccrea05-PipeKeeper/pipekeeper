import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0 " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#A35C5C] text-[#E0D8C8] hover:bg-[#8B4A4A] shadow",
        secondary:
          "bg-white/5 text-[#E0D8C8] hover:bg-white/10 border border-[#E0D8C8]/15",
        outline:
          "border border-[#E0D8C8]/20 text-[#E0D8C8] hover:bg-white/5",
        ghost:
          "text-[#E0D8C8] hover:bg-white/5",
        destructive:
          "bg-[#E05D5D] text-white hover:bg-[#C94C4C]",
        link:
          "text-[#E0D8C8] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
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