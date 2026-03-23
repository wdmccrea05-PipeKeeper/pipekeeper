/**
 * useEnabledKeeperModules — canonical launched vs expanding-soon module buckets.
 *
 * This hook powers the Hub and launcher surfaces. It separates:
 * - modules the current user can actually open now
 * - modules intentionally shown as "Expanding Soon"
 */

import { useMemo } from 'react';
import { KEEPER_MODULES } from '@/components/utils/moduleRegistry';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import {
  getEffectiveModuleReleaseState,
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';

function canOpenModuleNow(moduleKey, user, isModuleEnabled) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);
  if (state === 'blocked') return false;
  if (state === 'internal') return isInternalModuleTester(user) && isModuleEnabled(moduleKey);
  return isModuleEnabled(moduleKey);
}

function shouldAppearAsExpandingSoon(moduleKey, user) {
  const state = getEffectiveModuleReleaseState(moduleKey, user);
  if (state === 'blocked') return true;
  if (state === 'internal') return !isInternalModuleTester(user);
  return false;
}

export function useEnabledKeeperModules() {
  const visibility = useModuleVisibility();
  const { moduleStates, isLoading, isModuleEnabled } = visibility;
  const { user } = useCurrentUser();

  const enabledModules = useMemo(() => {
    return KEEPER_MODULES.filter((m) => canOpenModuleNow(m.moduleKey, user, isModuleEnabled));
  }, [moduleStates, isModuleEnabled, user]);

  const expandingSoonModules = useMemo(() => {
    return KEEPER_MODULES.filter((m) => shouldAppearAsExpandingSoon(m.moduleKey, user));
  }, [moduleStates, user]);

  const internalPreviewModules = useMemo(() => {
    return KEEPER_MODULES.filter((m) => {
      const state = getEffectiveModuleReleaseState(m.moduleKey, user);
      return state === 'internal' && isInternalModuleTester(user) && isModuleEnabled(m.moduleKey);
    });
  }, [moduleStates, user, isModuleEnabled]);

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
