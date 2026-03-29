import { useMemo, useState, useCallback } from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isInternalModuleTester } from "@/components/utils/moduleReleaseState";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { base44 } from "@/api/base44Client";

/**
 * useModuleVisibility — Entitlement-first module visibility with persistent preferences.
 *
 * BEHAVIOR:
 * 1. Reads current user profile to get saved module preferences
 * 2. Derives visible modules from:
 *    - saved preferences (if module_preferences_set)
 *    - activeModules (entitlement)
 *    - tester/admin override
 * 3. Provides setModuleEnabled + saveModulePreferences for Profile and Onboarding
 *
 * CRITICAL: Does NOT use release-state or "launched modules" to enable/disable.
 * Visibility is purely entitlement-driven.
 *
 * RETURNS:
 * - moduleStates: { pipekeeper, whiskeykeeper, ... } = current visibility
 * - visibility: same as moduleStates
 * - isModuleEnabled(moduleKey): boolean
 * - setModuleEnabled(moduleId, enabled): async update + persist
 * - saveModulePreferences(moduleSelections): async save (onboarding)
 * - isLoading: boolean
 */
export function useModuleVisibility(profile = null, user = null) {
  const { user: currentUser } = useCurrentUser();
  const finalUser = user || currentUser;
  const accessSummary = useAccessSummary();
  const activeModules = accessSummary?.activeModules ?? [];
  const isTester = isInternalModuleTester(finalUser);

  // If profile not provided, try to derive from user
  const profileData = profile || currentUser;
  const prefsSet = profileData?.module_preferences_set === true;

  const [localModuleState, setLocalModuleState] = useState(null);

  const visibility = useMemo(() => {
    // If local state was just set (from setModuleEnabled), use it
    if (localModuleState !== null) {
      return localModuleState;
    }

    // ENTITLEMENT-FIRST RESOLUTION
    // Step 1: Build set of accessible modules (from entitlement + tester override)
    const accessibleModules = new Set(activeModules || []);

    if (isTester) {
      accessibleModules.add("pipekeeper");
      accessibleModules.add("whiskeykeeper");
    }

    // Step 2: If user has saved preferences, apply them
    if (prefsSet && profileData) {
      return {
        pipekeeper:
          accessibleModules.has("pipekeeper") &&
          profileData?.pipekeeper_enabled !== false,

        whiskeykeeper:
          accessibleModules.has("whiskeykeeper") &&
          profileData?.whiskeykeeper_enabled !== false,
      };
    }

    // Step 3: No saved prefs → use entitled modules as-is (no defaults added)
    return {
      pipekeeper: accessibleModules.has("pipekeeper"),
      whiskeykeeper: accessibleModules.has("whiskeykeeper"),
    };
  }, [profileData, finalUser, prefsSet, activeModules, isTester, localModuleState]);

  const isModuleEnabled = (moduleKey) => !!visibility[moduleKey];

  /**
   * setModuleEnabled — Toggle a single module and persist.
   * Updates the corresponding profile field (pipekeeper_enabled, whiskeykeeper_enabled).
   * Sets module_preferences_set = true.
   */
  const setModuleEnabled = useCallback(
    async (moduleId, enabled) => {
      try {
        // Determine the profile field name
        const fieldMap = {
          pipekeeper: "pipekeeper_enabled",
          whiskeykeeper: "whiskeykeeper_enabled",
          winekeeper: "winekeeper_enabled",
          cigarkeeper: "cigarkeeper_enabled",
        };
        const fieldName = fieldMap[moduleId] || `${moduleId}_enabled`;

        // Build update payload
        const updatePayload = {
          [fieldName]: enabled,
          module_preferences_set: true,
        };

        // Try to fetch current user profile
        let userProfile = null;
        const userEmail = currentUser?.email?.trim().toLowerCase();

        if (!userProfile && userEmail) {
          const byEmail = await base44.entities.UserProfile.filter({
            user_email: userEmail,
          });
          userProfile = byEmail?.[0] || null;
        }

        if (!userProfile && currentUser?.id) {
          const byId = await base44.entities.UserProfile.filter({
            user_id: currentUser.id,
          });
          userProfile = byId?.[0] || null;
        }

        // Update or create profile
        if (userProfile?.id) {
          await base44.entities.UserProfile.update(userProfile.id, updatePayload);
        } else {
          await base44.entities.UserProfile.create({
            user_id: currentUser?.id || undefined,
            user_email: userEmail || undefined,
            ...updatePayload,
          });
        }

        // Update local state optimistically
        setLocalModuleState((prev) => ({
          ...prev,
          [moduleId]: enabled,
        }));
      } catch (error) {
        console.error("[useModuleVisibility] setModuleEnabled failed:", error);
        throw error;
      }
    },
    [currentUser]
  );

  /**
   * saveModulePreferences — Save module selections (used by onboarding).
   * Accepts { pipekeeper: true, whiskeykeeper: false, ... }
   * Persists all module fields + module_preferences_set = true
   */
  const saveModulePreferences = useCallback(
    async (moduleSelections) => {
      try {
        // Normalize input to profile field format
        const updatePayload = {
          pipekeeper_enabled: moduleSelections.pipekeeper || false,
          whiskeykeeper_enabled: moduleSelections.whiskeykeeper || false,
          winekeeper_enabled: moduleSelections.winekeeper || false,
          cigarkeeper_enabled: moduleSelections.cigarkeeper || false,
          module_preferences_set: true,
        };

        // Try to fetch current user profile
        let userProfile = null;
        const userEmail = currentUser?.email?.trim().toLowerCase();

        if (!userProfile && userEmail) {
          const byEmail = await base44.entities.UserProfile.filter({
            user_email: userEmail,
          });
          userProfile = byEmail?.[0] || null;
        }

        if (!userProfile && currentUser?.id) {
          const byId = await base44.entities.UserProfile.filter({
            user_id: currentUser.id,
          });
          userProfile = byId?.[0] || null;
        }

        // Update or create profile
        if (userProfile?.id) {
          await base44.entities.UserProfile.update(userProfile.id, updatePayload);
        } else {
          await base44.entities.UserProfile.create({
            user_id: currentUser?.id || undefined,
            user_email: userEmail || undefined,
            ...updatePayload,
          });
        }

        // Update local state
        setLocalModuleState({
          pipekeeper: moduleSelections.pipekeeper || false,
          whiskeykeeper: moduleSelections.whiskeykeeper || false,
        });
      } catch (error) {
        console.error("[useModuleVisibility] saveModulePreferences failed:", error);
        throw error;
      }
    },
    [currentUser]
  );

  return {
    visibility,
    moduleStates: visibility,
    isModuleEnabled,
    setModuleEnabled,
    saveModulePreferences,
    isLoading: !accessSummary,
  };
}