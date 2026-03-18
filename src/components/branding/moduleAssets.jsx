export const MODULE_ASSETS = {
  collectionkeeper: {
    src: "/branding/collectionkeeper-main-logo.png?v=2",
    label: "CollectionKeeper",
  },
  collectionKeeper: {
    src: "/branding/collectionkeeper-main-logo.png?v=2",
    label: "CollectionKeeper",
  },
  pipekeeper: {
    src: "/branding/pipekeeper-logo.png?v=2",
    label: "PipeKeeper",
  },
  whiskeykeeper: {
    src: "/branding/whiskeykeeper-logo.png?v=2",
    label: "WhiskeyKeeper",
  },
  winekeeper: {
    src: "/branding/winekeeper-logo.png?v=2",
    label: "WineKeeper",
  },
  cigarkeeper: {
    src: "/branding/cigarkeeper-logo.png?v=2",
    label: "CigarKeeper",
  },
  curator: {
    src: "/branding/curator-logo.png?v=2",
    label: "Collection Curator",
  },
  pipeicon: {
    src: "/branding/pipe-icon.png?v=2",
    label: "Pipe",
  },
};

export const MODULE_ICONS = Object.fromEntries(
  Object.entries(MODULE_ASSETS).map(([key, value]) => [key, value.src])
);

export function getModuleAsset(moduleId) {
  return MODULE_ASSETS[moduleId] || MODULE_ASSETS.collectionkeeper;
}

export function getModuleIcon(moduleId) {
  return getModuleAsset(moduleId).src;
}

export function getAssetImageStyle(moduleId, size = "regular") {
  const shadow =
    size === "small"
      ? "drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
      : "drop-shadow(0 2px 6px rgba(0,0,0,0.28))";

  return {
    background: "transparent",
    backgroundColor: "transparent",
    objectFit: "contain",
    filter: shadow,
    border: "none",
    outline: "none",
    boxShadow: "none",
  };
}