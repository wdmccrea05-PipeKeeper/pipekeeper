import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { MODULE_ICONS } from "@/components/branding/moduleAssets";
import {
  isModuleLaunched,
  isModuleInternal,
  isInternalModuleTester,
  isModuleBlocked,
} from "@/components/utils/moduleReleaseState";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Switch } from "@/components/ui/switch";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { moduleStates, setModuleEnabled, isLoading, user } = useModuleVisibility(profile, passedUser);
  const { hasPaid } = useCurrentUser();
  const [saving, setSaving] = useState(null);

  const effectiveUser = passedUser || user;
  const isTester = isInternalModuleTester(effectiveUser);
  const pipekeeperPaid = !!effectiveUser?.pipekeeper_paid;
  const whiskeykeeperPaid = !!effectiveUser?.whiskeykeeper_paid;
  const cigarkeeperPaid = !!effectiveUser?.cigarkeeper_paid;
  const winekeeperPaid = !!effectiveUser?.winekeeper_paid;
  const paidFlagByModule = {
    pipekeeper: pipekeeperPaid,
    whiskeykeeper: whiskeykeeperPaid,
    cigarkeeper: cigarkeeperPaid,
    winekeeper: winekeeperPaid,
  };
  const paidModuleIds = Object.keys(paidFlagByModule);

  const MODULE_CONFIG = [
    {
      id: "pipekeeper",
      label: t("hub.pipekeeper", "PipeKeeper"),
      description: t("pipekeeper.description", "Pipe collection, tobacco, smoking logs, and pairings."),
      icon: MODULE_ICONS.pipekeeper,
      launched: isModuleLaunched("pipekeeper", effectiveUser),
      internalModule: isModuleInternal("pipekeeper", effectiveUser),
      blocked: isModuleBlocked("pipekeeper", effectiveUser),
      allowToggle: true,
      hidden: false,
    },
    {
      id: "whiskeykeeper",
      label: t("hub.whiskeykeeper", "WhiskeyKeeper"),
      description: t("whiskeykeeper.description", "Whiskey collection, tasting notes, and inventory."),
      icon: MODULE_ICONS.whiskeykeeper,
      launched: isModuleLaunched("whiskeykeeper", effectiveUser),
      internalModule: isModuleInternal("whiskeykeeper", effectiveUser),
      blocked: isModuleBlocked("whiskeykeeper", effectiveUser),
      allowToggle: true,
      alcoholRelated: true,
      hidden: false,
    },
    {
      id: "winekeeper",
      label: t("hub.winekeeper", "WineKeeper"),
      description: t("profile.winekeeperDescription", "Wine cellar management and bottle tracking."),
      icon: MODULE_ICONS.winekeeper,
      launched: isModuleLaunched("winekeeper", effectiveUser),
      internalModule: isModuleInternal("winekeeper", effectiveUser),
      blocked: isModuleBlocked("winekeeper", effectiveUser),
      allowToggle: false,
      alcoholRelated: true,
      hidden: !isTester && isModuleBlocked("winekeeper", effectiveUser),
    },
    {
      id: "cigarkeeper",
      label: t("hub.cigarkeeper", "CigarKeeper"),
      description: t("profile.cigarkeeperDescription", "Cigar collection curation and tasting."),
      icon: MODULE_ICONS.cigarkeeper,
      launched: isModuleLaunched("cigarkeeper", effectiveUser),
      internalModule: isModuleInternal("cigarkeeper", effectiveUser),
      blocked: isModuleBlocked("cigarkeeper", effectiveUser),
      allowToggle: isTester,
      hidden: !isTester,
    },
  ].filter((mod) => !mod.hidden);

  async function handleSetTierAndEnable(moduleId, isPaid) {
    const hasEntitlement = !!paidFlagByModule[moduleId];

    if (isPaid && !hasEntitlement) {
      navigate("/Subscription");
      return;
    }

    setSaving(moduleId);
    try {
      const key = `${moduleId}_paid`;
      const validPaidKeys = paidModuleIds.map((id) => `${id}_paid`);
      if (!validPaidKeys.includes(key)) {
        throw new Error("Unsupported module entitlement key");
      }

      // Important: this only changes local module mode.
      // It must NOT mutate or cancel the actual subscription.
      await base44.auth.updateMe({ [key]: !!isPaid });
      await setModuleEnabled(moduleId, true);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["current-user"] }),
        queryClient.invalidateQueries({ queryKey: ["canonical-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
      ]);

      toast.success(isPaid ? t("profile.switchedToPro", "Switched to Pro mode") : t("profile.switchedToFree", "Switched to Free mode"));
    } catch (e) {
      console.error("[ModuleVisibility] tier toggle error:", e);
      toast.error("Could not update module settings");
    } finally {
      setSaving(null);
    }
  }

  async function handleModuleVisibility(moduleId, enabled) {
    setSaving(moduleId);
    try {
      await setModuleEnabled(moduleId, enabled);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["canonical-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
      ]);

      const moduleLabel = MODULE_CONFIG.find((m) => m.id === moduleId)?.label || moduleId;
      toast.success(
        enabled
          ? `${moduleLabel} ${t("profile.enabledSuffix", "enabled")}`
          : `${moduleLabel} ${t("profile.hiddenSuffix", "hidden")}`
      );
    } catch (e) {
      console.error("[ModuleVisibility] visibility toggle error:", e);
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
          // Allow toggle for launched modules that are accessible (already enabled or entitlements met)
          const canToggle = (mod.id === 'pipekeeper' || mod.id === 'whiskeykeeper') ? (mod.launched && state?.accessible) : (mod.allowToggle && state?.canToggle);
          const isSavingThis = saving === mod.id;

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
                    ) : mod.blocked ? (
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
                    {mod.blocked
                      ? `${mod.description} (${t("hub.comingSoon", "Coming Soon")})`
                      : mod.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {mod.launched && paidModuleIds.includes(mod.id) ? (
                  <>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(value) => handleModuleVisibility(mod.id, value)}
                      disabled={isSavingThis}
                    />
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={
                          paidFlagByModule[mod.id] ? "default" : "outline"
                        }
                        onClick={() => handleSetTierAndEnable(mod.id, true)}
                        disabled={isSavingThis}
                        className="text-xs"
                      >
                        Pro
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          !paidFlagByModule[mod.id] && enabled ? "default" : "outline"
                        }
                        onClick={() => handleSetTierAndEnable(mod.id, false)}
                        disabled={isSavingThis}
                        className="text-xs"
                      >
                        Free
                      </Button>
                    </div>
                  </>
                ) : !canToggle ? (
                  <Lock className="w-3.5 h-3.5 text-stone-500" title="Unavailable" />
                ) : null}
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
