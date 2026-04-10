import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isInternalModuleTester, isModuleLaunched } from "@/components/utils/moduleReleaseState";
import { useCanonicalProfile } from "@/utils/getCanonicalUserProfile";

const MODULE_KEYS = ["pipekeeper", "whiskeykeeper", "winekeeper", "cigarkeeper"];

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function buildAccessibleModules(profile, activeModules, user) {
  const accessible = new Set(activeModules || []);

  // Tester override
  if (isInternalModuleTester(user)) {
    accessible.add("pipekeeper");
    accessible.add("whiskeykeeper");
    accessible.add("winekeeper");
    accessible.add("cigarkeeper");
  }

  // Free-tier onboarding fallback: if user explicitly selected a launched module
  // during first-run setup, make it accessible even without paid subscription
  if (profile?.module_preferences_set === true) {
    for (const key of ["pipekeeper", "whiskeykeeper", "winekeeper", "cigarkeeper"]) {
      // User can always access launched modules they explicitly enabled during onboarding,
      // even if they don't have a paid entitlement. This ensures free users who selected
      // a module on signup retain access to it.
      if (isModuleLaunched(key) && profile?.[`${key}_enabled`] === true) {
        accessible.add(key);
      }
    }
  }

  return accessible;
}

function buildVisibility({ profile, user, activeModules }) {
  const prefsSet = profile?.module_preferences_set === true;
  const accessible = buildAccessibleModules(profile, activeModules, user);

  const prefMap = {
    pipekeeper: normalizeBoolean(profile?.pipekeeper_enabled),
    whiskeykeeper: normalizeBoolean(profile?.whiskeykeeper_enabled),
    winekeeper: normalizeBoolean(profile?.winekeeper_enabled),
    cigarkeeper: normalizeBoolean(profile?.cigarkeeper_enabled),
  };

  const visibility = {};

  for (const key of MODULE_KEYS) {
    if (prefsSet) {
      visibility[key] = accessible.has(key) && prefMap[key] !== false;
    } else {
      visibility[key] = accessible.has(key);
    }
  }

  return visibility;
}

function buildModuleStates({ profile, user, activeModules, visibility }) {
  const accessible = buildAccessibleModules(profile, activeModules, user);
  const tester = isInternalModuleTester(user);

  // For free users with preferences set: a launched module they explicitly enabled
  // becomes toggleable even without paid entitlement
  const isFreeTierWithPrefs = profile?.module_preferences_set === true;

  return {
    pipekeeper: {
      key: "pipekeeper",
      enabled: !!visibility.pipekeeper,
      accessible: accessible.has("pipekeeper"),
      visible: accessible.has("pipekeeper"),
      canToggle: accessible.has("pipekeeper") || (isFreeTierWithPrefs && isModuleLaunched("pipekeeper") && profile?.pipekeeper_enabled),
      testerOnly: false,
    },
    whiskeykeeper: {
      key: "whiskeykeeper",
      enabled: !!visibility.whiskeykeeper,
      accessible: accessible.has("whiskeykeeper"),
      visible: accessible.has("whiskeykeeper"),
      canToggle: accessible.has("whiskeykeeper") || (isFreeTierWithPrefs && isModuleLaunched("whiskeykeeper") && profile?.whiskeykeeper_enabled),
      testerOnly: false, // WhiskeyKeeper is publicly launched
    },
    winekeeper: {
      key: "winekeeper",
      enabled: !!visibility.winekeeper,
      accessible: accessible.has("winekeeper"),
      visible: accessible.has("winekeeper"),
      canToggle: accessible.has("winekeeper") || (isFreeTierWithPrefs && isModuleLaunched("winekeeper") && profile?.winekeeper_enabled),
      testerOnly: tester,
    },
    cigarkeeper: {
      key: "cigarkeeper",
      enabled: !!visibility.cigarkeeper,
      accessible: accessible.has("cigarkeeper"),
      visible: accessible.has("cigarkeeper"),
      canToggle: accessible.has("cigarkeeper") || (isFreeTierWithPrefs && isModuleLaunched("cigarkeeper") && profile?.cigarkeeper_enabled),
      testerOnly: tester,
    },
  };
}

export function useModuleVisibility(passedProfile = null, passedUser = null) {
  const queryClient = useQueryClient();
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: canonicalProfileData, isLoading: profileLoading } = useCanonicalProfile();
  const { activeModules = [] } = useAccessSummary() || {};

  const user = passedUser || currentUser || null;
  const profile = passedProfile || canonicalProfileData?.profile || null;
  const profileId = profile?.id || canonicalProfileData?.profileId || null;

  const [isSaving, setIsSaving] = useState(false);

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
      setIsSaving(true);
      try {
        const me = user || (await base44.auth.me());
        const userId = me?.id || me?.auth_user_id;
        const userEmail = me?.email || profile?.user_email || profile?.created_by || null;

        if (!userId && !userEmail) {
          throw new Error("Unable to determine user identity for module preferences.");
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
          winekeeper_enabled:
            typeof payload.winekeeper_enabled === "boolean"
              ? payload.winekeeper_enabled
              : typeof payload.winekeeper === "boolean"
                ? payload.winekeeper
                : undefined,
          cigarkeeper_enabled:
            typeof payload.cigarkeeper_enabled === "boolean"
              ? payload.cigarkeeper_enabled
              : typeof payload.cigarkeeper === "boolean"
                ? payload.cigarkeeper
                : undefined,
          module_preferences_set: true,
        };

        const cleanPayload = Object.fromEntries(
          Object.entries(normalized).filter(([, value]) => value !== undefined)
        );

        if (profileId) {
          await base44.entities.UserProfile.update(profileId, cleanPayload);
        } else {
          await base44.entities.UserProfile.create({
            user_id: userId || undefined,
            user_email: userEmail || undefined,
            created_by: userEmail || undefined,
            ...cleanPayload,
          });
        }

        await queryClient.invalidateQueries({ queryKey: ["canonical-profile"] });
        await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      } finally {
        setIsSaving(false);
      }
    },
    [profileId, profile?.user_email, profile?.created_by, queryClient, user]
  );

  const setModuleEnabled = useCallback(
    async (moduleId, enabled) => {
      if (!MODULE_KEYS.includes(moduleId)) {
        throw new Error(`Unknown module: ${moduleId}`);
      }

      const nextState = {
        pipekeeper: visibility.pipekeeper,
        whiskeykeeper: visibility.whiskeykeeper,
        winekeeper: visibility.winekeeper,
        cigarkeeper: visibility.cigarkeeper,
        [moduleId]: !!enabled,
      };

      await persistPreferences(nextState);
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
        winekeeper:
          typeof moduleSelections?.winekeeper === "boolean"
            ? moduleSelections.winekeeper
            : visibility.winekeeper,
        cigarkeeper:
          typeof moduleSelections?.cigarkeeper === "boolean"
            ? moduleSelections.cigarkeeper
            : visibility.cigarkeeper,
      };

      await persistPreferences(normalized);
    },
    [persistPreferences, visibility]
  );

  return {
    visibility,
    moduleStates,
    isModuleEnabled,
    isLoading: userLoading || profileLoading || isSaving,
    setModuleEnabled,
    saveModulePreferences,
    profile,
    user,
  };
}

export default useModuleVisibility;