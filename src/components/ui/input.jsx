import React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — premium, larger, readable.
 * Taller tap target, warm palette, gold focus ring.
 */
function Input({ className = "", disabled, type, ...props }) {
  return (
    <input
      type={type}
      disabled={disabled}
      className={cn(
        // Layout & size
        "flex h-11 w-full rounded-xl px-4 py-2.5",
        // Typography
        "text-base text-[#F5F1E7]",
        // Surface
        "bg-[rgba(20,14,10,0.70)] border border-[rgba(180,140,75,0.25)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        // Placeholder
        "placeholder:text-[rgba(224,216,200,0.55)]",
        // Focus
        "focus:outline-none focus:ring-2 focus:ring-[rgba(180,140,75,0.40)] focus:border-[rgba(180,140,75,0.52)]",
        // Transition
        "transition-colors duration-150",
        // Disabled
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
export default Input;