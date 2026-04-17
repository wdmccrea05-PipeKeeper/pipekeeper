const PIPEKEEPER_KEYS = [
  "pipekeeper",
  "pipe",
  "pipes",
  "blend",
  "blends",
  "tobacco",
  "smoke",
  "smoking",
  "session",
  "sessions",
];

const WHISKEYKEEPER_KEYS = [
  "whiskeykeeper",
  "whiskey",
  "bottle",
  "bottles",
  "pour",
  "pours",
  "tasting",
  "tastings",
];

const CIGARKEEPER_KEYS = [
  "cigarkeeper",
  "cigar",
  "cigars",
  "humidor",
  "humidors",
  "smoke",
  "smoked",
];

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

export function getItemModule(item) {
  if (!item) return null;

  const explicitModule =
    normalize(item.module) ||
    normalize(item.moduleKey) ||
    normalize(item.scope) ||
    normalize(item.item_type);

  if (explicitModule.includes("pipe") || explicitModule.includes("blend") || explicitModule.includes("tobacco")) {
    return "pipekeeper";
  }

  if (explicitModule.includes("whiskey") || explicitModule.includes("bottle") || explicitModule.includes("pour") || explicitModule.includes("tasting")) {
    return "whiskeykeeper";
  }

  if (explicitModule.includes("cigar") || explicitModule.includes("humidor")) {
    return "cigarkeeper";
  }

  if (item.pipeId || item.pipe_id || item.blendId || item.blend_id || item.tobaccoId || item.tobacco_id) {
    return "pipekeeper";
  }

  if (item.bottleId || item.bottle_id || item.tastingId || item.tasting_id || item.pourId || item.pour_id) {
    return "whiskeykeeper";
  }

  if (item.cigarId || item.cigar_id || item.humidorId || item.humidor_id || item.cigarSessionId || item.cigar_session_id) {
    return "cigarkeeper";
  }

  const text = [
    item.id,
    item.key,
    item.label,
    item.title,
    item.description,
    item.slug,
    item.route,
    item.href,
    item.action,
  ]
    .map(normalize)
    .join(" ");

  if (PIPEKEEPER_KEYS.some((key) => text.includes(key))) return "pipekeeper";
  if (WHISKEYKEEPER_KEYS.some((key) => text.includes(key))) return "whiskeykeeper";
  if (CIGARKEEPER_KEYS.some((key) => text.includes(key))) return "cigarkeeper";

  return null;
}

export function shouldRenderModuleContent(item, enabledModules) {
  const moduleKey = getItemModule(item);
  if (!moduleKey) return true;
  return !!enabledModules?.[moduleKey];
}

export function filterModuleContent(items, enabledModules) {
  return (items || []).filter((item) => shouldRenderModuleContent(item, enabledModules));
}

export function filterRecentActivity(items, enabledModules) {
  return filterModuleContent(items, enabledModules);
}

export function filterHighlights(items, enabledModules) {
  return filterModuleContent(items, enabledModules);
}

export function filterQuickActions(items, enabledModules) {
  return filterModuleContent(items, enabledModules);
}

export function filterCollectionCards(items, enabledModules) {
  return filterModuleContent(items, enabledModules);
}

export function buildEnabledCuratorScopes(enabledModules) {
  const scopes = [{ key: "all", label: "All Modules" }];

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

  return scopes;
}
