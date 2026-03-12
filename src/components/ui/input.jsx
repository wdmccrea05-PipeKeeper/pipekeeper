import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-[rgba(140,105,65,0.28)] bg-[rgba(28,21,16,0.72)] px-3 py-2 text-sm text-[#F5F1E7] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        "placeholder:text-[#D8C7A6]/40",
        "focus:outline-none focus:ring-2 focus:ring-[#A35C5C] focus:border-[rgba(163,92,92,0.55)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

export { Input };
