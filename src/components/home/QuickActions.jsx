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
      <div className={`grid gap-3.5 relative ${hasStoryData ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
        {actions.map(({ key, Icon, accent, iconColor, hoverColor, borderColor }) => (
          <button
            key={key}
            onClick={() => {
              const handler = handlers[key];
              if (handler) handler();
            }}
            disabled={!handlers[key]}
            className="flex flex-col items-center justify-center gap-3 p-5 transition-all duration-200 min-h-[100px] w-full focus-visible:outline-none group hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t(`quickActions.${key}`)}
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
              {key === "collectionCurator" ? (
                <img
                  src={CURATOR_ICON}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: 'hue-rotate(35deg) saturate(0.8) brightness(1.1)' }}
                  aria-hidden="true"
                />
              ) : (
                <Icon className="w-4 h-4" style={{ color: "rgba(180, 140, 75, 0.95)" }} aria-hidden="true" />
              )}
            </div>
            <span 
              className="text-xs font-semibold leading-tight text-center"
              style={{ 
                color: "#F5F1E7",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)"
              }}
            >
              {t(`quickActions.${key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}