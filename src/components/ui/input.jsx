import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#E0D8C8]/15 bg-[#1A2B3A]/50 px-3 py-2 text-sm text-[#E0D8C8] shadow-sm transition-colors",
        "placeholder:text-[#E0D8C8]/45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0 focus-visible:border-[#E0D8C8]/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-[#E0D8C8]/20",
        className
      )}
      {...props}
    />
  );
});

export { Input };