const COLLECTIONKEEPER_LOGO_SRC = "/branding/collectionkeeper-main-logo.png?v=1";

export const MODULE_ASSETS = {
  collectionkeeper: {
    src: COLLECTIONKEEPER_LOGO_SRC,
    label: "CollectionKeeper",
  },

  // Backward compatibility alias
  collectionKeeper: {
    src: COLLECTIONKEEPER_LOGO_SRC,
    label: "CollectionKeeper",
  },

  pipekeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/d501c501b_pipekeeper-logo.png",
    label: "PipeKeeper",
  },

  whiskeykeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/fd90a40dc_whiskeykeeper-logo.png",
    label: "WhiskeyKeeper",
  },

  winekeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/0448c677d_winekeeper-logo.png",
    label: "WineKeeper",
  },

  cigarkeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/d6b603c7c_cigarkeeper-logo.png",
    label: "CigarKeeper",
  },

  curator: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/9427aa09c_curator-logo.png",
    label: "Collection Curator",
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