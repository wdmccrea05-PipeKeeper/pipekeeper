import { useMemo } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

/**
 * Canonical enabled-modules hook.
 * Returns a flat { pipekeeper, whiskeykeeper, winekeeper, cigarkeeper } boolean map.
 * This is the single source of truth for conditional rendering across the app.
 */
export function useEnabledModules() {
  const { visibility, isLoading } = useModuleVisibility();

  const enabled = useMemo(
    () => ({
      pipekeeper: !!visibility?.pipekeeper,
      whiskeykeeper: !!visibility?.whiskeykeeper,
      winekeeper: !!visibility?.winekeeper,
      cigarkeeper: !!visibility?.cigarkeeper,
    }),
    [visibility]
  );

  return { enabled, isLoading };
}

export default useEnabledModules;