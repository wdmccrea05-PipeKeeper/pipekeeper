import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border bg-[#1a2b3a] px-3 py-2 text-sm text-[#E0D8C8]",
        "border-[#8b6239]/25 placeholder:text-[#8b6239]/50",
        "focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50 focus:border-[#8b6239]/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

export { Input };