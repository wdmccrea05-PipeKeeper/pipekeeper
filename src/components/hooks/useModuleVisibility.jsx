/**
 * useModuleVisibility — central source of truth for module enabled/visibility state.
 *
 * Resolution order:
 *   1. If user has saved module preferences → use saved value, filtered through access gate
 *   2. Else if admin/internal tester → no defaults (tester explicitly chooses via onboarding)
 *   3. Else → derive from canUserAccessModule (access + entitlement, not release state)
 *
 * CollectionKeeper is the platform shell. Modules are optional layers.
 * PipeKeeper is NOT a hardcoded default — it resolves as enabled for normal users
 * because it is the only currently-launched accessible module, not because it is special.
 *
 * Release state is used as an ACCESS FILTER (canUserAccessModule),
 * never as the primary source of enabled state.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { safeUpdate } from '@/components/utils/safeUpdate';
import {
  MODULE_RELEASE_STATES,
  canUserAccessModule,
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';

const normEmail = (e) => String(e || '').trim().toLowerCase();

export const MODULE_FIELDS = {
  pipekeeper: 'pipekeeper_enabled',
  whiskeykeeper: 'whiskeykeeper_enabled',
  winekeeper: 'winekeeper_enabled',
  cigarkeeper: 'cigarkeeper_enabled',
};

const ALL_MODULE_KEYS = Object.keys(MODULE_RELEASE_STATES);

/**
 * Determine whether a module should be enabled for a given user.
 *
 * @param {string} moduleKey
 * @param {boolean} prefsSet  — whether user has ever explicitly saved module preferences
 * @param {object|null} profile — UserProfile record
 * @param {object|null} user  — current user
 */
function moduleDefaultEnabled(moduleKey, prefsSet, profile, user) {
  // Step 1: Access gate — hard filter regardless of any other logic.
  // canUserAccessModule returns false for blocked modules (everyone) and
  // internal modules for non-testers. This is the only place release state is consulted.
  const canAccess = canUserAccessModule(moduleKey, user, true);
  if (!canAccess) return false;

  // Step 2: Saved preferences take priority (when present and access is granted).
  if (prefsSet) {
    const field = MODULE_FIELDS[moduleKey];
    const saved = profile?.[field];
    // Saved boolean wins exactly. null/undefined = not explicitly set → treat as false.
    return saved === true;
  }

  // Step 3: No saved preferences yet.
  //   - Admin/internal testers: no default. They choose explicitly during onboarding.
  //     Forcing a default would override their intentional WhiskeyKeeper-only setup.
  //   - Normal users: default on if accessible. Since only launched modules pass the
  //     access gate above, normal users will get pipekeeper=true via access, not hardcoding.
  if (isInternalModuleTester(user)) return false;

  // Normal user with access and no saved prefs → on by default.
  // This currently resolves to pipekeeper=true for normal users (the only launched module).
  return true;
}

export function deriveModuleStates(profile, user = null) {
  const prefsSet = profile?.module_preferences_set === true;

  return ALL_MODULE_KEYS.reduce((acc, key) => {
    acc[key] = moduleDefaultEnabled(key, prefsSet, profile, user);
    return acc;
  }, {});
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
      const user = { ...me, email, id: userId };

      let records = [];
      if (userId) {
        try {
          records = await base44.entities.UserProfile.filter({ user_id: userId });
        } catch {}
      }
      if (!records.length && email) {
        try {
          records = await base44.entities.UserProfile.filter({ user_email: email });
        } catch {}
      }

      if (!records.length) {
        return { profile: null, profileId: null, email, userId, user };
      }

      const sorted = [...records].sort((a, b) => {
        const ad = Date.parse(a?.updated_date || a?.created_date || '') || 0;
        const bd = Date.parse(b?.updated_date || b?.created_date || '') || 0;
        return bd - ad;
      });

      return { profile: sorted[0], profileId: sorted[0].id, email, userId, user };
    },
    staleTime: 5 * 60 * 1000,
  });

  const profile = profileBundle?.profile || null;
  const profileId = profileBundle?.profileId || null;
  const email = profileBundle?.email || null;
  const userId = profileBundle?.userId || null;
  const user = profileBundle?.user || null;

  const moduleStates = useMemo(() => deriveModuleStates(profile, user), [profile, user]);

  function isModuleEnabled(moduleId) {
    return moduleStates[moduleId] === true;
  }

  function getEnabledModuleIds() {
    return Object.keys(moduleStates).filter((k) => moduleStates[k] === true);
  }

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

  async function saveModulePreferences(states) {
    if (!email && !userId) return;

    // Save exactly what the user selected. No coercion.
    const patch = {
      pipekeeper_enabled: states.pipekeeper === true,
      whiskeykeeper_enabled: states.whiskeykeeper === true,
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