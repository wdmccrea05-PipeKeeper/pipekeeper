import { getItemModule } from "@/components/utils/moduleContentVisibility";

function matchesPipekeeperAction(action) {
  const text = [
    action?.id,
    action?.key,
    action?.title,
    action?.label,
    action?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("pipe") ||
    text.includes("blend") ||
    text.includes("tobacco") ||
    text.includes("smoke") ||
    text.includes("rotation") ||
    text.includes("specialization")
  );
}

function matchesWhiskeyAction(action) {
  const text = [
    action?.id,
    action?.key,
    action?.title,
    action?.label,
    action?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("whiskey") ||
    text.includes("bottle") ||
    text.includes("pour") ||
    text.includes("tasting")
  );
}

export function getCuratorActionModule(action) {
  // If the action declares an explicit modules array, use it to determine module
  if (Array.isArray(action?.modules) && action.modules.length > 0) {
    const hasPipe = action.modules.some(m => m === 'pipe' || m === 'tobacco');
    const hasWhiskey = action.modules.includes('whiskey');
    if (hasPipe && hasWhiskey) return null; // multi-module: always show
    if (hasWhiskey) return 'whiskeykeeper';
    if (hasPipe) return 'pipekeeper';
  }

  const inferred = getItemModule(action);
  if (inferred) return inferred;

  // Only text-match on non-function description
  const descText = typeof action?.description === 'string' ? action.description : '';
  const text = [action?.id, action?.key, action?.title, action?.label, descText]
    .filter(Boolean).join(' ').toLowerCase();

  if (text.includes('pipe') || text.includes('blend') || text.includes('tobacco') || text.includes('smoke') || text.includes('rotation') || text.includes('specialization')) return 'pipekeeper';
  if (text.includes('whiskey') || text.includes('bottle') || text.includes('pour') || text.includes('tasting')) return 'whiskeykeeper';

  return null;
}

export function shouldShowCuratorAction(action, enabledModules) {
  // Multi-module actions (both pipe and whiskey) always show if either module is enabled
  if (Array.isArray(action?.modules) && action.modules.length > 0) {
    const hasPipe = action.modules.some(m => m === 'pipe' || m === 'tobacco');
    const hasWhiskey = action.modules.includes('whiskey');
    if (hasPipe && hasWhiskey) {
      // Show if any of the relevant modules is enabled
      return !!(enabledModules?.pipekeeper || enabledModules?.whiskeykeeper);
    }
    if (hasWhiskey) return !!enabledModules?.whiskeykeeper;
    if (hasPipe) return !!(enabledModules?.pipekeeper);
  }
  const moduleKey = getCuratorActionModule(action);
  if (!moduleKey) return true;
  return !!enabledModules?.[moduleKey];
}

export function filterCuratorActions(actions, enabledModules) {
  return (actions || []).filter((action) => shouldShowCuratorAction(action, enabledModules));
}

export function buildEnabledCuratorScopes(enabledModules) {
  const scopes = [];

  if ((enabledModules?.pipekeeper && enabledModules?.whiskeykeeper) || (!enabledModules?.pipekeeper && !enabledModules?.whiskeykeeper)) {
    scopes.push({ key: "all", label: "All Modules" });
  }

  if (enabledModules?.pipekeeper) {
    scopes.push({ key: "pipekeeper", label: "PipeKeeper" });
  }

  if (enabledModules?.whiskeykeeper) {
    scopes.push({ key: "whiskeykeeper", label: "WhiskeyKeeper" });
  }

  if (enabledModules?.winekeeper) {
    scopes.push({ key: "winekeeper", label: "WineKeeper" });
  }

  if (enabledModules?.cigarkeeper) {
    scopes.push({ key: "cigarkeeper", label: "CigarKeeper" });
  }

  if (scopes.length === 0) {
    scopes.push({ key: "all", label: "All Modules" });
  }

  return scopes;
}