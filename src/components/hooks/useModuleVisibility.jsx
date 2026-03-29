/**
 * useModuleVisibility — central source of truth for module lock/visibility state.
 *
 * Visibility is separate from entitlements. Hidden/blocked modules do not delete data.
 *
 * Key behavior:
 * - launched modules respect saved profile preferences
 * - internal modules are visible only to internal/admin testers
 * - blocked modules are hidden for everyone
 * - local admin preview overrides from moduleReleaseState are honored
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { safeUpdate } from '@/components/utils/safeUpdate';
import {
  MODULE_RELEASE_STATES,
  getEffectiveModuleReleaseState,
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';

const normEmail = (e) => String(e || '').trim().toLowerCase();

export const LAUNCHED_MODULES = Object.entries(MODULE_RELEASE_STATES)
  .filter(([, state]) => state === 'launched')
  .map(([key]) => key);

export const MODULE_FIELDS = {
  pipekeeper: 'pipekeeper_enabled',
  whiskeykeeper: 'whiskeykeeper_enabled',
  winekeeper: 'winekeeper_enabled',
  cigarkeeper: 'cigarkeeper_enabled',
};

function moduleDefaultEnabled(moduleKey, prefsSet, profile, user) {
  const effectiveState = getEffectiveModuleReleaseState(moduleKey, user);

  // Hard block: module is fully blocked — never show to anyone
  if (effectiveState === 'blocked') return false;

  // Internal module: only internal testers can see/enable it
  if (effectiveState === 'internal' && !isInternalModuleTester(user)) return false;

  // Preferences saved — always honour saved value exactly
  if (prefsSet) {
    const field = `${moduleKey}_enabled`;
    const saved = profile?.[field];
    // Saved boolean wins; undefined/null treated as false (no implicit defaults)
    return saved === true;
  }

  // Preferences NOT yet saved — derive from release state only.
  // A 'launched' module defaults on; 'internal' modules default on only for internal testers.
  // PipeKeeper is currently the only 'launched' module so normal users naturally get only PipeKeeper.
  // This is entitlement-derived, NOT a hardcoded PipeKeeper-first assumption.
  return effectiveState === 'launched' || (effectiveState === 'internal' && isInternalModuleTester(user));
}

export function deriveModuleStates(profile, user = null) {
  const prefsSet = profile?.module_preferences_set === true;

  return {
    pipekeeper: moduleDefaultEnabled('pipekeeper', prefsSet, profile, user),
    whiskeykeeper: moduleDefaultEnabled('whiskeykeeper', prefsSet, profile, user),
    winekeeper: moduleDefaultEnabled('winekeeper', prefsSet, profile, user),
    cigarkeeper: moduleDefaultEnabled('cigarkeeper', prefsSet, profile, user),
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

    const patch = {
      pipekeeper_enabled: states.pipekeeper !== false,
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