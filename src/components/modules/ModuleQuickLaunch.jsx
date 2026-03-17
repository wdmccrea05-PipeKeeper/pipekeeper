import React from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function ModuleQuickLaunch({ actions = [] }) {
  const { t } = useTranslation();

  if (!actions.length) return null;

  return (
    <div
      className="relative rounded-lg overflow-hidden p-6"
      style={{
        background: "linear-gradient(145deg, rgba(52, 37, 24, 0.75), rgba(42, 30, 20, 0.88))",
        border: "1px solid rgba(120, 90, 65, 0.32)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)",
      }}
    >
      {/* Subtle grain */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(80, 60, 40, 0.04) 3px,
              rgba(80, 60, 40, 0.04) 4px
            )
          `
        }}
      />

      <h3 
        className="text-xs uppercase tracking-[0.14em] font-semibold mb-5 relative"
        style={{ color: "rgba(180, 140, 75, 0.85)" }}
      >
        {t("quickActions.sectionTitle")}
      </h3>
      <div className={`grid gap-3.5 relative grid-cols-2 md:grid-cols-${Math.min(actions.length, 5)}`}>
        {actions.map(({ key, Icon, iconImage, label, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-3 p-5 transition-all duration-200 min-h-[100px] w-full focus-visible:outline-none group hover:-translate-y-0.5"
            aria-label={label}
            style={{
              background: "linear-gradient(145deg, rgba(58, 42, 28, 0.65), rgba(48, 34, 24, 0.78))",
              border: "1px solid rgba(120, 90, 65, 0.35)",
              borderRadius: "0.5rem",
              boxShadow: "0 3px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(180,140,100,0.14), inset 0 -2px 2px rgba(0,0,0,0.25)",
            }}
          >
            <div
              className="w-11 h-11 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110"
              style={{
                background: "linear-gradient(135deg, rgba(100, 70, 45, 0.5), rgba(80, 55, 35, 0.6))",
                border: "1px solid rgba(120, 90, 65, 0.45)",
                borderRadius: "0.5rem",
                boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)",
              }}
            >
              {iconImage ? (
                <img
                  src={iconImage}
                  alt=""
                  className="w-7 h-7 object-contain"
                  style={{ mixBlendMode: 'screen' }}
                  aria-hidden="true"
                />
              ) : Icon ? (
                <Icon className="w-4 h-4" style={{ color: "rgba(180, 140, 75, 0.95)" }} aria-hidden="true" />
              ) : null}
            </div>
            <span 
              className="text-xs font-semibold leading-tight text-center"
              style={{ 
                color: "#F5F1E7",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)"
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}