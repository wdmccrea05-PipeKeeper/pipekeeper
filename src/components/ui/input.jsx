import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-white/10 bg-[#162433] px-3 py-2 text-sm text-[#E0D8C8] shadow-sm transition-colors",
        "placeholder:text-[#E0D8C8]/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0 focus-visible:border-[#E0D8C8]/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-white/15",
        className
      )}
      {...props}
    />
  );
});

export { Input };