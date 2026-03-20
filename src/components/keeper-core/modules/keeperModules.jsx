/**
 * SHIM — re-exports from canonical moduleRegistry.
 * Do not add module definitions here.
 */
import {
  KEEPER_MODULES as _KEEPER_MODULES,
  getEnabledModules,
  getComingSoonModules,
  getModuleByType,
} from '@/components/utils/moduleRegistry';

export const KEEPER_MODULES = _KEEPER_MODULES;
export { getEnabledModules, getComingSoonModules, getModuleByType };

export function getHubContributorModules() {
  return _KEEPER_MODULES.filter(m => m.enabled);
}

export function getEnabledModuleCount() {
  return getEnabledModules().length;
}

export function getHubContributorCount() {
  return getHubContributorModules().length;
}