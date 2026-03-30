import { useMemo } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

const MODULE_KEYS = ["pipekeeper", "whiskeykeeper", "winekeeper", "cigarkeeper"];

export function useEnabledModules(profile = null, user = null) {
  const { moduleStates, isLoading } = useModuleVisibility(profile, user);

  const enabledModuleKeys = useMemo(
    () => MODULE_KEYS.filter((key) => moduleStates?.[key]?.enabled === true),
    [moduleStates]
  );

  const accessibleModuleKeys = useMemo(
    () => MODULE_KEYS.filter((key) => moduleStates?.[key]?.accessible === true),
    [moduleStates]
  );

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

  return {
    enabled,
    accessible,
    enabledModuleKeys,
    accessibleModuleKeys,
    isLoading,
  };
}

export default useEnabledModules;
