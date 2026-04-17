import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import {
  isInternalModuleTester,
  isModuleLaunched,
  isModuleBlocked,
  isModuleInternal,
  canAccessInternalModuleForTesting,
} from "@/components/utils/moduleReleaseState";
import { useCanonicalProfile } from "@/utils/getCanonicalUserProfile";

const MODULE_KEYS = ["pipekeeper", "whiskeykeeper", "winekeeper", "cigarkeeper"];

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function getLaunchedToggleableModules(user) {
  return MODULE_KEYS.filter((key) => {
    if (isModuleBlocked(key, user)) return false;
    if (isModuleInternal(key, user)) return canAccessInternalModuleForTesting(key, user);
    return isModuleLaunched(key, user);
  });
}

function buildAccessibleModules(profile, activeModules, user) {
  const accessible = new Set();

  // Paid access / subscription-derived access
  for (const key of activeModules || []) {
    if (!isModuleBlocked(key, user)) {
      if (!isModuleInternal(key, user) || canAccessInternalModuleForTesting(key, user)) {
        accessible.add(key);
      }
    }
  }

  // Internal tester override
  if (isInternalModuleTester(user)) {
    for (const key of MODULE_KEYS) {
      if (!isModuleBlocked(key, user)) accessible.add(key);
    }
  }

  // After first-run module setup, all launched production modules should be
  // toggleable in Profile by free or paid users.
  if (profile?.module_preferences_set === true) {
    for (const key of getLaunchedToggleableModules(user)) {
      accessible.add(key);
    }
  }

  return accessible;
}

function buildVisibility({ profile, user, activeModules }) {
  const accessible = buildAccessibleModules(profile, activeModules, user);
  const prefsSet = profile?.module_preferences_set === true;
  const tester = isInternalModuleTester(user);

  const prefMap = {
    pipekeeper: normalizeBoolean(profile?.pipekeeper_enabled),
    whiskeykeeper: normalizeBoolean(profile?.whiskeykeeper_enabled),
    winekeeper: normalizeBoolean(profile?.winekeeper_enabled),
    cigarkeeper: normalizeBoolean(profile?.cigarkeeper_enabled),
  };

  const visibility = {};

  for (const key of MODULE_KEYS) {
    if (!accessible.has(key)) {
      visibility[key] = false;
      continue;
    }

    // Internal testers (admins) always see all accessible modules regardless of prefs.
    if (tester) {
      visibility[key] = true;
      continue;
    }

    if (!prefsSet) {
      // Before first module selection, only explicitly entitled modules should show.
      visibility[key] = (activeModules || []).includes(key);
      continue;
    }

    // After prefs are set, saved booleans drive visibility.
    // Undefined means false unless explicitly enabled.
    visibility[key] = prefMap[key] === true;
  }

  return visibility;
}

function buildModuleStates({ profile, user, activeModules, visibility }) {
  const accessible = buildAccessibleModules(profile, activeModules, user);
  const tester = isInternalModuleTester(user);
  const launchedToggleable = new Set(getLaunchedToggleableModules(user));

  return {
    pipekeeper: {
      key: "pipekeeper",
      enabled: !!visibility.pipekeeper,
      accessible: accessible.has("pipekeeper"),
      visible: accessible.has("pipekeeper"),
      canToggle: launchedToggleable.has("pipekeeper"),
      testerOnly: false,
    },
    whiskeykeeper: {
      key: "whiskeykeeper",
      enabled: !!visibility.whiskeykeeper,
      accessible: accessible.has("whiskeykeeper"),
      visible: accessible.has("whiskeykeeper"),
      canToggle: launchedToggleable.has("whiskeykeeper"),
      testerOnly: false,
    },
    winekeeper: {
      key: "winekeeper",
      enabled: !!visibility.winekeeper,
      accessible: accessible.has("winekeeper"),
      visible: accessible.has("winekeeper"),
      canToggle: tester && accessible.has("winekeeper"),
      testerOnly: true,
    },
    cigarkeeper: {
      key: "cigarkeeper",
      enabled: !!visibility.cigarkeeper,
      accessible: accessible.has("cigarkeeper"),
      visible: accessible.has("cigarkeeper"),
      canToggle: launchedToggleable.has("cigarkeeper"),
      testerOnly: isModuleInternal("cigarkeeper", user),
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

  const isModuleEnabled = useCallback((moduleKey) => !!visibility[moduleKey], [visibility]);

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

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["canonical-profile"] }),
          queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
          queryClient.invalidateQueries({ queryKey: ["current-user"] }),
        ]);
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
        pipekeeper: typeof moduleSelections?.pipekeeper === "boolean" ? moduleSelections.pipekeeper : false,
        whiskeykeeper: typeof moduleSelections?.whiskeykeeper === "boolean" ? moduleSelections.whiskeykeeper : false,
        winekeeper: typeof moduleSelections?.winekeeper === "boolean" ? moduleSelections.winekeeper : false,
        cigarkeeper: typeof moduleSelections?.cigarkeeper === "boolean" ? moduleSelections.cigarkeeper : false,
      };

      await persistPreferences(normalized);
    },
    [persistPreferences]
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
