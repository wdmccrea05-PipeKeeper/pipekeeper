import { useMemo } from "react";
import { isInternalModuleTester } from "@/components/utils/moduleReleaseState";
import { useAccessSummary } from "@/components/access/useAccessSummary";

export function useModuleVisibility(profile, user) {
  const { activeModules } = useAccessSummary();

  const prefsSet = profile?.module_preferences_set === true;

  const visibility = useMemo(() => {
    const tester = isInternalModuleTester(user);

    // STEP 1 — derive accessible modules (entitlement + tester override)
    const accessibleModules = new Set(activeModules || []);

    if (tester) {
      accessibleModules.add("pipekeeper");
      accessibleModules.add("whiskeykeeper");
    }

    // STEP 2 — apply saved preferences if present
    if (prefsSet) {
      return {
        pipekeeper:
          accessibleModules.has("pipekeeper") &&
          profile?.pipekeeper_enabled !== false,

        whiskeykeeper:
          accessibleModules.has("whiskeykeeper") &&
          profile?.whiskeykeeper_enabled !== false,
      };
    }

    // STEP 3 — no prefs → use accessible modules ONLY
    return {
      pipekeeper: accessibleModules.has("pipekeeper"),
      whiskeykeeper: accessibleModules.has("whiskeykeeper"),
    };
  }, [profile, user, prefsSet, activeModules]);

  const saveModulePreferences = async (updates, updateProfile) => {
    await updateProfile({
      ...updates,
      module_preferences_set: true,
    });
  };

  return {
    visibility,
    saveModulePreferences,
  };
}