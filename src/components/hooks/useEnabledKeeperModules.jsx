/**
 * useEnabledKeeperModules — returns KEEPER_MODULES filtered by user visibility preferences.
 *
 * This is the hook all Hub, nav, story, and recommendation surfaces should use
 * to get the list of modules a user has enabled.
 */

import { useMemo } from 'react';
import { KEEPER_MODULES } from '@/components/hub/keeperModuleRegistry';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';

export function useEnabledKeeperModules() {
  const { moduleStates, isLoading, isModuleEnabled } = useModuleVisibility();

  /** Platform-launched modules the user has enabled */
  const enabledModules = useMemo(() => {
    return KEEPER_MODULES.filter(m => m.enabled && isModuleEnabled(m.moduleKey));
  }, [moduleStates]);

  /** Coming-soon modules the user has enabled (for future use) */
  const enabledComingSoonModules = useMemo(() => {
    return KEEPER_MODULES.filter(m => !m.enabled && isModuleEnabled(m.moduleKey));
  }, [moduleStates]);

  /** All modules (launched + coming soon) the user has enabled */
  const allEnabledModules = useMemo(() => {
    return KEEPER_MODULES.filter(m => isModuleEnabled(m.moduleKey));
  }, [moduleStates]);

  return {
    enabledModules,         // launched & user-enabled
    enabledComingSoonModules,
    allEnabledModules,
    isLoading,
    isModuleEnabled,
    moduleStates,
  };
}