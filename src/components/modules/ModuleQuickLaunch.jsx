import React from "react";
import PipeIcon from "@/components/icons/PipeIcon";
import WhiskeyBottleIcon from "@/components/icons/WhiskeyBottleIcon";

function resolveIcon(action) {
  if (action.semanticIcon === "pipe") {
    return <PipeIcon className="w-5 h-5" color="rgba(180,140,75,0.95)" />;
  }

  if (action.semanticIcon === "bottle") {
    return <WhiskeyBottleIcon className="w-5 h-5" color="rgba(180,140,75,0.95)" />;
  }

  if (action.iconImage) {
    return (
      <img
        src={action.iconImage}
        alt=""
        className="w-7 h-7 object-contain"
        style={{
          backgroundColor: "transparent",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
        }}
        aria-hidden="true"
        draggable={false}
      />
    );
  }

  if (action.Icon) {
    const Icon = action.Icon;
    return <Icon className="w-4 h-4" style={{ color: "rgba(180,140,75,0.95)" }} />;
  }

  return null;
}

export default function ModuleQuickLaunch({ title = "Quick Actions", actions = [] }) {
  if (!actions.length) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6"
      style={{
        background: "linear-gradient(145deg, rgba(52,37,24,0.82), rgba(42,30,20,0.92))",
        border: "1px solid rgba(120,90,65,0.32)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
      }}
    >
      <h3
        className="text-xs uppercase tracking-[0.14em] font-semibold mb-5"
        style={{ color: "rgba(180,140,75,0.85)" }}
      >
        {title}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center gap-3 p-5 min-h-[118px] w-full rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
            aria-label={action.label}
            style={{
              background: "linear-gradient(145deg, rgba(58,42,28,0.76), rgba(48,34,24,0.88))",
              border: "1px solid rgba(120,90,65,0.35)",
              boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(100,70,45,0.42), rgba(80,55,35,0.56))",
                border: "1px solid rgba(120,90,65,0.45)",
                boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
              }}
            >
              {resolveIcon(action)}
            </div>

            <span
              className="text-sm font-semibold leading-tight text-center break-words"
              style={{ color: "#F5F1E7", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
