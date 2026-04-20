import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Leaf, BookOpen, TrendingUp, Sparkles } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEnabledModules } from "@/components/hooks/useEnabledModules";
import { useTranslation } from "@/components/i18n/safeTranslation";
import LogSessionSelector from "@/components/session/LogSessionSelector";
import CombinedSessionModal from "@/components/session/CombinedSessionModal";

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

function SectionTitle({ label }) {
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

function ActionCard({ action, navigate, onClick }) {
  const Icon = action.icon;
  const isImageIcon = typeof Icon === "string";

  return (
    <button
      onClick={onClick || (() => navigate(action.path))}
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
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const { enabled } = useEnabledModules();

  const [showLogSelector, setShowLogSelector] = useState(false);
  const [showCombinedModal, setShowCombinedModal] = useState(false);

  const whiskeyEnabled = enabled.whiskeykeeper;
  const pipekeeperEnabled = enabled.pipekeeper;
  const hasDualSessionModules = whiskeyEnabled && pipekeeperEnabled;

  const { data: combinedSessionData } = useQuery({
    queryKey: ["quick-launch-combined-session-data", user?.email, pipekeeperEnabled, whiskeyEnabled],
    enabled: !!user?.email && hasDualSessionModules && showCombinedModal,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [pipes, blends, bottles] = await Promise.all([
        pipekeeperEnabled
          ? base44.entities.Pipe.filter({ created_by: user.email }, "-updated_date", 500).catch(() => [])
          : Promise.resolve([]),
        pipekeeperEnabled
          ? base44.entities.TobaccoBlend.filter({ created_by: user.email }, "-updated_date", 500).catch(() => [])
          : Promise.resolve([]),
        whiskeyEnabled
          ? base44.entities.Bottle.filter({ created_by: user.email }, "-updated_date", 500).catch(() => [])
          : Promise.resolve([]),
      ]);

      return {
        pipes: Array.isArray(pipes) ? pipes : [],
        blends: Array.isArray(blends) ? blends : [],
        bottles: Array.isArray(bottles) ? bottles : [],
      };
    },
  });

  const handleOpenCombinedSessionFlow = () => {
    setShowLogSelector(false);
    setShowCombinedModal(true);
  };

  const pipeActions = useMemo(
    () => [
      {
        label: t("quickActions.addPipe"),
        icon: "/branding/pipe-icon.png?v=3",
        path: "/Pipes?action=add",
        accent: "#D4A574",
      },
      {
        label: t("quickActions.addBlend"),
        icon: Leaf,
        path: "/Tobacco?action=add",
        accent: "#7C9A6D",
      },
      {
        label: t("quickActions.identifyPipe"),
        icon: Sparkles,
        path: "/PipeKeeper?action=identify",
        accent: "#F0C58A",
      },
      {
        label: t("quickActions.logSession"),
        icon: BookOpen,
        path: "/PipeKeeper?action=log-smoke",
        accent: "#C87941",
        onClick: hasDualSessionModules ? () => setShowLogSelector(true) : undefined,
      },
      {
        label: t("nav.insights"),
        icon: TrendingUp,
        path: "/Insights",
        accent: "#8B5CF6",
      },
    ],
    [hasDualSessionModules, t]
  );

  const whiskeyActions = useMemo(
    () => [
      {
        label: t("whiskeykeeper.addBottle"),
        icon: BottleQuickIcon,
        path: "/Whiskey?action=add",
        accent: "#D4A574",
      },
      {
        label: hasDualSessionModules
          ? t("quickActions.logSession")
          : t("quickActions.logTasting"),
        icon: BookOpen,
        path: "/Tastings?action=log",
        accent: "#C87941",
        onClick: hasDualSessionModules ? () => setShowLogSelector(true) : undefined,
      },
      {
        label: t("nav.insights"),
        icon: TrendingUp,
        path: "/WhiskeyInsights",
        accent: "#8B5CF6",
      },
    ],
    [hasDualSessionModules, t]
  );

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          <h2
            className="text-sm uppercase tracking-[0.12em] font-semibold"
            style={{ color: "rgba(180, 140, 75, 0.8)" }}
          >
            {t("hub.quickLaunch")}
          </h2>

          {pipekeeperEnabled ? (
            <div>
              <SectionTitle label={t("nav.pipekeeper")} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pipeActions.map((action) => (
                  <ActionCard
                    key={`${action.path}-${action.label}`}
                    action={action}
                    navigate={navigate}
                    onClick={action.onClick}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {whiskeyEnabled ? (
            <div>
              <SectionTitle label={t("nav.whiskeykeeper")} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {whiskeyActions.map((action) => (
                  <ActionCard
                    key={`${action.path}-${action.label}`}
                    action={action}
                    navigate={navigate}
                    onClick={action.onClick}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <LogSessionSelector
        isOpen={showLogSelector}
        onClose={() => setShowLogSelector(false)}
        pipeEnabled={pipekeeperEnabled}
        whiskeyEnabled={whiskeyEnabled}
        onSelectPipe={() => navigate("/PipeKeeper?action=log-smoke")}
        onSelectWhiskey={() => navigate("/Tastings?action=log")}
        onSelectCombined={handleOpenCombinedSessionFlow}
      />

      <CombinedSessionModal
        isOpen={showCombinedModal}
        onClose={() => setShowCombinedModal(false)}
        pipes={combinedSessionData?.pipes || []}
        blends={combinedSessionData?.blends || []}
        bottles={combinedSessionData?.bottles || []}
        onSaved={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["quick-launch-combined-session-data"] }),
            queryClient.invalidateQueries({ queryKey: ["collection-hub-dashboard"] }),
            queryClient.invalidateQueries({ queryKey: ["smokingLogs", user?.email] }),
          ]);
        }}
      />
    </>
  );
}
