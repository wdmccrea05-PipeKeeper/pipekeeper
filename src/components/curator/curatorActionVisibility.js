import { getItemModule } from "@/components/utils/moduleContentVisibility";

function descText(action) {
  return typeof action?.description === 'string' ? action.description : '';
}

function hasPipeModule(modules) {
  return modules.some((m) => m === 'pipe' || m === 'tobacco');
}

function matchesPipekeeperAction(action) {
  const text = [action?.id, action?.key, action?.title, action?.label, descText(action)]
    .filter(Boolean).join(" ").toLowerCase();
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
  const text = [action?.id, action?.key, action?.title, action?.label, descText(action)]
    .filter(Boolean).join(" ").toLowerCase();
  return (
    text.includes("whiskey") ||
    text.includes("bottle") ||
    text.includes("pour") ||
    text.includes("tasting")
  );
}

function matchesCigarAction(action) {
  const modules = Array.isArray(action?.modules) ? action.modules : [];
  if (modules.includes("cigar")) return true;
  const text = [action?.id, action?.key, action?.title, action?.label, descText(action)]
    .filter(Boolean).join(" ").toLowerCase();
  return (
    text.includes("cigar") ||
    text.includes("humidor") ||
    text.includes("stogie")
  );
}

export function getCuratorActionModule(action) {
  // If the action declares an explicit modules array, use it first
  if (Array.isArray(action?.modules) && action.modules.length > 0) {
    const hasPipe = hasPipeModule(action.modules);
    const hasWhiskey = action.modules.includes('whiskey');
    const hasCigar = action.modules.includes('cigar');
    if (hasPipe && hasWhiskey) return null; // multi-module: always show
    if (hasWhiskey) return 'whiskeykeeper';
    if (hasPipe) return 'pipekeeper';
    if (hasCigar) return 'cigarkeeper';
  }

  const inferred = getItemModule(action);
  if (inferred) return inferred;

  if (matchesCigarAction(action)) return "cigarkeeper";
  if (matchesPipekeeperAction(action)) return "pipekeeper";
  if (matchesWhiskeyAction(action)) return "whiskeykeeper";

  return null;
}

export function shouldShowCuratorAction(action, enabledModules) {
  // Multi-module actions (both pipe and whiskey) show if either relevant module is enabled
  if (Array.isArray(action?.modules) && action.modules.length > 0) {
    const hasPipe = hasPipeModule(action.modules);
    const hasWhiskey = action.modules.includes('whiskey');
    if (hasPipe && hasWhiskey) {
      return !!(enabledModules?.pipekeeper || enabledModules?.whiskeykeeper);
    }
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

  const activeCount = [
    enabledModules?.pipekeeper,
    enabledModules?.whiskeykeeper,
    enabledModules?.cigarkeeper,
  ].filter(Boolean).length;

  // Show "All Modules" when more than one module is active, or none are active
  if (activeCount !== 1) {
    scopes.push({ key: "all", label: "All Modules" });
  }

  if (enabledModules?.pipekeeper) {
    scopes.push({ key: "pipekeeper", label: "PipeKeeper" });
  }

  if (enabledModules?.whiskeykeeper) {
    scopes.push({ key: "whiskeykeeper", label: "WhiskeyKeeper" });
  }

  if (enabledModules?.cigarkeeper) {
    scopes.push({ key: "cigarkeeper", label: "CigarKeeper" });
  }

  if (enabledModules?.winekeeper) {
    scopes.push({ key: "winekeeper", label: "WineKeeper" });
  }

  if (scopes.length === 0) {
    scopes.push({ key: "all", label: "All Modules" });
  }

  return scopes;
}
