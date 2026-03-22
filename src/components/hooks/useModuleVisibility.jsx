/**
 * useModuleVisibility — central source of truth for module lock/visibility state.
 *
 * Rules:
 * - Reads module_*_enabled flags from UserProfile.
 * - For existing users who have never set preferences (module_preferences_set=false),
 *   defaults to all currently-launched modules enabled (pipekeeper + whiskeykeeper).
 * - Visibility is SEPARATE from entitlement. Hiding a module never touches billing.
 * - Data is NEVER deleted. Locking is purely a UI/visibility state.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { safeUpdate } from '@/components/utils/safeUpdate';
import { isModuleBlocked, MODULE_RELEASE_STATES } from '@/components/utils/moduleReleaseState';

const normEmail = (e) => String(e || '').trim().toLowerCase();

/** Modules that are actually launched in the current release. */
export const LAUNCHED_MODULES = Object.entries(MODULE_RELEASE_STATES)
  .filter(([, state]) => state === 'launched')
  .map(([key]) => key);

/** All possible module IDs and their profile field names. */
export const MODULE_FIELDS = {
  pipekeeper: 'pipekeeper_enabled',
  whiskeykeeper: 'whiskeykeeper_enabled',
  winekeeper: 'winekeeper_enabled',
  cigarkeeper: 'cigarkeeper_enabled',
};

/**
 * Derive module enabled state from a UserProfile row.
 * Existing users (module_preferences_set=false) default launched modules to ON.
 */
export function deriveModuleStates(profile) {
  const prefsSet = profile?.module_preferences_set === true;

  // For each module: if blocked in release → always false regardless of user prefs.
  // If launched: respect user prefs (default on for existing users).
  // If internal: false for now (LockedModuleGuard handles the internal-tester check).
  return {
    pipekeeper: isModuleBlocked('pipekeeper')
      ? false
      : (prefsSet ? (profile?.pipekeeper_enabled !== false) : true),
    whiskeykeeper: isModuleBlocked('whiskeykeeper')
      ? false
      : (prefsSet ? (profile?.whiskeykeeper_enabled !== false) : true),
    winekeeper: isModuleBlocked('winekeeper')
      ? false
      : (prefsSet ? (profile?.winekeeper_enabled === true) : false),
    cigarkeeper: isModuleBlocked('cigarkeeper')
      ? false
      : (prefsSet ? (profile?.cigarkeeper_enabled === true) : false),
  };
}

export function useModuleVisibility() {
  const queryClient = useQueryClient();

  const { data: profileBundle, isLoading } = useQuery({
    queryKey: ['module-visibility-profile'],
    queryFn: async () => {
      const me = await base44.auth.me();
      if (!me?.email) return null;
      const email = normEmail(me.email);
      const userId = me.id || me.auth_user_id;

      let records = [];
      if (userId) {
        try { records = await base44.entities.UserProfile.filter({ user_id: userId }); } catch {}
      }
      if (!records.length && email) {
        try { records = await base44.entities.UserProfile.filter({ user_email: email }); } catch {}
      }

      if (!records.length) return { profile: null, profileId: null, email, userId };

      // Pick most recently updated record
      const sorted = [...records].sort((a, b) => {
        const ad = Date.parse(a?.updated_date || a?.created_date || '') || 0;
        const bd = Date.parse(b?.updated_date || b?.created_date || '') || 0;
        return bd - ad;
      });

      return { profile: sorted[0], profileId: sorted[0].id, email, userId };
    },
    staleTime: 5 * 60 * 1000,
  });

  const profile = profileBundle?.profile || null;
  const profileId = profileBundle?.profileId || null;
  const email = profileBundle?.email || null;
  const userId = profileBundle?.userId || null;

  const moduleStates = useMemo(() => deriveModuleStates(profile), [profile]);

  /**
   * Check if a module is enabled/visible.
   * @param {string} moduleId - e.g. 'pipekeeper', 'whiskeykeeper'
   */
  function isModuleEnabled(moduleId) {
    return moduleStates[moduleId] !== false;
  }

  /**
   * Get all currently enabled module IDs.
   */
  function getEnabledModuleIds() {
    return Object.keys(moduleStates).filter(k => moduleStates[k] === true);
  }

  /**
   * Persist a module toggle change.
   * Does NOT touch entitlements or billing. Pure visibility.
   */
  async function setModuleEnabled(moduleId, enabled) {
    const field = MODULE_FIELDS[moduleId];
    if (!field) return;

    const patch = {
      [field]: enabled,
      module_preferences_set: true,
    };

    if (profileId) {
      await safeUpdate('UserProfile', profileId, patch, email);
    } else if (email) {
      await base44.entities.UserProfile.create({
        user_id: userId || undefined,
        user_email: email,
        ...patch,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['module-visibility-profile'] });
    await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
  }

  /**
   * Save all module states at once (used by onboarding).
   */
  async function saveModulePreferences(states) {
    if (!email && !userId) return;

    const patch = {
      pipekeeper_enabled: states.pipekeeper !== false,
      whiskeykeeper_enabled: states.whiskeykeeper !== false,
      winekeeper_enabled: states.winekeeper === true,
      cigarkeeper_enabled: states.cigarkeeper === true,
      module_preferences_set: true,
    };

    if (profileId) {
      await safeUpdate('UserProfile', profileId, patch, email);
    } else if (email) {
      await base44.entities.UserProfile.create({
        user_id: userId || undefined,
        user_email: email,
        ...patch,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['module-visibility-profile'] });
    await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
  }

  return {
    moduleStates,
    isModuleEnabled,
    getEnabledModuleIds,
    setModuleEnabled,
    saveModulePreferences,
    isLoading,
    modulePreferencesSet: profile?.module_preferences_set === true,
  };
}