import React from "react";
import { cn } from "@/lib/utils";

export default function Input(props) {
  const { children, className = "", disabled, ...rest } = props;

  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-[rgba(140,105,65,0.28)] bg-[rgba(28,21,16,0.72)] px-3 py-2 text-sm text-[#F5F1E7] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        "placeholder:text-[#D8C7A6]/55",
        "focus:outline-none focus:ring-2 focus:ring-[#A35C5C] focus:border-[rgba(163,92,92,0.55)]",
        disabled && "cursor-not-allowed bg-[rgba(0,0,0,0.3)] text-[rgba(224,216,200,0.4)]",
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </input>
  );
}

export { Input };