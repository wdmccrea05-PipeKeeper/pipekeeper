/**
 * RELEASE CONFIG — Re-exports from canonical moduleReleaseState.
 *
 * All module visibility logic now lives in moduleReleaseState.js.
 * This file exists for backward compatibility — existing imports continue to work.
 *
 * DO NOT add new logic here. Update moduleReleaseState.js instead.
 */

export {
  RELEASE_MODE,
  isModuleAllowedInRelease,
  isAdminWhiskeyUnlocked,
  setAdminWhiskeyUnlock,
  WHISKEYKEEPER_BLOCKED,
  isInternalModuleTester,
  getModuleReleaseState,
  isModuleBlocked,
  isModuleInternal,
  isModuleLaunched,
  canUserAccessModule,
  shouldShowModuleInNav,
  shouldFetchModuleData,
  shouldExposeModuleInCurator,
  MODULE_RELEASE_STATES,
} from './moduleReleaseState';