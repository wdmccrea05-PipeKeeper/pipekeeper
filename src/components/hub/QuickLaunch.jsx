import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  BookOpen,
  TrendingUp,
  Search,
  PackagePlus,
  FlaskConical,
  Flame,
} from "lucide-react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";
import { useTranslation } from "@/components/i18n/safeTranslation";

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon
        className="w-4 h-4"
        style={{ color: "rgba(180, 140, 75, 0.85)" }}
      />
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
        <Icon
          className="w-5 h-5 transition-transform group-hover:scale-110"
          style={{ color: action.accent }}
        />
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
      icon: Flame,
      path: "/PipeForm",
      accent: "#D4A574",
    },
    {
      label: t("quickActions.addBlend", "Add Blend"),
      icon: Plus,
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
      icon: PackagePlus,
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
          <SectionTitle icon={Flame} label={t("nav.pipekeeper", "PipeKeeper")} />
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
            <SectionTitle
              icon={FlaskConical}
              label={t("nav.whiskeykeeper", "WhiskeyKeeper")}
            />
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