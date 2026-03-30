import { useMemo } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

const MODULE_KEYS = ["pipekeeper", "whiskeykeeper", "winekeeper", "cigarkeeper"];

export function useEnabledModules(profile = null, user = null) {
  const { moduleStates, isLoading } = useModuleVisibility(profile, user);

  const enabledModuleKeys = useMemo(() => {
    return MODULE_KEYS.filter((key) => moduleStates?.[key]?.enabled === true);
  }, [moduleStates]);

  const accessibleModuleKeys = useMemo(() => {
    return MODULE_KEYS.filter((key) => moduleStates?.[key]?.accessible === true);
  }, [moduleStates]);

  const enabled = useMemo(
    () => ({
      pipekeeper: enabledModuleKeys.includes("pipekeeper"),
      whiskeykeeper: enabledModuleKeys.includes("whiskeykeeper"),
      winekeeper: enabledModuleKeys.includes("winekeeper"),
      cigarkeeper: enabledModuleKeys.includes("cigarkeeper"),
    }),
    [enabledModuleKeys]
  );

  const accessible = useMemo(
    () => ({
      pipekeeper: accessibleModuleKeys.includes("pipekeeper"),
      whiskeykeeper: accessibleModuleKeys.includes("whiskeykeeper"),
      winekeeper: accessibleModuleKeys.includes("winekeeper"),
      cigarkeeper: accessibleModuleKeys.includes("cigarkeeper"),
    }),
    [accessibleModuleKeys]
  );

  const hasMultipleEnabledModules = enabledModuleKeys.length > 1;
  const hasSingleEnabledModule = enabledModuleKeys.length === 1;
  const singleEnabledModule = hasSingleEnabledModule ? enabledModuleKeys[0] : null;

  function isModuleEnabled(moduleKey) {
    return enabledModuleKeys.includes(moduleKey);
  }

  function isModuleAccessible(moduleKey) {
    return accessibleModuleKeys.includes(moduleKey);
  }

  return {
    isLoading,
    enabled,
    accessible,
    enabledModuleKeys,
    accessibleModuleKeys,
    hasMultipleEnabledModules,
    hasSingleEnabledModule,
    singleEnabledModule,
    isModuleEnabled,
    isModuleAccessible,
  };
}

export default useEnabledModules;
