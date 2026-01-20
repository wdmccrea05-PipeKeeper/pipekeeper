// src/components/ui/card.jsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PipeKeeper surfaces:
 * - default: primary dark surface card used everywhere
 * - elevated: slightly lighter, used for “panels inside panels”
 * - subtle: very low-contrast container (rare)
 */
const Card = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default:
      "rounded-2xl border border-white/10 bg-[#243548]/70 text-[#E0D8C8] shadow-lg backdrop-blur-md",
    elevated:
      "rounded-2xl border border-white/12 bg-[#2B3E55]/70 text-[#E0D8C8] shadow-lg backdrop-blur-md",
    subtle:
      "rounded-2xl border border-white/8 bg-[#1A2B3A]/40 text-[#E0D8C8] backdrop-blur-md",
  };

  return (
    <div
      ref={ref}
      className={cn(variants[variant] || variants.default, className)}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-[#E0D8C8]", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-[#E0D8C8]/70", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };