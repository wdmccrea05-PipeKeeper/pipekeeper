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
  curator: {
    src: "/branding/curator-logo.png?v=2",
    label: "Curator",
  },
  cigarkeeper: {
    src: "/branding/cigarkeeper-logo.png?v=2",
    label: "CigarKeeper",
  },
  winekeeper: {
    src: "/branding/winekeeper-logo.png?v=2",
    label: "WineKeeper",
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

export function getAssetImageStyle(_moduleId, size = "regular") {
  const shadow =
    size === "small"
      ? "drop-shadow(0 1px 2px rgba(0,0,0,0.18))"
      : "drop-shadow(0 2px 6px rgba(0,0,0,0.26))";

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
