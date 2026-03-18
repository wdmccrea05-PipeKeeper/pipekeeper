import React from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, BookOpen, TrendingUp, Search, FlaskConical } from "lucide-react";
import { MODULE_ICONS } from "@/components/branding/moduleAssets";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";
import { useTranslation } from "@/components/i18n/safeTranslation";

function BottleQuickIcon({ className, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3h4" />
      <path d="M11 3v4l-3 5.5A4.5 4.5 0 0 0 11.9 19h.2A4.5 4.5 0 0 0 16 12.5L13 7V3" />
      <path d="M9.5 12h5" />
    </svg>
  );
}

function PipeQuickIcon({ className, style }) {
  return (
    <img
      src={MODULE_ICONS.pipeicon}
      alt="Pipe"
      className={className}
      style={{ ...style, objectFit: "contain", backgroundColor: "transparent" }}
      draggable={false}
    />
  );
}

function SectionTitle({ icon, label }) {
  const isString = typeof icon === "string";
  const IconComponent = !isString ? icon : null;
  
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3
        className="text-xs uppercase tracking-wider"
        style={{ color: "rgba(180, 140, 75, 0.6)" }}
      >
        {label}
      </h3>
    </div>
  );
}

function ActionCard({ action, navigate }) {
  const Icon = action.icon;
  const isImageIcon = typeof Icon === "string";

  return (
    <button
      onClick={() => navigate(action.path)}
      className="group p-4 rounded-xl text-left transition-all duration-300"
      style={{
        background:
          "linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.7))",
        border: "1px solid rgba(180, 140, 75, 0.15)",
      }}
    >
      <div className="w-5 h-5 mb-2 flex items-center justify-center">
        {isImageIcon ? (
          <img
            src={Icon}
            alt={action.label}
            className="w-5 h-5 object-contain transition-transform group-hover:scale-110 bg-transparent"
            style={{ backgroundColor: "transparent" }}
            draggable={false}
          />
        ) : Icon ? (
          <Icon
            className="w-5 h-5 transition-transform group-hover:scale-110"
            style={{ color: action.accent }}
          />
        ) : null}
      </div>
      <p className="text-sm font-semibold text-[#E0D8C8]">{action.label}</p>
    </button>
  );
}

export default function QuickLaunch() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isModuleEnabled } = useModuleVisibility();

  const pipeActions = [
    {
      label: t("quickActions.addPipe", "Add Pipe"),
      icon: "/branding/pipe-icon.png?v=3",
      path: "/PipeForm",
      accent: "#D4A574",
    },
    {
      label: t("quickActions.addBlend", "Add Blend"),
      icon: Leaf,
      path: "/TobaccoForm",
      accent: "#7C9A6D",
    },
    {
      label: t("quickActions.logSession", "Log Session"),
      icon: BookOpen,
      path: "/SmokingLog",
      accent: "#C87941",
    },
    {
      label: t("nav.insights", "Insights"),
      icon: TrendingUp,
      path: "/Insights",
      accent: "#8B5CF6",
    },
  ];

  const whiskeyActions = [
    {
      label: t("quickActions.addBottle", "Add Bottle"),
      icon: BottleQuickIcon,
      path: "/BottleForm",
      accent: "#D4A574",
    },
    {
      label: t("quickActions.quickSearchBottle", "Quick Search Bottle"),
      icon: Search,
      path: "/WhiskeyKeeper",
      accent: "#B48C4B",
    },
    {
      label: t("quickActions.logTasting", "Log Tasting"),
      icon: BookOpen,
      path: "/Tastings",
      accent: "#C87941",
    },
    {
      label: t("nav.insights", "Insights"),
      icon: TrendingUp,
      path: "/WhiskeyInsights",
      accent: "#8B5CF6",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          {t("hub.quickLaunch", "Quick Launch")}
        </h2>

        <div>
          <SectionTitle icon={MODULE_ICONS.pipeicon} label={t("nav.pipekeeper", "PipeKeeper")} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipeActions.map((action) => (
              <ActionCard
                key={`${action.path}-${action.label}`}
                action={action}
                navigate={navigate}
              />
            ))}
          </div>
        </div>

        {isModuleEnabled("whiskeykeeper") ? (
          <div>
            <SectionTitle icon={FlaskConical} label={t("nav.whiskeykeeper", "WhiskeyKeeper")} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {whiskeyActions.map((action) => (
                <ActionCard
                  key={`${action.path}-${action.label}`}
                  action={action}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}