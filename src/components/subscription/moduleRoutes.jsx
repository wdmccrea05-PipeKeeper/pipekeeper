/**
 * Canonical module route mapping
 * Single source of truth for module-to-route conversions
 */

const MODULE_ROUTE_MAP = {
  pipekeeper: '/PipeKeeper',
  whiskeykeeper: '/WhiskeyKeeper',
  cigarkeeper: '/CollectionHub',
  winekeeper: '/CollectionHub',
};

/**
 * Get success route for a module
 */
export function getModuleSuccessRoute(moduleKey) {
  const route = MODULE_ROUTE_MAP[moduleKey];
  if (!route) {
    console.error(`[ModuleRoutes] Unknown module: ${moduleKey}`);
    return '/CollectionHub';
  }
  return route;
}

/**
 * Check if a route is a module route
 */
export function isModuleRoute(path) {
  return Object.values(MODULE_ROUTE_MAP).includes(path);
}