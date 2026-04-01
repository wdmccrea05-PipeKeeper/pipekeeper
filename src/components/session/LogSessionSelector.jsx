import React from "react";
import { X, BookOpen, GlassWater, Sparkles } from "lucide-react";

/**
 * LogSessionSelector
 * Module-aware modal for launching Pipe, Whiskey, or combined session flows.
 */
export default function LogSessionSelector({
  isOpen,
  onClose,
  pipeEnabled = false,
  whiskeyEnabled = false,
  onSelectPipe,
  onSelectWhiskey,
  onSelectCombined,
}) {
  if (!isOpen) return null;

  const options = [];

  if (pipeEnabled) {
    options.push({
      key: "pipe",
      label: "Pipe Session",
      sublabel: "Log a pipe and tobacco session",
      Icon: BookOpen,
      accent: "#E0B36B",
      background:
        "linear-gradient(135deg, rgba(180,140,75,0.18), rgba(140,100,50,0.10))",
      border: "1px solid rgba(180,140,75,0.35)",
      iconBackground: "rgba(180,140,75,0.18)",
      onClick: () => {
        onClose?.();
        onSelectPipe?.();
      },
    });
  }

  if (whiskeyEnabled) {
    options.push({
      key: "whiskey",
      label: "Whiskey Tasting",
      sublabel: "Log a tasting note or pour",
      Icon: GlassWater,
      accent: "#D58A57",
      background:
        "linear-gradient(135deg, rgba(196,122,58,0.18), rgba(160,95,40,0.10))",
      border: "1px solid rgba(196,122,58,0.35)",
      iconBackground: "rgba(196,122,58,0.18)",
      onClick: () => {
        onClose?.();
        onSelectWhiskey?.();
      },
    });
  }

  if (pipeEnabled && whiskeyEnabled) {
    options.push({
      key: "combined",
      label: "Pipe + Whiskey",
      sublabel: "Plan a combined session across both modules",
      Icon: Sparkles,
      accent: "#D98A8A",
      background:
        "linear-gradient(135deg, rgba(182,101,101,0.20), rgba(120,72,72,0.10))",
      border: "1px solid rgba(182,101,101,0.36)",
      iconBackground: "rgba(182,101,101,0.18)",
      onClick: () => {
        onClose?.();
        onSelectCombined?.();
      },
    });
  }

  const gridClassName =
    options.length >= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="fixed inset-0 z-[1300] bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, rgba(38,26,18,0.985), rgba(24,16,12,1))",
          border: "1px solid rgba(180,140,75,0.24)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-[rgba(180,140,75,0.14)]">
          <div>
            <h3 className="font-bold text-[#F7F1E7] text-3xl leading-tight">
              Log Session
            </h3>
            <p className="text-base mt-2 text-[#F0E6D6]/85 leading-relaxed">
              Choose the module flow you want to launch.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 text-[#F0E6D6]/75"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-5 grid ${gridClassName} gap-3`}>
          {options.map((option) => {
            const Icon = option.Icon;

            return (
              <button
                key={option.key}
                type="button"
                onClick={option.onClick}
                className="flex flex-col items-center text-center gap-4 p-6 rounded-xl border transition-all hover:scale-[1.02]"
                style={{
                  background: option.background,
                  border: option.border,
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: option.iconBackground,
                    border: option.border,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: option.accent }} />
                </div>
                <div>
                  <span className="block text-2xl font-semibold text-[#F7F1E7] leading-snug">
                    {option.label}
                  </span>
                  <span className="block text-base mt-2 text-[#F0E6D6]/82 leading-relaxed">
                    {option.sublabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}