/**
 * useEnabledModules — Central source of truth for module visibility.
 *
 * Reads module enable/disable state from UserProfile.
 * Entitlement logic is SEPARATE — disabling a module never touches billing.
 *
 * Module IDs:  pipes | whiskey | wine | cigars
 *
 * Default for existing users: all currently-available modules ON.
 * Default for new users: all ON until onboarding overrides.
 */
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from './useCurrentUser';
import { safeUpdate } from '@/components/utils/safeUpdate';

// Map from module type → profile field name
export const MODULE_FIELD_MAP = {
  pipes:   'pipekeeper_enabled',
  whiskey: 'whiskeykeeper_enabled',
  wine:    'winekeeper_enabled',
  cigars:  'cigarkeeper_enabled',
};

// Modules that are actually launched (not coming-soon)
export const LAUNCHED_MODULES = ['pipes', 'whiskey'];

/** Returns true when profile field is missing (null/undefined) → default ON */
function resolveEnabled(profile, moduleType) {
  const field = MODULE_FIELD_MAP[moduleType];
  if (!field) return true;
  const val = profile?.[field];
  if (val === false) return false;
  return true; // null / undefined / true  →  enabled
}

export function useEnabledModules() {
  const { user } = useCurrentUser();
  const email = user?.email ? String(user.email).trim().toLowerCase() : null;
  const userId = user?.id || null;
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['module-visibility-profile', userId, email],
    queryFn: async () => {
      if (!userId && !email) return null;
      let rows = [];
      if (userId) {
        try { rows = await base44.entities.UserProfile.filter({ user_id: userId }); } catch {}
      }
      if (!rows.length && email) {
        try { rows = await base44.entities.UserProfile.filter({ user_email: email }); } catch {}
      }
      return rows?.[0] || null;
    },
    enabled: !!(userId || email),
    staleTime: 5 * 60 * 1000,
  });

  const enabledMap = useMemo(() => {
    const map = {};
    for (const mod of LAUNCHED_MODULES) {
      map[mod] = resolveEnabled(profile, mod);
    }
    return map;
  }, [profile]);

  /** Returns true if this module is enabled (visible) */
  function isModuleEnabled(moduleType) {
    if (!LAUNCHED_MODULES.includes(moduleType)) return false;
    return enabledMap[moduleType] ?? true;
  }

  /** Enabled modules list (only launched ones) */
  const enabledModules = useMemo(
    () => LAUNCHED_MODULES.filter(m => enabledMap[m]),
    [enabledMap]
  );

  /** Toggle a module and persist to UserProfile */
  async function setModuleEnabled(moduleType, enabled) {
    const field = MODULE_FIELD_MAP[moduleType];
    if (!field) return;

    const payload = { [field]: !!enabled };

    if (profile?.id) {
      await safeUpdate('UserProfile', profile.id, payload, email);
    } else if (userId || email) {
      await base44.entities.UserProfile.create({
        user_id: userId || undefined,
        user_email: email || undefined,
        ...payload,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['module-visibility-profile', userId, email] });
  }

  /** Bulk-set multiple modules at once (for onboarding presets) */
  async function setModulesEnabled(map) {
    const payload = {};
    for (const [moduleType, enabled] of Object.entries(map)) {
      const field = MODULE_FIELD_MAP[moduleType];
      if (field) payload[field] = !!enabled;
    }

    if (profile?.id) {
      await safeUpdate('UserProfile', profile.id, payload, email);
    } else if (userId || email) {
      await base44.entities.UserProfile.create({
        user_id: userId || undefined,
        user_email: email || undefined,
        ...payload,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['module-visibility-profile', userId, email] });
  }

  return {
    isLoading,
    profile,
    enabledMap,
    enabledModules,
    isModuleEnabled,
    setModuleEnabled,
    setModulesEnabled,
  };
}