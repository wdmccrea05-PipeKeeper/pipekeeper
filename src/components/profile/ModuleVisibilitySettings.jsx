import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Lock } from "lucide-react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { MODULE_ICONS } from "@/components/branding/moduleAssets";
import { isModuleLaunched, isModuleInternal, isInternalModuleTester } from "@/components/utils/moduleReleaseState";

function ModuleIcon({ src, alt, className }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className || "w-7 h-7 object-contain bg-transparent"}
      style={{
        backgroundColor: "transparent",
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
      }}
      draggable={false}
    />
  );
}

export default function ModuleVisibilitySettings({ profile = null, user: passedUser = null, compact = false }) {
  const { t } = useTranslation();
  const { moduleStates, setModuleEnabled, isLoading, user } = useModuleVisibility(profile, passedUser);
  const [saving, setSaving] = useState(null);

  const effectiveUser = passedUser || user;
  const isTester = isInternalModuleTester(effectiveUser);

  const MODULE_CONFIG = [
    {
      id: "pipekeeper",
      label: t("hub.pipekeeper", "PipeKeeper"),
      description: t("pipekeeper.description", "Pipe collection, tobacco, smoking logs, and pairings."),
      icon: MODULE_ICONS.pipekeeper,
      launched: isModuleLaunched("pipekeeper"),
      allowToggle: true,
    },
    {
      id: "whiskeykeeper",
      label: t("hub.whiskeykeeper", "WhiskeyKeeper"),
      description: t("whiskeykeeper.description", "Whiskey collection, tasting notes, and inventory."),
      icon: MODULE_ICONS.whiskeykeeper,
      launched: isModuleLaunched("whiskeykeeper"),
      internalModule: isModuleInternal("whiskeykeeper"),
      allowToggle: true,
      alcoholRelated: true,
      hidden: !isTester,
    },
    {
      id: "winekeeper",
      label: t("hub.winekeeper", "WineKeeper"),
      description: t("profile.winekeeperDescription", "Wine cellar management and bottle tracking."),
      icon: MODULE_ICONS.winekeeper,
      launched: isModuleLaunched("winekeeper"),
      allowToggle: false,
      alcoholRelated: true,
    },
    {
      id: "cigarkeeper",
      label: t("hub.cigarkeeper", "CigarKeeper"),
      description: t("profile.cigarkeeperDescription", "Cigar collection curation and tasting."),
      icon: MODULE_ICONS.cigarkeeper,
      launched: isModuleLaunched("cigarkeeper"),
      internalModule: isModuleInternal("cigarkeeper"),
      allowToggle: isTester,
      hidden: !isTester,
    },
  ].filter((mod) => !mod.hidden);

  async function handleToggle(moduleId, enabled) {
    setSaving(moduleId);
    try {
      await setModuleEnabled(moduleId, enabled);
      const moduleLabel = MODULE_CONFIG.find((m) => m.id === moduleId)?.label || moduleId;
      toast.success(
        enabled
          ? `${moduleLabel} ${t("profile.enabledSuffix", "enabled")}`
          : `${moduleLabel} ${t("profile.hiddenSuffix", "hidden")}`
      );
    } catch (e) {
      console.error("[ModuleVisibility] toggle error:", e);
      toast.error(e?.message || t("profile.moduleSaveError", "Could not save module preference."));
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      {!compact ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-stone-100 text-base">
              {t("hub.activeModules", "Active Modules")}
            </span>
          </div>
          <p className="text-xs text-stone-400 mb-3">
            {t(
              "profile.moduleVisibilityDescription",
              "Choose which collection modules appear in your navigation and Hub. Hiding a module never deletes your data — you can re-enable it at any time."
            )}
          </p>
        </>
      ) : null}

      <div className="space-y-3">
        {MODULE_CONFIG.map((mod) => {
          const state = moduleStates[mod.id];
          const enabled = state?.enabled === true;
          const canToggle = mod.allowToggle && state?.canToggle;
          const isSaving = saving === mod.id;

          return (
            <div
              key={mod.id}
              className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all ${
                enabled
                  ? "bg-stone-800/50 border-stone-700"
                  : "bg-stone-800/30 border-stone-700/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ModuleIcon
                  src={mod.icon}
                  alt={mod.label}
                  className="w-8 h-8 object-contain flex-shrink-0 bg-transparent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-100 text-sm">{mod.label}</span>
                    {mod.internalModule && isTester ? (
                      <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0 px-1.5 py-0">
                        {t("profile.internalPreview", "Internal Preview")}
                      </Badge>
                    ) : !mod.launched ? (
                      <Badge className="text-[10px] bg-stone-200 text-stone-600 border-0 px-1.5 py-0">
                        {t("hub.comingSoon", "Coming Soon")}
                      </Badge>
                    ) : null}
                    {mod.alcoholRelated ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0 px-1.5 py-0">
                        {t("profile.alcoholBadge", "Alcohol")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">
                    {mod.launched || (mod.internalModule && isTester)
                      ? mod.description
                      : `${mod.description} (${t("hub.comingSoon", "Coming Soon")})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {canToggle ? (
                  <Switch
                    checked={enabled}
                    onCheckedChange={(value) => handleToggle(mod.id, value)}
                    disabled={isSaving}
                  />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-stone-500" title={mod.internalModule ? "Internal Module" : "Coming Soon"} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!compact ? (
        <p className="text-xs text-stone-500 mt-2">
          {t(
            "profile.moduleVisibilityNote",
            "Hiding a module removes it from navigation, Hub, and recommendations. Your records remain stored and fully intact."
          )}
        </p>
      ) : null}
    </div>
  );
}
