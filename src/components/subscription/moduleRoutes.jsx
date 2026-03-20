/**
 * Canonical module route mapping
 * Single source of truth for module-to-route conversions
 */

import { ModuleKey } from './stripeConfig';

const MODULE_ROUTE_MAP: Record<ModuleKey, string> = {
  pipekeeper: '/PipeKeeper',
  whiskeykeeper: '/WhiskeyKeeper',
  cigarkeeper: '/CigarKeeper',
  winekeeper: '/Whiskey', // WineKeeper may share WhiskeyKeeper route or have dedicated route
};

/**
 * Get success route for a module
 */
export function getModuleSuccessRoute(moduleKey: ModuleKey): string {
  const route = MODULE_ROUTE_MAP[moduleKey];
  if (!route) {
    console.error(`[ModuleRoutes] Unknown module: ${moduleKey}`);
    return '/CollectionHub'; // Safe fallback
  }
  return route;
}

/**
 * Check if a route is a module route
 */
export function isModuleRoute(path: string): boolean {
  return Object.values(MODULE_ROUTE_MAP).includes(path);
}