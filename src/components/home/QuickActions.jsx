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
      className="relative rounded-2xl overflow-hidden p-4"
      style={{
        background: "linear-gradient(145deg, #141f2d 0%, #0f1920 60%, rgba(74,124,89,0.08) 100%)",
        border: "1px solid rgba(224,216,200,0.12)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.30)",
      }}
    >
      {/* Subtle grain texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="qa-grain" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="12" r="0.38" fill="#E0D8C8" fillOpacity="0.030" />
            <circle cx="24" cy="5" r="0.28" fill="#E0D8C8" fillOpacity="0.022" />
            <circle cx="41" cy="19" r="0.42" fill="#E0D8C8" fillOpacity="0.028" />
            <circle cx="60" cy="8" r="0.32" fill="#E0D8C8" fillOpacity="0.030" />
            <circle cx="73" cy="27" r="0.38" fill="#E0D8C8" fillOpacity="0.022" />
            <circle cx="14" cy="37" r="0.28" fill="#E0D8C8" fillOpacity="0.028" />
            <circle cx="47" cy="45" r="0.42" fill="#E0D8C8" fillOpacity="0.030" />
            <circle cx="66" cy="55" r="0.32" fill="#E0D8C8" fillOpacity="0.022" />
            <circle cx="29" cy="67" r="0.38" fill="#E0D8C8" fillOpacity="0.028" />
            <circle cx="53" cy="75" r="0.28" fill="#E0D8C8" fillOpacity="0.030" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#qa-grain)" />
      </svg>

      <div className="text-xs text-[#E0D8C8]/50 uppercase tracking-wider font-medium mb-3 relative">
        {t("quickActions.sectionTitle")}
      </div>
      <div className={`grid gap-3 relative ${hasStoryData ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
        {actions.map(({ key, Icon, accent, iconColor, hoverColor, borderColor }) => (
          <button
            key={key}
            onClick={handlers[key]}
            className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border ${borderColor} ${hoverColor} transition-all duration-200 min-h-[80px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30`}
            style={{
              background: `linear-gradient(145deg, ${accent}14 0%, ${accent}08 55%, ${accent}1a 100%)`,
              boxShadow: `inset 0 1px 0 ${accent}12`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${accent}38 0%, ${accent}1c 100%)`,
                border: `1px solid ${accent}45`,
                boxShadow: `0 0 12px ${accent}30`,
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
                <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
              )}
            </div>
            <span className="text-sm font-medium text-[#E0D8C8] leading-tight">
              {t(`quickActions.${key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}