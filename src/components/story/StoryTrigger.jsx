import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n/safeTranslation";

/**
 * StoryTrigger — Button to launch Collector Story viewer
 * Can be styled as primary CTA, secondary button, or icon-only
 */
export default function StoryTrigger({ onClick, variant = "primary", className, size = "default" }) {
  const { t } = useTranslation();

  const sizeClasses = {
    small: "px-3 py-2 text-xs gap-1.5",
    default: "px-4 py-2.5 text-sm gap-2",
    large: "px-6 py-3 text-base gap-2.5",
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30",
    secondary: "bg-white/5 hover:bg-white/10 text-[#E0D8C8] border border-amber-500/30",
    ghost: "hover:bg-white/5 text-[#E0D8C8]/70 hover:text-[#E0D8C8]",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Sparkles className={size === "small" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      <span>{t("story.viewStory")}</span>
    </button>
  );
}