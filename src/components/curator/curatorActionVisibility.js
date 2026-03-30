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
  const inferred = getItemModule(action);
  if (inferred) return inferred;

  if (matchesPipekeeperAction(action)) return "pipekeeper";
  if (matchesWhiskeyAction(action)) return "whiskeykeeper";

  return null;
}

export function shouldShowCuratorAction(action, enabledModules) {
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
