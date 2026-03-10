import React from "react";
import { BookOpen, Camera, TrendingUp, Lightbulb } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

const ACTIONS = [
  {
    key: "logSession",
    Icon: BookOpen,
    accent: "#4A7C59",
    iconColor: "text-[#6aab80]",
    bgColor: "bg-[#4A7C59]/15",
    hoverColor: "hover:bg-[#4A7C59]/25",
    borderColor: "border-[#4A7C59]/30",
  },
  {
    key: "identify",
    Icon: Camera,
    accent: "#C87941",
    iconColor: "text-[#e09060]",
    bgColor: "bg-[#C87941]/15",
    hoverColor: "hover:bg-[#C87941]/25",
    borderColor: "border-[#C87941]/30",
  },
  {
    key: "optimize",
    Icon: TrendingUp,
    accent: "#4A7C9C",
    iconColor: "text-[#6aabc0]",
    bgColor: "bg-[#4A7C9C]/15",
    hoverColor: "hover:bg-[#4A7C9C]/25",
    borderColor: "border-[#4A7C9C]/30",
  },
  {
    key: "askCurator",
    Icon: Lightbulb,
    accent: "#8b3a3a",
    iconColor: "text-[#cc7070]",
    bgColor: "bg-[#8b3a3a]/15",
    hoverColor: "hover:bg-[#8b3a3a]/25",
    borderColor: "border-[#8b3a3a]/30",
  },
];

export default function QuickActions({ onLogSession, onIdentify, onOptimize, onAskCurator }) {
  const { t } = useTranslation();

  const handlers = {
    logSession: onLogSession,
    identify: onIdentify,
    optimize: onOptimize,
    askCurator: onAskCurator,
  };

  return (
    <div>
      <div className="text-xs text-[#E0D8C8]/50 uppercase tracking-wider font-medium mb-3">
        {t("quickActions.sectionTitle")}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTIONS.map(({ key, Icon, iconColor, bgColor, hoverColor, borderColor }) => (
          <button
            key={key}
            onClick={handlers[key]}
            className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border ${borderColor} ${bgColor} ${hoverColor} transition-colors min-h-[80px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/5`}>
              <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
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
