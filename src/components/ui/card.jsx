/**
 * Card system — premium, layered, soft.
 * All variants use the dark warm palette and consistent spacing.
 */
import React from "react";
import { cn } from "@/lib/utils";

function Card({ className = "", ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(180,140,75,0.18)] bg-gradient-to-b from-[rgba(46,32,22,0.97)] to-[rgba(30,22,17,0.99)] shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className = "", ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6 pb-4", className)}
      {...props}
    />
  );
}

function CardContent({ className = "", ...props }) {
  return (
    <div className={cn("p-6 pt-2", className)} {...props} />
  );
}

function CardTitle({ className = "", ...props }) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-snug tracking-tight text-[#F5F1E7]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className = "", ...props }) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-[rgba(224,216,200,0.72)]", className)}
      {...props}
    />
  );
}

function CardFooter({ className = "", ...props }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-6 pt-4 border-t border-[rgba(180,140,75,0.10)]",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardContent, CardTitle, CardFooter, CardDescription };
export default Card;