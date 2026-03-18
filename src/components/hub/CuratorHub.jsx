import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import {
  buildCuratorHubContext,
  prepareCuratorNavigationState,
  buildCuratorEntryText,
} from "@/components/keeper-core";
import { useEnabledKeeperModules } from "@/components/hooks/useEnabledKeeperModules";
import { getModuleAsset, getAssetImageStyle } from "@/components/branding/moduleAssets";

export default function CuratorHub({ summary = null, recentActivities = [] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { moduleStates } = useEnabledKeeperModules();

  const curatorContext = useMemo(
    () => buildCuratorHubContext(summary, recentActivities, {}, moduleStates),
    [summary, recentActivities, moduleStates]
  );

  const entryText = useMemo(
    () => buildCuratorEntryText(curatorContext),
    [curatorContext]
  );

  const handleCuratorClick = () => {
    const navigationState = prepareCuratorNavigationState(curatorContext);
    navigate("/Curator", { state: navigationState });
  };

  const curatorAsset = getModuleAsset("curator");

  return (
    <div
      className="rounded-2xl p-6 flex items-center justify-between gap-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(60, 42, 24, 0.85), rgba(40, 28, 16, 0.95))",
        border: "1px solid rgba(212, 164, 116, 0.35)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,164,116,0.1)",
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 80% 50%, rgba(212,164,116,0.4) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div className="flex items-start gap-4 flex-1 relative z-10">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent"
          style={{
            background: "rgba(212, 164, 116, 0.12)",
            border: "1px solid rgba(212, 164, 116, 0.25)",
          }}
        >
          <img
            src={curatorAsset.src}
            alt={t("hub.curatorTitle", "Collection Curator")}
            className="w-12 h-12 object-contain bg-transparent"
            style={getAssetImageStyle("curator")}
            draggable={false}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#F5F1E7" }}>
            {t("hub.curatorTitle", "Collection Curator")}
          </h3>
          <p className="text-sm mt-1" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
            {t(
              "hub.curatorDescription",
              "Get AI-powered insights, recommendations, and guidance across your entire collection."
            )}
          </p>
          {entryText ? (
            <p className="text-xs mt-2" style={{ color: "rgba(212, 164, 116, 0.85)" }}>
              {entryText}
            </p>
          ) : null}
        </div>
      </div>

      <Button
        onClick={handleCuratorClick}
        className="flex items-center gap-2 flex-shrink-0 relative z-10"
        style={{
          background: "linear-gradient(135deg, #D4A574, #C99A66)",
          color: "#1a1410",
          fontWeight: 600,
        }}
      >
        {t("hub.curatorAction", "Open Curator")}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}