/**
 * useEnabledKeeperModules — canonical launched vs expanding-soon module buckets.
 *
 * This hook is what Hub, nav, quick launch, and marketing surfaces should use.
 * It separates:
 * - modules the current user can actually open now
 * - modules intentionally shown as "Expanding Soon"
 *
 * RULES:
 * - release state overrides entitlement and profile preferences
 * - internal modules are visible/openable only to internal testers
 * - blocked modules are never openable
 * - non-launched modules should never appear in enabledModules
 */

import { useMemo } from 'react';
import { KEEPER_MODULES } from '@/components/utils/moduleRegistry';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import {
  getEffectiveModuleReleaseState,
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';

function isAccessibleLaunchState(moduleKey, user) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);
  if (state === 'launched') return true;
  if (state === 'internal') return isInternalModuleTester(user);
  return false;
}

function shouldShowAsExpandingSoon(moduleKey, user) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);

  if (state === 'blocked') return true;
  if (state === 'internal') return !isInternalModuleTester(user);

  return false;
}

export function useEnabledKeeperModules() {
  const visibility = useModuleVisibility();
  const { moduleStates, isLoading, isModuleEnabled } = visibility;
  const { user } = useCurrentUser();

  /** Modules the current user can actually open now. */
  const enabledModules = useMemo(() => {
    return KEEPER_MODULES.filter((m) => {
      if (!isAccessibleLaunchState(m.moduleKey, user)) return false;
      return isModuleEnabled(m.moduleKey);
    });
  }, [moduleStates, isModuleEnabled, user]);

  /** Modules intentionally shown as future/locked marketing cards. */
  const expandingSoonModules = useMemo(() => {
    return KEEPER_MODULES.filter((m) => shouldShowAsExpandingSoon(m.moduleKey, user));
  }, [user, moduleStates]);

  /** Internal-only modules the current user can preview. */
  const internalPreviewModules = useMemo(() => {
    return KEEPER_MODULES.filter((m) => {
      const state = getEffectiveModuleReleaseState(m.moduleKey, user);
      return state === 'internal' && isInternalModuleTester(user) && isModuleEnabled(m.moduleKey);
    });
  }, [user, moduleStates, isModuleEnabled]);

  /** All modules visible anywhere on the hub for this user. */
  const allVisibleModules = useMemo(() => {
    const keys = new Set([
      ...enabledModules.map((m) => m.moduleKey),
      ...expandingSoonModules.map((m) => m.moduleKey),
    ]);
    return KEEPER_MODULES.filter((m) => keys.has(m.moduleKey));
  }, [enabledModules, expandingSoonModules]);

  return {
    ...visibility,
    enabledModules,
    expandingSoonModules,
    internalPreviewModules,
    allVisibleModules,
    isLoading,
  };
}
