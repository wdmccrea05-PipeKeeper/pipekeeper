import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[#A35C5C] text-white hover:bg-[#8c4c4c]",
  secondary:
    "bg-[rgba(40,30,24,0.8)] text-[#F5F1E7] border border-[rgba(180,140,75,0.35)] hover:bg-white/10",
  ghost:
    "bg-transparent text-[#E0D8C8] hover:bg-white/10",
  muted:
    "bg-[rgba(255,255,255,0.05)] text-[#CFC7B5] opacity-60 cursor-not-allowed",
};

function Button({
  children,
  className = "",
  variant = "secondary",
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
        variants[disabled ? "muted" : variant],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export { Button };
export default Button;