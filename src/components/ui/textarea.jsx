import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea — matches Input style, taller, more readable.
 */
const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[110px] w-full rounded-xl px-4 py-3",
        "text-base text-[#F5F1E7]",
        "bg-[rgba(20,14,10,0.70)] border border-[rgba(180,140,75,0.25)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        "placeholder:text-[rgba(224,216,200,0.55)]",
        "focus:outline-none focus:ring-2 focus:ring-[rgba(180,140,75,0.40)] focus:border-[rgba(180,140,75,0.52)]",
        "transition-colors duration-150 resize-y",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };