import { useCallback, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { isInternalModuleTester } from "@/components/utils/moduleReleaseState";

const MODULE_KEYS = ["pipekeeper", "whiskeykeeper"];

function coercePrefsFromProfile(profile) {
  return {
    pipekeeper:
      typeof profile?.pipekeeper_enabled === "boolean"
        ? profile.pipekeeper_enabled
        : undefined,
    whiskeykeeper:
      typeof profile?.whiskeykeeper_enabled === "boolean"
        ? profile.whiskeykeeper_enabled
        : undefined,
  };
}

function buildAccessibleModules(activeModules, user) {
  const accessible = new Set(activeModules || []);

  if (isInternalModuleTester(user)) {
    accessible.add("pipekeeper");
    accessible.add("whiskeykeeper");
  }

  return accessible;
}

function buildVisibility({ profile, user, activeModules }) {
  const prefsSet = profile?.module_preferences_set === true;
  const prefs = coercePrefsFromProfile(profile);
  const accessible = buildAccessibleModules(activeModules, user);

  const visibility = {};

  for (const moduleKey of MODULE_KEYS) {
    if (prefsSet) {
      visibility[moduleKey] =
        accessible.has(moduleKey) && prefs[moduleKey] !== false;
    } else {
      visibility[moduleKey] = accessible.has(moduleKey);
    }
  }

  return visibility;
}

function buildModuleStates({ profile, user, activeModules, visibility }) {
  const accessible = buildAccessibleModules(activeModules, user);
  const tester = isInternalModuleTester(user);

  return {
    pipekeeper: {
      key: "pipekeeper",
      enabled: !!visibility.pipekeeper,
      visible: accessible.has("pipekeeper"),
      accessible: accessible.has("pipekeeper"),
      canToggle: accessible.has("pipekeeper"),
      testerOnly: false,
    },
    whiskeykeeper: {
      key: "whiskeykeeper",
      enabled: !!visibility.whiskeykeeper,
      visible: accessible.has("whiskeykeeper"),
      accessible: accessible.has("whiskeykeeper"),
      canToggle: accessible.has("whiskeykeeper"),
      testerOnly: tester,
    },
  };
}

export function useModuleVisibility(profile, user) {
  const summary = useAccessSummary();
  const { activeModules = [] } = summary || {};
  const [isLoading, setIsLoading] = useState(false);

  const visibility = useMemo(
    () => buildVisibility({ profile, user, activeModules }),
    [profile, user, activeModules]
  );

  const moduleStates = useMemo(
    () => buildModuleStates({ profile, user, activeModules, visibility }),
    [profile, user, activeModules, visibility]
  );

  const isModuleEnabled = useCallback(
    (moduleKey) => !!visibility[moduleKey],
    [visibility]
  );

  const persistPreferences = useCallback(
    async (payload) => {
      setIsLoading(true);
      try {
        const me = await base44.auth.me();
        const userId = me?.id || profile?.id || user?.id;

        if (!userId) {
          throw new Error("Unable to update module preferences.");
        }

        const normalized = {
          pipekeeper_enabled:
            typeof payload.pipekeeper_enabled === "boolean"
              ? payload.pipekeeper_enabled
              : typeof payload.pipekeeper === "boolean"
                ? payload.pipekeeper
                : undefined,
          whiskeykeeper_enabled:
            typeof payload.whiskeykeeper_enabled === "boolean"
              ? payload.whiskeykeeper_enabled
              : typeof payload.whiskeykeeper === "boolean"
                ? payload.whiskeykeeper
                : undefined,
          module_preferences_set: true,
        };

        const cleanPayload = Object.fromEntries(
          Object.entries(normalized).filter(([, value]) => value !== undefined)
        );

        return await base44.entities.User.update(userId, cleanPayload);
      } finally {
        setIsLoading(false);
      }
    },
    [profile, user]
  );

  const setModuleEnabled = useCallback(
    async (moduleId, enabled) => {
      if (!MODULE_KEYS.includes(moduleId)) {
        throw new Error(`Unknown module: ${moduleId}`);
      }

      const nextState = {
        pipekeeper: visibility.pipekeeper,
        whiskeykeeper: visibility.whiskeykeeper,
        [moduleId]: !!enabled,
      };

      const selectedCount = Object.values(nextState).filter(Boolean).length;
      if (selectedCount === 0) {
        throw new Error("At least one module must remain enabled.");
      }

      return persistPreferences(nextState);
    },
    [persistPreferences, visibility]
  );

  const saveModulePreferences = useCallback(
    async (moduleSelections) => {
      const normalized = {
        pipekeeper:
          typeof moduleSelections?.pipekeeper === "boolean"
            ? moduleSelections.pipekeeper
            : visibility.pipekeeper,
        whiskeykeeper:
          typeof moduleSelections?.whiskeykeeper === "boolean"
            ? moduleSelections.whiskeykeeper
            : visibility.whiskeykeeper,
      };

      const selectedCount = Object.values(normalized).filter(Boolean).length;
      if (selectedCount === 0) {
        throw new Error("At least one module must be selected.");
      }

      return persistPreferences(normalized);
    },
    [persistPreferences, visibility]
  );

  return {
    visibility,
    moduleStates,
    isModuleEnabled,
    isLoading,
    setModuleEnabled,
    saveModulePreferences,
  };
}

export default useModuleVisibility;