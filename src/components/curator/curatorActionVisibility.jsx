// Canonical source for all curator action visibility logic

/**
 * Returns true if a curator action should be shown given the enabled modules.
 * Actions without a `module` field are always shown.
 */
export function shouldShowCuratorAction(action, enabledModules = {}) {
  if (!action) return false;
  if (!action.module) return true;
  return !!enabledModules[action.module];
}

/**
 * Filters an array of curator actions to only those visible for the user's enabled modules.
 */
export function filterCuratorActions(actions, enabledModules = {}) {
  return (actions || []).filter((action) => shouldShowCuratorAction(action, enabledModules));
}

/**
 * Filters actions by user.activeModules or UserProfile module flags.
 */
export function getVisibleActions(user, actions) {
  if (!user) return [];
  // Support both activeModules object and UserProfile boolean fields
  const modules = user.activeModules || {
    pipekeeper: user.pipekeeper_enabled !== false,
    whiskeykeeper: user.whiskeykeeper_enabled !== false,
    winekeeper: user.winekeeper_enabled === true,
    cigarkeeper: user.cigarkeeper_enabled === true,
  };
  return (actions || []).filter((action) => {
    if (!action.module) return true;
    return modules[action.module] === true;
  });
}

/**
 * Builds the list of scope options for the Curator scope selector
 * based on which modules are enabled.
 */
export function buildEnabledCuratorScopes(enabled = {}) {
  const scopes = [];
  const hasPipe = !!enabled.pipekeeper;
  const hasWhiskey = !!enabled.whiskeykeeper;

  if (hasPipe && hasWhiskey) scopes.push({ key: "all", label: "All Modules" });
  if (hasPipe) scopes.push({ key: "pipekeeper", label: "PipeKeeper" });
  if (hasWhiskey) scopes.push({ key: "whiskeykeeper", label: "WhiskeyKeeper" });

  if (scopes.length === 0) scopes.push({ key: "all", label: "All Modules" });
  return scopes;
}