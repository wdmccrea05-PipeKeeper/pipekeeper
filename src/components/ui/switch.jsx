import React from "react";
import { cn } from "@/lib/utils";

/**
 * Switch — larger, warm palette, smoother transitions.
 */
function Switch({ checked, onCheckedChange, disabled = false, className = "", ...rest }) {
  const handleChange = (e) => {
    onCheckedChange?.(e.target.checked);
  };

  return (
    <label
      className={cn(
        "relative inline-flex items-center cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...rest}
      />
      {/* Track */}
      <div
        className={cn(
          "w-12 h-6 rounded-full transition-colors duration-200",
          "border",
          checked
            ? "bg-[rgba(163,92,92,0.85)] border-[rgba(163,92,92,0.60)]"
            : "bg-[rgba(255,255,255,0.06)] border-[rgba(180,140,75,0.22)]"
        )}
      >
        {/* Thumb */}
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm",
            "transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-0"
          )}
        />
      </div>
    </label>
  );
}

export { Switch };
export default Switch;