import React from "react";
import { BookOpen, Camera, TrendingUp, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

const CURATOR_ICON =
  "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png";

function getActions(hasStoryData) {
  const actions = [];

  if (hasStoryData) {
    actions.push({
      key: "viewStory",
      Icon: Sparkles,
      accent: "#F59E0B",
      iconColor: "text-[#F59E0B]",
      hoverColor: "hover:bg-[#F59E0B]/20",
      borderColor: "border-[#F59E0B]/30",
    });
  }

  actions.push(
    {
      key: "logSession",
      Icon: BookOpen,
      accent: "#4A7C59",
      iconColor: "text-[#6aab80]",
      hoverColor: "hover:bg-[#4A7C59]/20",
      borderColor: "border-[#4A7C59]/30",
    },
    {
      key: "identify",
      Icon: Camera,
      accent: "#C87941",
      iconColor: "text-[#e09060]",
      hoverColor: "hover:bg-[#C87941]/20",
      borderColor: "border-[#C87941]/30",
    },
    {
      key: "optimize",
      Icon: TrendingUp,
      accent: "#4A7C9C",
      iconColor: "text-[#6aabc0]",
      hoverColor: "hover:bg-[#4A7C9C]/20",
      borderColor: "border-[#4A7C9C]/30",
    },
    {
      key: "collectionCurator",
      accent: "#8b5e3a",
      iconColor: "text-[#d4956a]",
      hoverColor: "hover:bg-[#8b5e3a]/20",
      borderColor: "border-[#8b5e3a]/30",
    }
  );

  return actions;
}

export default function QuickActions({ onLogSession, onIdentify, onOptimize, onAskCurator, onViewStory, hasStoryData }) {
  const { t } = useTranslation();

  const handlers = {
    logSession: onLogSession,
    identify: onIdentify,
    optimize: onOptimize,
    collectionCurator: onAskCurator,
    viewStory: onViewStory,
  };

  const actions = getActions(hasStoryData);

  return (
    <div
      className="relative rounded-lg overflow-hidden p-5"
      style={{
        background: "linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))",
        border: "1px solid rgba(120, 90, 65, 0.3)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)",
      }}
    >
      {/* Parchment texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(80, 60, 40, 0.1) 2px,
              rgba(80, 60, 40, 0.1) 3px
            )
          `
        }}
      />

      <h3 
        className="text-xs uppercase tracking-[0.14em] font-semibold mb-4 relative"
        style={{ color: "rgba(180, 140, 75, 0.8)" }}
      >
        {t("quickActions.sectionTitle")}
      </h3>
      <div className={`grid gap-3 relative ${hasStoryData ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
        {actions.map(({ key, Icon, accent, iconColor, hoverColor, borderColor }) => (
          <button
            key={key}
            onClick={handlers[key]}
            className="flex flex-col items-center justify-center gap-3 p-4 transition-all duration-200 min-h-[90px] w-full focus-visible:outline-none group"
            style={{
              background: "linear-gradient(135deg, rgba(50, 35, 22, 0.5), rgba(42, 30, 20, 0.6))",
              border: "1px solid rgba(120, 90, 65, 0.25)",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.06)",
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110"
              style={{
                background: "linear-gradient(135deg, rgba(100, 70, 45, 0.35), rgba(80, 55, 35, 0.4))",
                border: "1px solid rgba(120, 90, 65, 0.3)",
                borderRadius: "0.375rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(180, 140, 100, 0.1)",
              }}
            >
              {key === "collectionCurator" ? (
                <img
                  src={CURATOR_ICON}
                  alt=""
                  className="w-full h-full object-cover"
                  aria-hidden="true"
                />
              ) : (
                <Icon className="w-5 h-5" style={{ color: "rgba(180, 140, 75, 0.9)" }} aria-hidden="true" />
              )}
            </div>
            <span 
              className="text-xs font-medium leading-tight text-center"
              style={{ color: "#F5F1E7" }}
            >
              {t(`quickActions.${key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}